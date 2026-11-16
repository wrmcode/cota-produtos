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
- `npm run import:legacy -- <backup.json>` — importa o export do app legado CotaJá (fornecedores, catálogo → canônicos, produtos por fornecedor, cotações). Idempotente; acessos gerados vão para `.local/acessos-fornecedores.csv` (fora do git). Já foi rodado em 2026-11-16 com `~/Downloads/cotaja-backup-2026-11-16.json`
- `npm run smoke` — com o `npm run dev` rodando, loga com cada usuário de teste e abre todas as páginas

## Papéis e rotas
- `admin` → `/admin/*` (dashboard, fornecedores, clientes, unificação de produtos)
- `supplier` → `/fornecedor/*` (cotação do dia, meus produtos)
- `customer` → `/cliente/*` (ranking, fornecedores)
- `proxy.ts` renova a sessão e bloqueia acesso cruzado entre papéis. `lib/auth.ts` (`requireRole`) é a segunda barreira dentro das páginas.
- **"Acessar como"** (`lib/view-as.ts`, `actions/view-as.ts`): admin escolhe fornecedor/cliente na lista e navega nas telas reais do perfil com permissão de edição (RLS do admin cobre). Cookie httpOnly `cota-view-as` só é honrado pelo proxy quando o token é de admin e fora de `/admin`; `getCurrentUser().actor` identifica o admin real e aciona a faixa `ViewAsBanner`. Admin em `/fornecedor` ou `/cliente` sem alvo é redirecionado para a lista escolher.
- **Cadastro manual pela equipe** em `/admin/fornecedores/novo` e `/admin/clientes/novo` (admin define e-mail + senha via `auth.admin.createUser`, service role). Sem cadastro público, sem e-mails de convite. Senha redefinida pelo admin nas ações da linha.

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
- Datas: `quote_date` é `date` (sem hora) em America/Sao_Paulo. Usar `todayISO()` e `parseDateOnly()` de `lib/format.ts`
- Imagens externas precisam de domínio autorizado em `next.config.ts` (remotePatterns)
- `AGENTS.md` é gerado pelo `next dev`; não editar à mão
