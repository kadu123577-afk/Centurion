/**
 * CENTURION — Estado Global
 * Arquivo: src/services/state.js
 * Responsabilidade: APENAS guardar e distribuir o estado do app.
 * Regra: é o ÚNICO lugar onde o estado global vive.
 *        não manipula DOM.
 *        não faz chamadas de rede.
 *        qualquer módulo pode ler o estado.
 *        qualquer módulo usa setState() para escrever.
 */

/* ══════════════════════════════════════════════════════════════
   ESTADO INICIAL
   Cada chave representa um domínio isolado.
══════════════════════════════════════════════════════════════ */

export const state = {
  /** Usuário autenticado */
  usuario: null,
  // { id, nome, email, perfil, setor, role, prefeitura_id }

  /** Prefeitura do usuário */
  prefeitura: null,
  // { id, nome, municipio, uf, cnpj, endereco, brasao_base64, prefeito, ... }

  /** Lista de processos carregada na tela principal */
  processos: [],

  /** Processo atualmente aberto */
  processoAtual: null,
  // { id, numero_protocolo, objeto, tipo_contratacao, etapa_atual, status, ... }

  /** Documentos do processo atual (cache local) */
  documentos: {},
  // { DFD: { dados: {...} }, ETP: { dados: {...} }, ... }

  /** Se há alterações não salvas na etapa atual */
  naoSalvo: false,
};

/* ══════════════════════════════════════════════════════════════
   SISTEMA DE LISTENERS
   Permite que qualquer módulo "escute" mudanças de estado.
   Uso:
     onChange('processoAtual', (proc) => renderSidebar(proc))
══════════════════════════════════════════════════════════════ */

const _listeners = {};

/**
 * Registra uma função para ser chamada quando uma chave mudar.
 * Retorna função para cancelar o listener (unsubscribe).
 */
export function onChange(chave, fn) {
  if (!_listeners[chave]) _listeners[chave] = [];
  _listeners[chave].push(fn);

  // Retorna unsubscribe
  return () => {
    _listeners[chave] = _listeners[chave].filter(f => f !== fn);
  };
}

/**
 * Atualiza uma chave do estado e notifica os listeners.
 * Uso: setState('processoAtual', processo)
 */
export function setState(chave, valor) {
  state[chave] = valor;
  (_listeners[chave] || []).forEach(fn => {
    try { fn(valor); }
    catch(e) { console.error(`[state] listener de "${chave}" falhou:`, e); }
  });
}

/**
 * Atualiza parcialmente uma chave que é um objeto.
 * Uso: patchState('processoAtual', { etapa_atual: 3 })
 */
export function patchState(chave, parcial) {
  if (typeof state[chave] !== 'object' || state[chave] === null) {
    setState(chave, parcial);
    return;
  }
  setState(chave, { ...state[chave], ...parcial });
}

/**
 * Reseta o estado para os valores iniciais.
 * Chamado no logout.
 */
export function resetState() {
  setState('usuario',       null);
  setState('prefeitura',    null);
  setState('processos',     []);
  setState('processoAtual', null);
  setState('documentos',    {});
  setState('naoSalvo',      false);
}
