// ============================================================
//  centurion-db.js  –  Camada de persistência do Centurion
//
//  Substitui o localStorage. O Centurion.html chama apenas
//  estas 4 funções públicas — o resto é detalhe de implementação.
//
//  carregarDados()   → retorna os dados do processo em andamento
//  salvarDados(obj)  → salva/atualiza o processo no Supabase
//  carregarConfig()  → retorna config da prefeitura
//  salvarConfig(obj) → salva config (só Admin 2)
// ============================================================

import { sb, sessao } from './auth.js';

// ── Cache local para não chamar o banco a cada keystroke ─────
let _cacheProcesso = null;
let _cacheConfig   = null;
let _saveTimer     = null;
const DEBOUNCE_MS  = 1200;   // aguarda 1.2s sem digitar antes de salvar


// ============================================================
//  PROCESSO  (isolado por usuário)
// ============================================================

/**
 * Carrega os dados do processo do usuário logado.
 * Na primeira vez retorna objeto vazio {}.
 * @returns {Promise<object>}
 */
export async function carregarDados() {
  if (_cacheProcesso !== null) return _cacheProcesso;

  const userId = sessao.authUser?.id;
  if (!userId) return {};

  const { data, error } = await sb
    .from('processos')
    .select('dados')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[DB] Erro ao carregar processo:', error.message);
    return {};
  }

  _cacheProcesso = data?.dados ?? {};
  return _cacheProcesso;
}

/**
 * Salva os dados do processo com debounce —
 * chama à vontade, o banco só é escrito após 1.2s de silêncio.
 * @param {object} dados
 */
export function salvarDados(dados) {
  // Merge no cache local imediatamente (a UI responde na hora)
  _cacheProcesso = { ..._cacheProcesso, ...dados };

  // Debounce: cancela o timer anterior e reagenda
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => _persistirProcesso(_cacheProcesso), DEBOUNCE_MS);
}

/**
 * Força o flush imediato (chame antes de fechar a aba, etc.)
 */
export async function flushDados() {
  clearTimeout(_saveTimer);
  if (_cacheProcesso !== null) {
    await _persistirProcesso(_cacheProcesso);
  }
}

async function _persistirProcesso(dados) {
  const userId = sessao.authUser?.id;
  if (!userId) return;

  const { error } = await sb
    .from('processos')
    .upsert(
      { user_id: userId, dados },
      { onConflict: 'user_id' }
    );

  if (error) console.error('[DB] Erro ao salvar processo:', error.message);
}


// ============================================================
//  CONFIGURAÇÕES DA PREFEITURA  (compartilhadas, admin escreve)
// ============================================================

/**
 * Carrega as configurações da prefeitura do usuário logado.
 * @returns {Promise<object>}  { municipio, nome_prefeitura, cnpj, endereco }
 */
export async function carregarConfig() {
  if (_cacheConfig !== null) return _cacheConfig;

  const prefId = sessao.usuario?.prefeitura_id;
  if (!prefId) return {};

  const { data, error } = await sb
    .from('configuracoes_prefeitura')
    .select('municipio, nome_prefeitura, cnpj, endereco')
    .eq('prefeitura_id', prefId)
    .maybeSingle();

  if (error) {
    console.error('[DB] Erro ao carregar config:', error.message);
    return {};
  }

  _cacheConfig = data ?? {};
  return _cacheConfig;
}

/**
 * Salva as configurações da prefeitura.
 * Só funciona se o usuário logado for Admin 2.
 * @param {{ municipio, nome_prefeitura, cnpj, endereco }} dados
 */
export async function salvarConfig(dados) {
  const prefId = sessao.usuario?.prefeitura_id;
  const role   = sessao.usuario?.role;

  if (!prefId)           throw new Error('Nenhuma prefeitura associada.');
  if (role !== 'admin')  throw new Error('Apenas o Admin da prefeitura pode editar as configurações.');

  const payload = {
    prefeitura_id   : prefId,
    municipio       : dados.municipio       ?? '',
    nome_prefeitura : dados.nome_prefeitura ?? '',
    cnpj            : dados.cnpj            ?? '',
    endereco        : dados.endereco        ?? '',
  };

  const { error } = await sb
    .from('configuracoes_prefeitura')
    .upsert(payload, { onConflict: 'prefeitura_id' });

  if (error) throw new Error('Erro ao salvar configurações: ' + error.message);

  // Atualiza cache local
  _cacheConfig = { ...(_cacheConfig ?? {}), ...payload };
}


// ============================================================
//  UTILITÁRIOS
// ============================================================

/**
 * Limpa o cache local (chamar no logout).
 */
export function limparCache() {
  _cacheProcesso = null;
  _cacheConfig   = null;
  clearTimeout(_saveTimer);
}

/**
 * Retorna true se o usuário logado pode editar as configurações.
 */
export function podeEditarConfig() {
  return sessao.usuario?.role === 'admin';
}
