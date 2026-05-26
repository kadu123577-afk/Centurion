/**
 * CENTURION — Serviço de Autenticação
 * Arquivo: src/services/auth.js
 */

import { sb } from './supabase.js';
import { setState, resetState } from './state.js';

export async function iniciarSessao() {
  try {
    const { data: { user }, error } = await sb.auth.getUser();
    if (error || !user) {
      window.location.href = '/login.html';
      return null;
    }

    const { data: usuario, error: dbError } = await sb
      .from('usuarios')
      .select('*, prefeituras(*)')
      .eq('id', user.id)
      .single();

    if (dbError || !usuario) {
      // Se não achar na tabela, usa dados básicos do auth
      const fallback = { id: user.id, nome: user.email, email: user.email, perfil: 'requisitante', role: 'user', ativo: true, prefeituras: null };
      setState('usuario', fallback);
      return fallback;
    }

    if (!usuario.ativo) {
      await sb.auth.signOut();
      window.location.href = '/login.html?erro=inativo';
      return null;
    }

    setState('usuario', usuario);
    setState('prefeitura', usuario.prefeituras || null);
    return usuario;

  } catch(e) {
    console.error('[auth] erro:', e);
    // Não redireciona em caso de erro de rede — evita loop
    return null;
  }
}

export async function logout() {
  resetState();
  await sb.auth.signOut();
  window.location.href = '/login.html';
}

import { state } from './state.js';

export function isSuperAdmin() { return state.usuario?.role === 'super_admin'; }
export function isAdmin() { return ['admin', 'super_admin'].includes(state.usuario?.role); }
export function temPerfil(perfil) { return state.usuario?.perfil === perfil; }

export function podeTrabalharNaEtapa(etapaId) {
  if (isAdmin()) return true;
  const responsaveis = {
    DFD:'requisitante', Protocolo:'protocolo', ETP:'requisitante',
    PP:'compras', Dotacao:'contabilidade', Autorizacao:'secretaria',
    Minuta:'licitacao', Parecer:'juridico', Edital:'licitacao', Publicacao:'licitacao',
  };
  return state.usuario?.perfil === responsaveis[etapaId];
}
