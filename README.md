# Cota Produtos

Plataforma de cotação diária de preços. Fornecedores enviam todo dia os preços dos seus produtos; clientes (restaurantes, bares etc.) veem um ranking do menor para o maior preço, por produto ou por fornecedor. O dono da plataforma (admin) cadastra fornecedores e clientes, organiza categorias e unifica produtos com nomes diferentes.

## Funcionalidades

### Acesso e autenticação
- Login por e-mail e senha (Supabase Auth); tela para definir/criar senha.
- Sem cadastro público: contas de fornecedores e clientes são criadas pela equipe.
- Três papéis com áreas separadas: **admin** (`/admin`), **fornecedor** (`/fornecedor`) e **cliente** (`/cliente`). O acesso cruzado entre papéis é bloqueado no proxy e de novo nas páginas, com RLS em todas as tabelas.

### Admin
- **Dashboard** com indicadores do dia, cotações recentes e a lista de **fornecedores sem cotação hoje**, com atalho para cobrar pelo WhatsApp com mensagem pronta.
- **Fornecedores**: cadastro manual (dados comerciais, contato, WhatsApp, e-mail e senha de acesso), edição, ativar/desativar e redefinir senha.
- **Clientes**: cadastro manual do estabelecimento e do responsável, ativar/desativar e redefinir senha.
- **Acessar como**: o admin escolhe um fornecedor ou cliente e navega nas telas reais daquele perfil, podendo editar. Uma faixa no topo indica o modo e permite sair.
- **Produtos**: visão do catálogo de todos os fornecedores; editar nome, unidade e categoria; ativar/desativar; **unificar** nomes diferentes do mesmo item em um produto canônico (vincular/desvincular) para o ranking comparar corretamente.
- **Categorias**: só o admin cria, renomeia e exclui categorias. Os fornecedores escolhem numa lista e não digitam categoria livre.
- **Importação assistida por IA**: colar texto ou enviar fotos, PDF ou planilhas (XLSX/XLS/CSV) de uma lista de preços, soltos ou num arquivo ZIP. A IA (Anthropic ou Gemini) extrai os itens para uma tabela de conferência com fornecedor, data, nome, unidade, categoria, preço e vínculo com produto existente. O admin ajusta e aprova; produtos novos são criados e as cotações gravadas. Imagens grandes são reduzidas automaticamente antes do envio.
- **Atualizar dados**: botão que limpa o cache de leitura da aplicação.

### Fornecedor
- **Cotação do dia**: formulário com todos os produtos ativos, busca por produto ou categoria, e envio dos preços do dia. Reenviar no mesmo dia sobrescreve.
- **Meus produtos**: cadastrar, editar e ativar/desativar os itens que cota, com nome, unidade e categoria (combobox com filtro).

### Cliente
- **Ranking de preços**: do menor para o maior preço por produto, com busca (ex.: frango, tomate, cerveja), filtro por fornecedor e colunas configuráveis.
- **Fornecedores**: cards com condições comerciais (pedido mínimo, entrega, pagamento, vendedor), contato pelo WhatsApp e lista de preços de cada fornecedor.

### Dados e scripts
- Importação do app legado (CotaJá): fornecedores, catálogo como produtos canônicos, produtos por fornecedor e cotações (`npm run import:legacy`).
- Classificação automática dos produtos em 18 categorias (`npm run classify`).
- Usuários e dados de teste (`npm run seed:test`) e smoke test de todas as páginas por papel (`npm run smoke`).

## Stack
- Next.js 16 (App Router, Cache Components), React 19, TypeScript
- TailwindCSS 4 e shadcn/ui (`@base-ui/react`)
- React Hook Form + Zod 4
- Supabase (Postgres + Auth) via `@supabase/ssr`
- SDKs de IA: `@anthropic-ai/sdk` e `@google/genai`

## Como rodar

```bash
cp .env.example .env.local
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). A configuração completa do Supabase, as variáveis de ambiente e as credenciais de teste estão em [`docs/supabase-setup.md`](docs/supabase-setup.md).

### Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor local (porta 3000) |
| `npm run build` | Build de produção |
| `npm run type-check` | Checagem de tipos (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm run seed:test` | Cria usuários e dados de teste (só dev) |
| `npm run smoke` | Com o dev rodando, loga com cada usuário de teste e abre todas as páginas |
| `npm run db:sql -- <arquivo.sql>` | Aplica um SQL/migração no Postgres |
| `npm run import:legacy -- <backup.json>` | Importa o export do app legado |
| `npm run classify [-- <backup.json>]` | (Re)atribui categorias a produtos e canônicos |

### IA na importação
Defina `ANTHROPIC_API_KEY` ou `GEMINI_API_KEY` (`AI_PROVIDER` força um deles; `GEMINI_MODEL` padrão `gemini-2.5-flash`). Sem nenhuma chave, a página de importação mostra um aviso e o resto do app funciona normalmente.
