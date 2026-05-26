/**
 * CENTURION — API de Usuários
 * Arquivo: api/usuario.js
 * Roda no servidor (Vercel). A service_role key NUNCA vai ao frontend.
 * 
 * Ações disponíveis:
 *   criar      → cria usuário no Auth + insere na tabela usuarios
 *   editar     → atualiza nome, email, perfil, senha
 *   desativar  → ativa ou desativa o acesso
 *   listar     → lista usuários de uma prefeitura
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://euxyecbhqxdinnczqzqz.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY  // ← nunca exposta, só no servidor
);

export default async function handler(req, res) {
  // CORS — permite chamadas do frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { action, ...data } = req.body || {};

  try {
    switch (action) {
      case 'criar':     return await criar(res, data);
      case 'editar':    return await editar(res, data);
      case 'desativar': return await desativar(res, data);
      case 'listar':    return await listar(res, data);
      default:          return res.status(400).json({ error: 'Ação inválida' });
    }
  } catch (e) {
    console.error('[api/usuario]', e);
    return res.status(500).json({ error: e.message });
  }
}

/* ── CRIAR ───────────────────────────────────────────────────── */
async function criar(res, { nome, email, senha, perfil, prefeitura_id }) {
  if (!nome || !email || !senha || !perfil || !prefeitura_id)
    return res.status(400).json({ error: 'Campos obrigatórios: nome, email, senha, perfil, prefeitura_id' });

  // 1. Cria no Auth
  const { data: auth, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (authErr) return res.status(400).json({ error: authErr.message });

  // 2. Insere na tabela usuarios
  const { error: dbErr } = await supabase.from('usuarios').insert({
    id:           auth.user.id,
    nome,
    email,
    perfil,
    role:         'user',
    prefeitura_id,
    ativo:        true,
  });

  // Rollback se falhou o banco
  if (dbErr) {
    await supabase.auth.admin.deleteUser(auth.user.id);
    return res.status(400).json({ error: dbErr.message });
  }

  return res.status(200).json({ success: true, id: auth.user.id });
}

/* ── EDITAR ──────────────────────────────────────────────────── */
async function editar(res, { id, nome, email, perfil, senha }) {
  if (!id) return res.status(400).json({ error: 'id obrigatório' });

  // Atualiza tabela
  const update = {};
  if (nome)   update.nome   = nome;
  if (email)  update.email  = email;
  if (perfil) update.perfil = perfil;

  if (Object.keys(update).length) {
    const { error } = await supabase.from('usuarios').update(update).eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
  }

  // Atualiza senha se fornecida
  if (senha) {
    const { error } = await supabase.auth.admin.updateUserById(id, { password: senha });
    if (error) return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
}

/* ── DESATIVAR / ATIVAR ──────────────────────────────────────── */
async function desativar(res, { id, ativo }) {
  if (!id) return res.status(400).json({ error: 'id obrigatório' });

  const { error } = await supabase.from('usuarios').update({ ativo: Boolean(ativo) }).eq('id', id);
  if (error) return res.status(400).json({ error: error.message });

  return res.status(200).json({ success: true });
}

/* ── LISTAR ──────────────────────────────────────────────────── */
async function listar(res, { prefeitura_id }) {
  if (!prefeitura_id) return res.status(400).json({ error: 'prefeitura_id obrigatório' });

  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, perfil, role, ativo, created_at')
    .eq('prefeitura_id', prefeitura_id)
    .order('nome');

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ usuarios: data });
}
