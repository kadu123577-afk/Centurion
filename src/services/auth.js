/**
 * CENTURION — Serviço de Autenticação
 * Arquivo: src/services/auth.js
 * Responsabilidade: APENAS lógica de login, sessão e permissões.
 * Regra: não manipula DOM diretamente (usa toast/loader via ui.js).
 *        não conhece as telas — só sabe redirecionar.
 *        é o único lugar que decide "quem pode fazer o quê".
 */

import { sb, getUsuarioAtual, logout as sbLogout } from './supabase.js';
import { setState, resetState } from './state.js';
import { toast, loader } from '../utils/ui.js';

/* ══════════════════════════════════════════════════════════════
   INICIALIZAÇÃO
   Chamado no carregamento de qualquer página protegida.
   Verifica sessão e carrega dados do usuário.
══════════════════════════════════════════════════════════════ */

/**
 * Inicializa a sessão. Se não houver usuário logado, redireciona para login.
 * Retorna o usuário se estiver autenticado.
 */
export async function iniciarSessao() {
  loader(true, 'Verificando acesso...');
  try {
    const usuario = await getUsuarioAtual();

    if (!usuario) {
      window.location.href = '/login.html';
      return null;
    }

    if (!usuario.ativo) {
      await sbLogout();
      window.location.href = '/login.html?erro=inativo';
      return null;
    }

    // Popula estado global
    setState('usuario',    usuario);
    setState('prefeitura', usuario.prefeituras || null);

    return usuario;
  } catch(e) {
    console.error('[auth] falhou ao iniciar sessão:', e);
    window.location.href = '/login.html?erro=sessao';
    return null;
  } finally {
    loader(false);
  }
}

/**
 * Faz logout completo: limpa estado, Supabase Auth e redireciona.
 */
export async function logout() {
  loader(true, 'Saindo...');
  resetState();
  await sbLogout();
  // sbLogout já redireciona para /login.html
}

/* ══════════════════════════════════════════════════════════════
   CONTROLE DE ACESSO (PERMISSÕES)
   Centraliza TODAS as regras de "quem pode fazer o quê".
   Regra: nunca espalhar verificações de role pelo código.
          sempre usar estas funções.
══════════════════════════════════════════════════════════════ */

import { state } from './state.js';

/** Retorna true se o usuário atual é super administrador (operador da plataforma) */
export function isSuperAdmin() {
  return state.usuario?.role === 'super_admin';
}

/** Retorna true se o usuário atual é administrador da prefeitura */
export function isAdmin() {
  return ['admin', 'super_admin'].includes(state.usuario?.role);
}

/** Retorna true se o usuário tem o perfil especificado */
export function temPerfil(perfil) {
  return state.usuario?.perfil === perfil;
}

/**
 * Retorna true se o usuário pode trabalhar na etapa indicada.
 * Mapeamento: etapa (string) → perfil responsável.
 */
export function podeTrabalharNaEtapa(etapaId) {
  if (isAdmin()) return true; // admin vê tudo

  const responsaveis = {
    DFD:         'requisitante',
    Protocolo:   'protocolo',
    ETP:         'requisitante',
    PP:          'compras',
    Dotacao:     'contabilidade',
    Autorizacao: 'secretaria',
    Minuta:      'licitacao',
    Parecer:     'juridico',
    Edital:      'licitacao',
    Publicacao:  'licitacao',
  };

  return state.usuario?.perfil === responsaveis[etapaId];
}

/**
 * Verifica acesso e redireciona para a tela correta conforme o role.
 * Chamado após o login ou ao acessar uma página protegida.
 */
export function redirecionarConfomeRole(usuario) {
  if (!usuario) {
    window.location.href = '/login.html';
    return;
  }

  switch(usuario.role) {
    case 'super_admin':
      window.location.href = '/superadmin.html';
      break;
    case 'admin':
      window.location.href = '/admin.html';
      break;
    default:
      window.location.href = '/app.html';
  }
}

/* ══════════════════════════════════════════════════════════════
   VALIDAÇÃO DE ACESSO À PREFEITURA
   Verifica se o usuário tem acesso ativo (plano vigente, ativo).
══════════════════════════════════════════════════════════════ */

export function validarAcessoPrefeitura(usuario) {
  if (!usuario) return { ok: false, motivo: 'Usuário não encontrado.' };
  if (!usuario.ativo) return { ok: false, motivo: 'Usuário inativo.' };

  const pref = usuario.prefeituras;
  if (!pref) return { ok: false, motivo: 'Prefeitura não configurada.' };
  if (!pref.ativo) return { ok: false, motivo: 'Acesso bloqueado. Entre em contato com o suporte.' };
  if (pref.plano === 'bloqueado') return { ok: false, motivo: 'Acesso suspenso por inadimplência.' };

  if (pref.validade) {
    const vencimento = new Date(pref.validade);
    if (vencimento < new Date()) {
      return { ok: false, motivo: 'Período de acesso encerrado. Renove seu plano.' };
    }
  }

  return { ok: true };
}
