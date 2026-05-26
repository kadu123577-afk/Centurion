/**
 * CENTURION â€” ServiÃ§o Supabase
 * Arquivo: src/services/supabase.js
 * Responsabilidade: ÃšNICO arquivo que conhece URL e chave do banco.
 * Regra: nenhum outro arquivo cria um cliente Supabase.
 *        nÃ£o contÃ©m lÃ³gica de negÃ³cio. nÃ£o manipula DOM.
 */

// Supabase vem do CDN carregado no HTML via <script>
// NÃƒO usar import direto â€” o Vite nÃ£o tem o pacote instalado
import { createClient } from '@supabase/supabase-js';

const SUPA_URL = 'https://euxyecbhqxdinnczqzqz.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eHllY2JocXhkaW5uY3pxenF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDUzODksImV4cCI6MjA5NTM4MTM4OX0.0V7n-l_5pvMwnRcmLXy8dzsW9ZbkdHPYs5FCxoJWkeI';

export const sb = createClient(SUPA_URL, SUPA_KEY);

/* â”€â”€ Auth â”€â”€ */

export async function getUsuarioAtual() {
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) return null;
  const { data: usuario } = await sb
    .from('usuarios')
    .select('*, prefeituras(*)')
    .eq('id', user.id)
    .single();
  return usuario || null;
}

export async function login(email, senha) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) throw new Error(error.message);
  return data;
}

export async function logout() {
  await sb.auth.signOut();
  window.location.href = '/login.html';
}

/* â”€â”€ Prefeituras â”€â”€ */

export async function listarPrefeituras() {
  const { data, error } = await sb.from('prefeituras').select('*').order('nome');
  if (error) throw error;
  return data || [];
}

export async function getPrefeitura(id) {
  const { data, error } = await sb.from('prefeituras').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function salvarPrefeitura(id, dados) {
  const { data, error } = await sb.from('prefeituras').update(dados).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function criarPrefeitura(dados) {
  const { data, error } = await sb.from('prefeituras').insert(dados).select().single();
  if (error) throw error;
  return data;
}

/* â”€â”€ UsuÃ¡rios â”€â”€ */

export async function listarUsuariosPrefeitura(prefeituraId) {
  const { data, error } = await sb.from('usuarios').select('*').eq('prefeitura_id', prefeituraId).order('nome');
  if (error) throw error;
  return data || [];
}

export async function salvarUsuario(id, dados) {
  const { data, error } = await sb.from('usuarios').update(dados).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

/* â”€â”€ Processos â”€â”€ */

export async function listarProcessos(prefeituraId, limite = 50) {
  const { data, error } = await sb
    .from('processos')
    .select('*, documentos(tipo)')
    .eq('prefeitura_id', prefeituraId)
    .order('created_at', { ascending: false })
    .range(0, limite - 1);
  if (error) throw error;
  return data || [];
}

export async function getProcesso(id) {
  const { data, error } = await sb.from('processos').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function criarProcesso(dados) {
  const { data, error } = await sb.from('processos').insert(dados).select().single();
  if (error) throw error;
  return data;
}

export async function atualizarProcesso(id, dados) {
  const { data, error } = await sb
    .from('processos')
    .update({ ...dados, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  return data;
}

/* â”€â”€ Documentos de etapa â”€â”€ */

export async function getDocumento(processoId, tipo) {
  const { data } = await sb.from('documentos').select('*').eq('processo_id', processoId).eq('tipo', tipo).single();
  return data || null;
}

export async function salvarDocumento(processoId, tipo, dados) {
  const { data, error } = await sb
    .from('documentos')
    .upsert(
      { processo_id: processoId, tipo, dados, updated_at: new Date().toISOString() },
      { onConflict: 'processo_id,tipo' }
    )
    .select().single();
  if (error) throw error;
  return data;
}

/* â”€â”€ Snapshots â”€â”€ */

export async function criarSnapshot({ processoId, tipo, dados, hash, criadoPor }) {
  const { count } = await sb
    .from('process_snapshots')
    .select('*', { count: 'exact', head: true })
    .eq('process_id', processoId)
    .eq('tipo', tipo);
  const { data, error } = await sb.from('process_snapshots').insert({
    process_id: processoId, tipo, versao: (count || 0) + 1,
    dados, hash, created_by: criadoPor,
  }).select().single();
  if (error) { console.warn('[snapshot] falhou:', error.message); return null; }
  return data;
}

export async function listarSnapshots(processoId) {
  const { data } = await sb.from('process_snapshots').select('*').eq('process_id', processoId).order('created_at', { ascending: false });
  return data || [];
}

export async function getSnapshotPorHash(hash) {
  const { data } = await sb
    .from('process_snapshots')
    .select('*, processos(objeto, numero_protocolo, tipo_contratacao)')
    .eq('hash', hash).single();
  return data || null;
}

/* â”€â”€ Auditoria â”€â”€ */

export async function registrarAudit({ processoId, userId, userName, action, campo, valorAntigo, valorNovo }) {
  try {
    await sb.from('audit_logs').insert({
      process_id: processoId, user_id: userId, user_name: userName,
      action, field_changed: campo,
      old_value: valorAntigo != null ? String(valorAntigo) : null,
      new_value: valorNovo   != null ? String(valorNovo)   : null,
    });
  } catch(e) { console.warn('[audit] falhou:', e.message); }
}

export async function listarAudit(processoId) {
  const { data } = await sb.from('audit_logs').select('*').eq('process_id', processoId).order('created_at', { ascending: false }).limit(100);
  return data || [];
}
