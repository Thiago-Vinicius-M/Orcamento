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

## Deploy e estratégia de hospedagem

- **Plataforma**: Vercel.
- **Arquitetura**:
  - O **frontend** (Vite/React) é publicado como uma SPA estática na Vercel.
  - A **API** Express é exposta como **funções serverless** sob o prefixo `/api` no mesmo projeto da Vercel.
- **Integração front/API**:
  - Em produção na Vercel, o frontend acessa a API usando `VITE_API_BASE_URL=/api`.
  - O cliente HTTP central (`src/api/client.ts`) monta as URLs a partir dessa base, chamando endpoints como `/api/auth`, `/api/clientes`, `/api/produtos`, etc., no mesmo domínio.
  - Isso elimina problemas de CORS em produção, já que front e API compartilham o mesmo host.
- **Estratégia para a API**:
  - A lógica atual da API está em `api/src/index.ts`, usando Express com rotas agrupadas (`/api/auth`, `/api/clientes`, `/api/produtos`, `/api/orcamentos`, `/api/dashboard`).
  - Para rodar na Vercel, essa mesma configuração de rotas será reaproveitada em um **handler serverless** (por exemplo, um arquivo `api/src/serverless.ts`) que monta o `express()` e exporta o handler esperado pela Vercel.
  - Em ambiente serverless **não é usado `app.listen`**; em vez disso, a Vercel chama diretamente o handler exportado.
- **Configuração de rotas na Vercel** (alto nível):
  - As rotas que começam com `/api` serão encaminhadas para o handler serverless da API (por exemplo, via `vercel.json` com rewrites para `/api/(.*)`).
  - Todas as demais rotas (do React Router) serão servidas pela SPA, apontando para o `index.html` gerado pelo Vite.
- **Ambientes e variáveis**:
  - As variáveis de ambiente já usadas pela API (por exemplo, `DATABASE_URL`/configurações do Supabase, `JWT_SECRET`, config de e-mail) devem ser cadastradas na Vercel, respeitando cada ambiente (Development/Preview/Production).
  - No frontend, em produção, definir `VITE_API_BASE_URL=/api` nas Environment Variables do projeto Vercel.
  - Em desenvolvimento local, permanece a estratégia atual: Vite dev server em `http://localhost:5173` falando com a API em `http://localhost:3001` (via `VITE_API_BASE_URL`/proxy).

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
