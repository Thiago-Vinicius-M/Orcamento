# Orçamento

Aplicação para criação e gestão de orçamentos, com cadastro de clientes e produtos. Os dados são armazenados localmente (IndexedDB via Dexie).

## Funcionalidades

- **Dashboard** — visão geral e atalhos.
- **Clientes** — CRUD de clientes (nome, CPF/CNPJ, contato).
- **Produtos** — CRUD de produtos com categorias.
- **Orçamentos** — criar, editar, visualizar e duplicar orçamentos; itens, descontos e condições de pagamento; geração de PDF.
- **Configurações** — dados da loja (para cabeçalho do PDF).

## Stack

- React 19, TypeScript, Vite
- React Router, React Hook Form, Zod
- Dexie (IndexedDB)
- Tailwind CSS, Radix UI (shadcn)
- jsPDF (exportação em PDF)
- PWA (instalável, offline)

## Desenvolvimento

```bash
npm install
npm run dev
```

Build: `npm run build`
