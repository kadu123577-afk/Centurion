-- ============================================================
--  CENTURION — Setup Supabase
--  Cole este arquivo inteiro no SQL Editor do Supabase
--  e clique em RUN.
-- ============================================================


-- ── 1. Tabelas base do auth.js (se ainda não existirem) ──────

CREATE TABLE IF NOT EXISTS prefeituras (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      text NOT NULL,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id            uuid PRIMARY KEY,  -- mesmo id do Supabase Auth
  email         text NOT NULL,
  nome          text NOT NULL,
  prefeitura_id uuid REFERENCES prefeituras(id),
  role          text NOT NULL CHECK (role IN ('super_admin','admin','usuario')),
  ativo         boolean NOT NULL DEFAULT true,
  criado_em     timestamptz DEFAULT now()
);


-- ── 2. Configurações da prefeitura ───────────────────────────
--  Uma linha por prefeitura. Só o Admin 2 escreve.
--  Todos os usuários da prefeitura leem.

CREATE TABLE IF NOT EXISTS configuracoes_prefeitura (
  prefeitura_id   uuid PRIMARY KEY REFERENCES prefeituras(id) ON DELETE CASCADE,
  municipio       text NOT NULL DEFAULT '',
  nome_prefeitura text NOT NULL DEFAULT '',
  cnpj            text NOT NULL DEFAULT '',
  endereco        text NOT NULL DEFAULT '',
  atualizado_em   timestamptz DEFAULT now()
);


-- ── 3. Processos por usuário ──────────────────────────────────
--  Uma linha por usuário. Isolado — cada um vê só o seu.
--  Guarda o JSON inteiro do processo em andamento.

CREATE TABLE IF NOT EXISTS processos (
  user_id       uuid PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  dados         jsonb NOT NULL DEFAULT '{}',
  atualizado_em timestamptz DEFAULT now()
);


-- ── 4. RLS (Row Level Security) ───────────────────────────────
--  Garante isolamento no banco — ninguém acessa dados de outro.

ALTER TABLE configuracoes_prefeitura ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE prefeituras              ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios                 ENABLE ROW LEVEL SECURITY;

-- Usuários só veem a própria linha
CREATE POLICY "usuario_ve_proprio_perfil"
  ON usuarios FOR SELECT
  USING (id = auth.uid());

-- Super admin vê tudo
CREATE POLICY "super_admin_ve_todos_usuarios"
  ON usuarios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );

-- Admin vê e edita usuários da própria prefeitura
CREATE POLICY "admin_ve_prefeitura"
  ON usuarios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND u.prefeitura_id = usuarios.prefeitura_id
    )
  );

-- Configuração: todos da prefeitura leem
CREATE POLICY "prefeitura_le_config"
  ON configuracoes_prefeitura FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
        AND u.prefeitura_id = configuracoes_prefeitura.prefeitura_id
    )
  );

-- Configuração: só admin escreve
CREATE POLICY "admin_escreve_config"
  ON configuracoes_prefeitura FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND u.prefeitura_id = configuracoes_prefeitura.prefeitura_id
    )
  );

-- Processo: cada usuário só vê e edita o próprio
CREATE POLICY "usuario_ve_proprio_processo"
  ON processos FOR ALL
  USING (user_id = auth.uid());

-- Super admin vê tudo nas prefeituras
CREATE POLICY "super_admin_prefeituras"
  ON prefeituras FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );

-- Admin e usuários comuns só veem a própria prefeitura
CREATE POLICY "usuario_ve_propria_prefeitura"
  ON prefeituras FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
        AND u.prefeitura_id = prefeituras.id
    )
  );


-- ── 5. Função para atualizar timestamp automaticamente ────────

CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_config_timestamp
  BEFORE UPDATE ON configuracoes_prefeitura
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trg_processo_timestamp
  BEFORE UPDATE ON processos
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();


-- ============================================================
--  PRONTO.
--  Próximo passo: crie o Super Admin manualmente no Supabase
--  Authentication → Users → Invite user
--  Depois cole o uuid gerado e rode:
--
--  INSERT INTO usuarios (id, email, nome, role, ativo)
--  VALUES (
--    'UUID_DO_SUPER_ADMIN_AQUI',
--    'seu@email.com',
--    'Seu Nome',
--    'super_admin',
--    true
--  );
-- ============================================================
