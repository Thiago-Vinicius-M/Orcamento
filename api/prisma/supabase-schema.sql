-- Esquema inicial do Postgres/Supabase para o app de Orçamentos.
-- Suposições:
-- - Tabelas e colunas usam snake_case e nomes em minúsculas.
-- - Tipos numéricos monetários usam numeric(12,2).
-- - Este script deve ser executado em um banco vazio ou em um schema onde
--   essas tabelas ainda não existem.

create table public.empresas (
  id           integer generated always as identity primary key,
  nome         text    not null,
  cnpj         text    not null unique,
  email        text    not null default '',
  telefone     text    not null default '',
  endereco     text    not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.usuarios (
  id                          integer generated always as identity primary key,
  email                       text    not null unique,
  nome                        text    not null default '',
  empresa_id                  integer not null,
  password_hash               text,
  email_confirmation_token    text,
  email_confirmation_expires_at timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  constraint usuarios_empresa_fk
    foreign key (empresa_id) references public.empresas (id)
);

create index usuarios_empresa_idx on public.usuarios (empresa_id);

create table public.lojas (
  id         integer generated always as identity primary key,
  nome       text    not null,
  cnpj       text    not null,
  endereco   text    not null default '',
  telefone   text    not null default '',
  email      text    not null default '',
  logo       text    not null default '',
  updated_at timestamptz not null default now(),

  empresa_id integer unique,

  constraint lojas_empresa_fk
    foreign key (empresa_id) references public.empresas (id)
);

create table public.clientes (
  id           integer generated always as identity primary key,
  nome         text    not null,
  cpf_cnpj     text    not null,
  telefone     text    not null,
  email        text    not null default '',
  logradouro   text    not null default '',
  numero       text    not null default '',
  complemento  text    not null default '',
  bairro       text    not null default '',
  cidade       text    not null default '',
  estado       text    not null default '',
  cep          text    not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  empresa_id   integer,

  constraint clientes_empresa_fk
    foreign key (empresa_id) references public.empresas (id)
);

create index clientes_empresa_idx on public.clientes (empresa_id);

create table public.produtos (
  id             integer generated always as identity primary key,
  nome           text    not null,
  descricao      text    not null default '',
  preco          numeric(12,2) not null,
  codigo_sku     text    not null,
  categoria      text    not null,
  imagem         text    not null default '',
  ativo          boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  empresa_id     integer,

  constraint produtos_empresa_fk
    foreign key (empresa_id) references public.empresas (id)
);

create index produtos_empresa_idx on public.produtos (empresa_id);

create table public.orcamentos (
  id                   integer generated always as identity primary key,
  numero               integer not null unique,
  cliente_id           integer not null,
  data_emissao         timestamptz not null,
  data_validade        timestamptz not null,
  subtotal             numeric(12,2) not null,
  desconto_valor       numeric(12,2) not null default 0,
  desconto_percentual  numeric(5,2)  not null default 0,
  total                numeric(12,2) not null,
  status               text          not null default 'vigente',
  observacoes          text          not null default '',
  created_at           timestamptz   not null default now(),
  updated_at           timestamptz   not null default now(),

  empresa_id           integer,

  constraint orcamentos_cliente_fk
    foreign key (cliente_id) references public.clientes (id),

  constraint orcamentos_empresa_fk
    foreign key (empresa_id) references public.empresas (id)
);

create index orcamentos_empresa_idx on public.orcamentos (empresa_id);

create table public.itens_orcamento (
  id             integer generated always as identity primary key,
  orcamento_id   integer not null,
  produto_id     integer not null,
  quantidade     integer not null,
  preco_unitario numeric(12,2) not null,
  subtotal       numeric(12,2) not null,

  constraint itens_orcamento_orcamento_fk
    foreign key (orcamento_id) references public.orcamentos (id) on delete cascade,

  constraint itens_orcamento_produto_fk
    foreign key (produto_id) references public.produtos (id)
);

create table public.condicoes_pagamento (
  id                  integer generated always as identity primary key,
  orcamento_id        integer not null,
  forma_pagamento     text    not null,
  parcelas            integer not null,
  valor_parcela       numeric(12,2) not null,
  valor_total         numeric(12,2) not null,
  desconto_percentual numeric(5,2)  not null default 0,
  observacoes         text    not null default '',

  constraint condicoes_pagamento_orcamento_fk
    foreign key (orcamento_id) references public.orcamentos (id) on delete cascade
);

-- ============================================================================
-- Seed de empresa/usuário de teste para E2E / desenvolvimento
-- ============================================================================
-- Este bloco cria (ou atualiza) uma empresa e um usuário de teste pensados
-- para os testes E2E (ex.: Playwright) e para desenvolvimento local.
--
-- Credenciais padrão sugeridas:
--   E-mail:    e2e.teste@orcamento.local
--   Senha:     playwright123
--
-- A senha abaixo já está armazenada como hash bcrypt, compatível com o fluxo
-- de /api/auth/login (campo password_hash na tabela public.usuarios).
-- O script é idempotente: pode ser executado múltiplas vezes sem erro.

with upsert_empresa as (
  insert into public.empresas (nome, cnpj, email, telefone, endereco)
  values (
    'Empresa de Teste E2E',
    '00.000.000/0001-00',
    'contato+e2e@orcamento.local',
    '(11) 0000-0000',
    'Endereço de Teste, 123'
  )
  on conflict (cnpj) do update
    set nome     = excluded.nome,
        email    = excluded.email,
        telefone = excluded.telefone,
        endereco = excluded.endereco
  returning id
),
empresa_row as (
  select id from upsert_empresa
  union all
  select e.id
  from public.empresas e
  where e.cnpj = '00.000.000/0001-00'
  limit 1
),
upsert_loja as (
  insert into public.lojas (nome, cnpj, endereco, telefone, email, logo, empresa_id)
  select
    'Loja de Teste E2E',
    '00.000.000/0001-00',
    'Endereço de Teste, 123',
    '(11) 0000-0000',
    'contato+e2e@orcamento.local',
    '',
    empresa_row.id
  from empresa_row
  on conflict (empresa_id) do update
    set nome     = excluded.nome,
        cnpj     = excluded.cnpj,
        endereco = excluded.endereco,
        telefone = excluded.telefone,
        email    = excluded.email
),
upsert_usuario as (
  insert into public.usuarios (
    email,
    nome,
    empresa_id,
    password_hash,
    email_confirmation_token,
    email_confirmation_expires_at
  )
  select
    'e2e.teste@orcamento.local',
    'Usuário Teste E2E',
    empresa_row.id,
    -- Hash bcrypt para a senha: playwright123
    '$2b$10$qUpsuzGMpnC2TAm3yDxTJOrQw3lUmd3ABWgBu9ikV1XBw2MdIMGsu',
    null,
    null
  from empresa_row
  on conflict (email) do update
    set empresa_id                  = excluded.empresa_id,
        password_hash               = excluded.password_hash,
        email_confirmation_token    = null,
        email_confirmation_expires_at = null
)
select 1;


