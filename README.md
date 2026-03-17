# Orçamento

Aplicação para criação e gestão de orçamentos, com cadastro de clientes e produtos.

## Funcionalidades

- **Dashboard** — visão geral e atalhos.
- **Clientes** — CRUD de clientes (nome, CPF/CNPJ, contato).
- **Produtos** — CRUD de produtos com categorias.
- **Orçamentos** — criar, editar, visualizar e duplicar orçamentos; itens, descontos e condições de pagamento; geração de PDF.
- **Configurações** — dados da loja (para cabeçalho do PDF).

## Stack

- **Frontend**
  - React 19, TypeScript, Vite
  - React Router, React Hook Form, Zod
  - Tailwind CSS, Radix UI (shadcn)
  - jsPDF (exportação em PDF)
  - PWA (instalável, offline)

- **Backend (API)**
  - Node.js, Express
  - Prisma (PostgreSQL/SQLite)
  - JWT para autenticação (link mágico)
  - Nodemailer para envio de e-mails

## Desenvolvimento

### Frontend

```bash
npm install
npm run dev
```

Build: `npm run build`

### Backend (API)

Em outro terminal:

```bash
cd api
npm install
npm run dev
```

A API sobe por padrão em `http://localhost:3001` e o frontend em `http://localhost:5173`.

### Banco de dados (Supabase)

Antes de rodar o backend em um ambiente novo, é necessário preparar o banco de dados no Supabase:

1. Crie um projeto no Supabase (se ainda não existir).
2. No painel do Supabase, copie a URL e a chave anônima (anon key) e configure as variáveis de ambiente conforme o `.env.example` na pasta `api/`.
3. No painel do Supabase, abra o **SQL Editor** do projeto.
4. Copie o conteúdo do arquivo `api/prisma/supabase-schema.sql` deste repositório e cole em uma nova query.
5. Execute o script completo para criar as tabelas (`empresas`, `usuarios`, `lojas`, `clientes`, `produtos`, `orcamentos`, etc) **e o usuário/empresa de teste**.

   - Empresa de teste: `Empresa de Teste E2E` (CNPJ `00.000.000/0001-00`)
   - Usuário de teste: `e2e.teste@orcamento.local`
   - Senha de teste: `playwright123`

Sem esse passo, a API não conseguirá acessar as tabelas esperadas (por exemplo, `public.usuarios`) e retornará erros ao tentar cadastrar usuários e outros registros.

### Variáveis de ambiente da API

No diretório `api/` existe um arquivo `.env.example` com todas as variáveis necessárias. Para configurar:

```bash
cd api
cp .env.example .env
# Edite o arquivo .env com os valores reais
```

Principais variáveis:

- `APP_URL` — URL do frontend usada para gerar o link mágico (ex.: `http://localhost:5173` em desenvolvimento).
- `JWT_SECRET` — chave secreta usada para assinar o token JWT.
- `EMAIL_FROM` — remetente dos e-mails (ex.: `"Seu Nome <no-reply@suaempresa.com>"`).
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — dados do servidor SMTP.
- `NODE_ENV` — use `production` em produção para que a API exija configuração de e-mail antes de enviar.
