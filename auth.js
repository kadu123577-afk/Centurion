// ============================================================
//  auth.js  –  Sistema de acesso em 3 níveis
//
//  NÍVEL 1 – Super Admin (você)
//    · Cria, edita, ativa e desativa prefeituras
//    · Cria, edita e desativa o Admin 2 de cada prefeitura
//
//  NÍVEL 2 – Admin da Prefeitura (Admin 2)
//    · Cria, edita, ativa e desativa usuários da sua prefeitura
//    · Acessa a plataforma igual ao usuário comum
//
//  NÍVEL 3 – Usuário comum
//    · Acessa a plataforma normalmente
//
//  Dependência: @supabase/supabase-js v2
//
//  Schema mínimo esperado no Supabase:
//
//  tabela: prefeituras
//    id         uuid  PK default gen_random_uuid()
//    nome       text  NOT NULL
//    ativo      bool  NOT NULL default true
//    criado_em  timestamptz default now()
//
//  tabela: usuarios
//    id            uuid  PK (mesmo id do Supabase Auth)
//    email         text  NOT NULL
//    nome          text  NOT NULL
//    prefeitura_id uuid  FK → prefeituras.id  (null para super_admin)
//    role          text  NOT NULL  ('super_admin' | 'admin' | 'usuario')
//    ativo         bool  NOT NULL default true
//    criado_em     timestamptz default now()
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ── Conexão Supabase ──────────────────────────────────────────
const SUPA_URL = 'https://nzaitjwauwjlgrhycxun.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56YWl0andhdXdqbGdyaHljeHVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MjgyMzAsImV4cCI6MjA5NTUwNDIzMH0.HVNU_k-siMkzdCxBv0O0_PmlyY0A2_EKNzsfkfglOhk';
export const sb = createClient(SUPA_URL, SUPA_KEY);

// ── Estado da sessão ──────────────────────────────────────────
export let sessao = {
  authUser : null,   // objeto retornado pelo Supabase Auth
  usuario  : null,   // linha da tabela `usuarios`
  prefeitura: null,  // linha da tabela `prefeituras` (null para super_admin)
};

function limparSessao() {
  sessao.authUser  = null;
  sessao.usuario   = null;
  sessao.prefeitura = null;
}

export function getRole() {
  return sessao.usuario?.role ?? null;
}

export function isSuperAdmin() { return getRole() === 'super_admin'; }
export function isAdmin()      { return getRole() === 'admin'; }
export function isUsuario()    { return getRole() === 'usuario'; }


// ============================================================
//  AUTH  –  Login / Logout
// ============================================================

/**
 * Faz o login e chama o callback correto conforme o nível do usuário.
 *
 * @param {string} email
 * @param {string} senha
 * @throws {Error} mensagem amigável para exibir ao usuário
 */
export async function login(email, senha) {
  if (!email || !senha) throw new Error('Preencha e-mail e senha.');

  // 1. Autenticar no Supabase Auth
  const { data: authData, error: authErr } =
    await sb.auth.signInWithPassword({ email, password: senha });

  if (authErr) throw new Error('E-mail ou senha incorretos.');

  // 2. Buscar perfil na tabela de usuários
  const { data: usuario, error: dbErr } = await sb
    .from('usuarios')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (dbErr || !usuario) throw new Error('Usuário não encontrado no sistema.');
  if (!usuario.ativo)    throw new Error('Usuário inativo. Contate o administrador.');

  // 3. Verificar se a prefeitura está ativa (não se aplica ao super admin)
  if (usuario.role !== 'super_admin' && usuario.prefeitura_id) {
    const { data: pref } = await sb
      .from('prefeituras')
      .select('*')
      .eq('id', usuario.prefeitura_id)
      .single();

    if (!pref || !pref.ativo) throw new Error('Prefeitura bloqueada. Contate o administrador.');
    sessao.prefeitura = pref;
  }

  sessao.authUser = authData.user;
  sessao.usuario  = usuario;

  // 4. Rotear por nível
  if (isSuperAdmin()) onSuperAdminLogado(sessao);
  else                onAppLogado(sessao);  // Admin 2 e usuário comum entram no mesmo app
}

/**
 * Encerra a sessão.
 */
export async function logout() {
  await sb.auth.signOut();
  limparSessao();
  onLogout();
}


// ── Callbacks – implemente estes no seu programa ─────────────

/**
 * Chamado quando o Super Admin loga.
 * Redirecione para o painel de gestão de prefeituras.
 */
export function onSuperAdminLogado(sessao) {
  console.log('[AUTH] Super Admin logado:', sessao.usuario.email);
  window.location.href = 'super-admin.html';
}

/**
 * Chamado quando Admin 2 ou Usuário comum loga.
 * Ambos acessam o mesmo app — a diferença é só o role guardado em sessao.usuario.role.
 * Se precisar mostrar o botão "Gerenciar Usuários" só para admin, cheque isAdmin().
 */
export function onAppLogado(sessao) {
  console.log('[AUTH] Usuário logado:', sessao.usuario.nome, '| role:', sessao.usuario.role);
  if (sessao.usuario.role === 'admin') {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'Centurion.html';
  }
}

/**
 * Chamado após o logout.
 */
export function onLogout() {
  console.log('[AUTH] Sessão encerrada.');
  // ex: window.location.href = '/login';
}


// ============================================================
//  NÍVEL 1 – Super Admin
//  Gestão de prefeituras e do Admin 2 de cada uma
// ============================================================

// ── Prefeituras ───────────────────────────────────────────────

/**
 * Lista todas as prefeituras.
 * @returns {Promise<Array>}
 */
export async function listarPrefeituras() {
  const { data, error } = await sb
    .from('prefeituras')
    .select('*')
    .order('nome');

  if (error) throw error;
  return data ?? [];
}

/**
 * Cria uma prefeitura nova.
 * @param {{ nome: string }} dados
 * @returns {Promise<object>} prefeitura criada
 */
export async function criarPrefeitura({ nome }) {
  if (!nome?.trim()) throw new Error('Nome da prefeitura é obrigatório.');

  const { data, error } = await sb
    .from('prefeituras')
    .insert({ nome: nome.trim(), ativo: true })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Edita o nome de uma prefeitura.
 * @param {string} id
 * @param {{ nome: string }} dados
 */
export async function editarPrefeitura(id, { nome }) {
  if (!nome?.trim()) throw new Error('Nome é obrigatório.');

  const { error } = await sb
    .from('prefeituras')
    .update({ nome: nome.trim() })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Ativa ou desativa uma prefeitura.
 * Quando desativada, nenhum usuário dela consegue mais logar.
 * @param {string} id
 * @param {boolean} ativo
 */
export async function togglePrefeitura(id, ativo) {
  const { error } = await sb
    .from('prefeituras')
    .update({ ativo })
    .eq('id', id);

  if (error) throw error;
}

// ── Admin 2 (por prefeitura) ──────────────────────────────────

/**
 * Busca o Admin 2 atual de uma prefeitura (se existir).
 * @param {string} prefeituraId
 * @returns {Promise<object|null>}
 */
export async function getAdmin2DaPrefeitura(prefeituraId) {
  const { data } = await sb
    .from('usuarios')
    .select('id, nome, email, ativo')
    .eq('prefeitura_id', prefeituraId)
    .eq('role', 'admin')
    .limit(1)
    .single();

  return data ?? null;
}

/**
 * Cria o Admin 2 de uma prefeitura.
 * Preserva a sessão do Super Admin durante o signUp.
 *
 * @param {string} prefeituraId
 * @param {{ nome: string, email: string, senha: string }} dados
 * @returns {Promise<object>} usuário criado
 */
export async function criarAdmin2(prefeituraId, { nome, email, senha }) {
  _validarCamposUsuario(nome, email, senha, 8);

  // Salvar sessão do super admin
  const sessaoSA = await _getSessaoAtual();

  // Criar conta no Auth
  const { data: authData, error: authErr } = await sb.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } },
  });
  if (authErr) throw new Error('Erro ao criar conta: ' + authErr.message);
  if (!authData?.user) throw new Error('Conta não criada. O e-mail já pode estar em uso.');

  // Restaurar sessão do super admin
  await _restaurarSessao(sessaoSA);

  // Inserir na tabela com role = 'admin'
  const { data: usuario, error: dbErr } = await sb
    .from('usuarios')
    .insert({
      id           : authData.user.id,
      email,
      nome,
      prefeitura_id: prefeituraId,
      role         : 'admin',
      ativo        : true,
    })
    .select()
    .single();

  if (dbErr) throw new Error('Conta criada no Auth, mas erro ao salvar perfil: ' + dbErr.message);
  return usuario;
}

/**
 * Edita nome e/ou ativa/desativa o Admin 2.
 * @param {string} id  – id do usuário
 * @param {{ nome?: string, ativo?: boolean }} dados
 */
export async function editarAdmin2(id, { nome, ativo }) {
  const payload = {};
  if (nome  !== undefined) payload.nome  = nome.trim();
  if (ativo !== undefined) payload.ativo = ativo;

  const { error } = await sb.from('usuarios').update(payload).eq('id', id);
  if (error) throw error;
}


// ============================================================
//  NÍVEL 2 – Admin da Prefeitura (Admin 2)
//  Gestão de usuários comuns da sua prefeitura
// ============================================================

/**
 * Lista todos os usuários comuns da prefeitura do Admin 2 logado.
 * @returns {Promise<Array>}
 */
export async function listarUsuarios() {
  const prefId = sessao.usuario?.prefeitura_id;
  if (!prefId) throw new Error('Nenhuma prefeitura associada ao perfil.');

  const { data, error } = await sb
    .from('usuarios')
    .select('id, nome, email, ativo, role')
    .eq('prefeitura_id', prefId)
    .eq('role', 'usuario')
    .order('nome');

  if (error) throw error;
  return data ?? [];
}

/**
 * Cria um novo usuário comum na prefeitura.
 * Preserva a sessão do Admin 2 durante o signUp.
 *
 * @param {{ nome: string, email: string, senha: string }} dados
 * @returns {Promise<object>} usuário criado
 */
const LIMITE_USUARIOS_PREFEITURA = 5;

export async function criarUsuario({ nome, email, senha }) {
  _validarCamposUsuario(nome, email, senha, 6);

  const prefId = sessao.usuario?.prefeitura_id;
  if (!prefId) throw new Error('Nenhuma prefeitura associada ao perfil.');

  // Verificar limite de usuários ativos
  const { count } = await sb
    .from('usuarios')
    .select('id', { count: 'exact', head: true })
    .eq('prefeitura_id', prefId)
    .eq('role', 'usuario')
    .eq('ativo', true);

  if (count >= LIMITE_USUARIOS_PREFEITURA) {
    throw new Error(`Limite de ${LIMITE_USUARIOS_PREFEITURA} usuários atingido. Desative um usuário para criar outro.`);
  }

  // Salvar sessão do admin 2
  const sessaoAdmin = await _getSessaoAtual();

  // Criar conta no Auth
  const { data: authData, error: authErr } = await sb.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } },
  });
  if (authErr) throw new Error('Erro ao criar conta: ' + authErr.message);
  if (!authData?.user) throw new Error('Conta não criada. O e-mail já pode estar em uso.');

  // Restaurar sessão do admin 2
  await _restaurarSessao(sessaoAdmin);

  // Inserir na tabela com role = 'usuario'
  const { data: usuario, error: dbErr } = await sb
    .from('usuarios')
    .insert({
      id           : authData.user.id,
      email,
      nome,
      prefeitura_id: prefId,
      role         : 'usuario',
      ativo        : true,
    })
    .select()
    .single();

  if (dbErr) throw new Error('Conta criada no Auth, mas erro ao salvar perfil: ' + dbErr.message);
  return usuario;
}

/**
 * Edita nome e/ou ativa/desativa um usuário.
 * @param {string} id
 * @param {{ nome?: string, ativo?: boolean }} dados
 */
export async function editarUsuario(id, { nome, ativo }) {
  const payload = {};
  if (nome  !== undefined) payload.nome  = nome.trim();
  if (ativo !== undefined) payload.ativo = ativo;

  const { error } = await sb.from('usuarios').update(payload).eq('id', id);
  if (error) throw error;
}

/**
 * Ativa ou desativa um usuário pelo id.
 * @param {string} id
 * @param {boolean} ativo
 */
export async function toggleUsuario(id, ativo) {
  return editarUsuario(id, { ativo });
}

/**
 * Remove um usuário da tabela (não remove do Auth).
 * @param {string} id
 */
export async function excluirUsuario(id) {
  const { error } = await sb.from('usuarios').delete().eq('id', id);
  if (error) throw error;
}


// ============================================================
//  UTILITÁRIOS INTERNOS
// ============================================================

function _validarCamposUsuario(nome, email, senha, senhaMin = 6) {
  if (!nome?.trim())  throw new Error('Nome é obrigatório.');
  if (!email?.trim()) throw new Error('E-mail é obrigatório.');
  if (!senha)         throw new Error('Senha é obrigatória.');
  if (senha.length < senhaMin) throw new Error(`A senha deve ter ao menos ${senhaMin} caracteres.`);
}

async function _getSessaoAtual() {
  const { data: { session } } = await sb.auth.getSession();
  return session;
}

async function _restaurarSessao(session) {
  if (session) {
    await sb.auth.setSession({
      access_token : session.access_token,
      refresh_token: session.refresh_token,
    });
  }
}
