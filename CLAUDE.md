# Project: Cota Produtos

Plataforma de cotação diária de preços. Fornecedores enviam preços dos seus produtos todo dia; clientes (restaurantes, bares etc.) veem um ranking do menor para o maior preço, por produto ou por fornecedor. O dono da plataforma (admin) convida fornecedores e clientes e unifica produtos com nomes diferentes.

## Tech Stack
- Next.js 16 (App Router, Cache Components ligado), React 19, TypeScript
- TailwindCSS 4, shadcn/ui (estilo `base-nova`, primitivos `@base-ui/react`)
- React Hook Form + Zod 4 (validação)
- Supabase (Postgres + Auth) via `@supabase/ssr`
- Server Component First

## Commands
- `npm run dev` — servidor local (porta 3000)
- `npm run build` — build de produção
- `npm run type-check` — `tsc --noEmit`
- `npm run lint` — eslint
- `npm run seed:test` — cria usuários/dados de teste no Supabase (service role; só dev). Credenciais em `docs/supabase-setup.md`
- `npm run db:sql -- <arquivo.sql>` — aplica um SQL/migração no Postgres (precisa de `SUPABASE_PASSWORD` no `.env`)
- `npm run classify [-- <backup.json>]` — (re)atribui categorias a todos os produtos e canônicos (família do legado → palavras-chave em `scripts/classify-categories.mts`). Idempotente; relatório em `.local/categorias-atribuidas.csv`. Categorias atuais (18): Carnes bovinas, Aves, Suínos, Peixes e frutos do mar, Embutidos e frios, Laticínios e queijos, Hortifruti, Polpas e congelados, Mercearia, Molhos/temperos, Padaria/salgados/prontos, Sobremesas e doces, Destilados/vinhos/bar, Cervejas e chopes, Bebidas não alcoólicas, Limpeza e higiene, Descartáveis e embalagens, Gelo/carvão/insumos
- `npm run import:legacy -- <backup.json>` — **limpa** cotações, produtos e canônicos e reimporta o export do app legado CotaJá (fornecedores, catálogo → canônicos, produtos por fornecedor de todas as datas, cotações). Mantém usuários/fornecedores/clientes (atualiza pelo nome), remove fornecedores importados que saíram do backup e completa campos vazios (tipo, pagamento, entrega, vendedor "Atendimento", cidade). Fornecedores sem catálogo recebem a lista curada `CURATED` do script. Rodar `npm run classify` em seguida. Acessos gerados vão para `.local/acessos-fornecedores.csv` (fora do git). Último run: 2026-11-18 com `~/Downloads/cotaja-backup-2026-11-18.json`
- `npm run smoke` — com o `npm run dev` rodando, loga com cada usuário de teste e abre todas as páginas

## Papéis e rotas
- `admin` → `/admin/*` (dashboard, fornecedores, clientes, unificação de produtos, importação assistida)
- `supplier` → `/fornecedor/*` (cotação do dia, meus produtos)
- `customer` → `/cliente/*` (ranking, fornecedores)
- `proxy.ts` renova a sessão e bloqueia acesso cruzado entre papéis. `lib/auth.ts` (`requireRole`) é a segunda barreira dentro das páginas.
- **"Acessar como"** (`lib/view-as.ts`, `actions/view-as.ts`): admin escolhe fornecedor/cliente na lista e navega nas telas reais do perfil com permissão de edição (RLS do admin cobre). Cookie httpOnly `cota-view-as` só é honrado pelo proxy quando o token é de admin e fora de `/admin`; `getCurrentUser().actor` identifica o admin real e aciona a faixa `ViewAsBanner`. Admin em `/fornecedor` ou `/cliente` sem alvo é redirecionado para a lista escolher.
- **Cadastro manual pela equipe** em `/admin/fornecedores/novo` e `/admin/clientes/novo` (admin define e-mail + senha via `auth.admin.createUser`, service role). Sem cadastro público, sem e-mails de convite. Senha redefinida pelo admin nas ações da linha.

## Importação assistida por IA (`/admin/importar`, só admin)
- Admin cola texto ou envia imagens/PDF/planilhas (XLSX/XLS/CSV) de uma lista de preços. `actions/import.ts` → `lib/import/extract.ts` monta partes neutras (planilhas viram CSV via SheetJS; imagens/PDF vão em base64) e despacha para o provedor em `lib/import/providers/*`: `gemini.ts` (`@google/genai`, `responseJsonSchema` gerado com `z.toJSONSchema`) ou `anthropic.ts` (`@anthropic-ai/sdk`, `zodOutputFormat`). O schema Zod `extractionSchema` é o mesmo para os dois.
- Provedor escolhido em `lib/ai-provider.ts`: `AI_PROVIDER` força; senão Anthropic se houver `ANTHROPIC_API_KEY`, senão Gemini se houver `GEMINI_API_KEY` (camada gratuita do AI Studio; modelo `GEMINI_MODEL`, padrão `gemini-2.5-flash`). Sem chave nenhuma a página mostra aviso e nada quebra.
- Fluxo: extrair → tabela de conferência (`components/admin/import-wizard.tsx`: fornecedor, data, nome, unidade, categoria, preço, vínculo com produto existente por nome normalizado) → `commitImport` cria produtos novos e faz upsert em `price_quotes` (`product_id, quote_date`). Invalida `products`, `quotes`, `ranking`.
- `next.config.ts`: `experimental.serverActions.bodySizeLimit = 25mb` por causa dos uploads.

## Modelo de dados (ver `supabase/migrations/0001_init.sql`)
- `profiles` (1:1 auth.users, `role`), `suppliers`, `customers`
- `products` pertence ao fornecedor (cadastro livre). `normalized_name` é gerado (unaccent/lower).
- `product_categories` é **controlada só pelo admin** (`/admin/categorias`); `products.category_id` e `canonical_products.category_id` apontam para ela. Fornecedor escolhe via combobox com filtro (`components/category-combobox.tsx`), nunca digita categoria livre. Migrações novas vão em `supabase/migrations/000N_*.sql` (nunca editar as já aplicadas).
- `canonical_products` + `products.canonical_id`: admin unifica nomes diferentes do mesmo item. O catálogo legado (820 itens) já entrou como canônico e os produtos importados já estão vinculados; produtos novos cadastrados por fornecedores entram sem vínculo até o admin unificar.
- Logins de fornecedores importados seguem `slug@fornecedor.cota.local` (não recebem e-mail; a equipe repassa a senha do CSV). Fornecedores do legado sem catálogo tiveram produtos criados a partir do texto "itens que fornece" (unidade kg, sem categoria) — revisar em `/admin/produtos`.
- `price_quotes` único por (`product_id`, `quote_date`). Reenviar no mesmo dia sobrescreve.
- Views: `latest_prices` (último preço por produto) e `product_ranking` (posição por `group_key` = canônico ou nome normalizado + unidade).
- RLS em todas as tabelas; `is_admin()` e `current_user_role()` são security definer.

## Architecture
- App Router: rotas em `app/`, agrupadas por `(auth)/` e `(app)/`
- Server Components por padrão — só adicionar `'use client'` quando usar hooks/eventos/browser APIs
- Mutações via Server Actions em `actions/` — NUNCA chamar DB direto em Client Components
- Leituras em `lib/queries/*` (server-only), uma função por consulta
- `components/ui/` — primitivos shadcn; `components/<feature>/` — componentes de feature; `components/shell/` — layout logado
- `lib/supabase/` — `server.ts` (RSC/actions), `client.ts` (browser), `admin.ts` (service role, só em actions admin), `proxy.ts` (sessão)
- `types/database.ts` — tipos do banco (escritos à mão; regenerar com `supabase gen types` quando houver projeto). `types/schemas.ts` — schemas Zod compartilhados
- Cache Components: tudo que lê `cookies()`/`searchParams` precisa estar dentro de um `<Suspense>` (já feito nos layouts `(app)` e `(auth)`)

## Code Style
- NEVER use `any` explícito — usar `unknown` + type guard
- Imports: ES modules (import/export), sem require()
- Tailwind only — sem CSS inline, sem styled-components
- Design tokens em `app/globals.css` dentro de `@theme inline` + variáveis em `:root`/`.dark` (Tailwind 4 não usa `tailwind.config.ts`). Tokens do projeto: `brand` (laranja), `brand-soft`, `brand-dark` (cinza-escuro neutro), `success`, `warning`
- Radius: `--radius: 0.625rem`. Cards/seções usam `rounded-2xl`; botões usam o radius padrão do `Button` (não adicionar `rounded-full` em botões). `rounded-full` fica só para pílulas de navegação, avatares, badges e chips
- Componentes shadcn base-ui usam `render={<Comp />}` em vez de `asChild`
- Selects em formulários: `components/ui/native-select.tsx` (funciona com RHF e server actions)
- Nomes de arquivo: kebab-case. Componentes: PascalCase. UI em pt-BR

## Environment Variables
- `NEXT_PUBLIC_*` apenas para valores seguros no client (URL e anon key do Supabase)
- `SUPABASE_SERVICE_ROLE_KEY` só em `lib/supabase/admin.ts` (server-only)
- `lib/env.ts` valida tudo com Zod no boot do servidor
- Copiar `.env.example` para `.env.local` ao clonar. Setup completo em `docs/supabase-setup.md`

## Workflow
- ALWAYS run `npm run type-check && npm run lint` após uma série de mudanças
- Branch naming: `feat/`, `fix/`, `chore/` + descrição em kebab-case
- Commits em inglês, imperativo: "add OAuth callback handler"

## Performance (decisões já tomadas — manter)
- O banco fica em us-east-2; cada ida ao Supabase custa ~200–250 ms daqui. O custo de uma página é **número de rodadas sequenciais**, não de consultas. Sempre disparar consultas independentes em `Promise.all`, inclusive junto com `requireRole()` (RLS protege; `requireRole` é defesa extra).
- `proxy.ts` usa `auth.getClaims()` (JWT ES256 verificado localmente, JWKS em cache) — **não** voltar para `getUser()` ali. O papel vem de `app_metadata.role` (definido no `createUser`), com fallback em `profiles`.
- O proxy repassa `x-cota-user-*` (sempre sobrescritos; cliente não forja). `getSessionIdentity()` lê isso sem rede; `getCurrentUser()` faz UMA consulta (`profiles` + joins). Consultas que precisam do usuário usam `profile_id` (ex.: `listSupplierProductsByProfile`) para não esperar o `supplier.id`.
- **Cache de dados entre requests** (`"use cache"` + `cacheTag` + `cacheLife("hours")`) em todas as leituras de `lib/queries/*` e no perfil do usuário (`lib/auth.ts`). Tags em `lib/cache-tags.ts`. **Toda mutação** chama `invalidate(...tags)` (`lib/invalidate.ts` → `updateTag`) com as tags afetadas — esquecer isso = dado velho por até 1 h. Botão "Atualizar dados" no dashboard admin limpa tudo (`actions/cache.ts`).
- Funções `"use cache"` não podem ler cookies, então usam `createCacheClient()` (service role, **só leitura**, regras no próprio arquivo `lib/supabase/cache-client.ts`). Ids passados a elas devem vir de `getSessionIdentity()` (header assinado pelo proxy), nunca de input do usuário.
- `product_ranking` é lida uma vez (`getAllRankingRows`) e derivada em JS para stats/ranking/lista/posições. Se a view crescer muito (milhares de linhas), trocar por consultas filtradas.
- Escritas diretas no banco (SQL Editor, `npm run seed:test`, `npm run db:sql`) **não** invalidam o cache: usar o botão "Atualizar dados" ou esperar a revalidação (1 h).

## Common Gotchas
- `revalidatePath()` e `revalidateTag()` só funcionam em Server Actions/Route Handlers
- Next 16: o arquivo é `proxy.ts` na raiz (não `middleware.ts`). Usar `getUser()` (valida no servidor), nunca `getSession()` para autorização
- `PageProps<"/rota">` e `LayoutProps` são globais gerados — rodar `npx next typegen` se uma rota nova não for reconhecida
- Supabase client no server: `createServerClient` (cookies). No client: `createBrowserClient`
- **PostgREST devolve no máximo 1.000 linhas por request.** Toda leitura que pode crescer (produtos, cotações, ranking, canônicos) usa `fetchAll()` de `lib/supabase/fetch-all.ts` com `order` estável + `range`. Scripts em `scripts/` também precisam paginar.
- Datas: `quote_date` é `date` (sem hora) em America/Sao_Paulo. Usar `todayISO()` e `parseDateOnly()` de `lib/format.ts`
- Imagens externas precisam de domínio autorizado em `next.config.ts` (remotePatterns)
- `AGENTS.md` é gerado pelo `next dev`; não editar à mão
