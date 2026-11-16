# Configurando o Supabase

Siga na ordem. Leva uns 10 minutos.

## 1. Criar o projeto

1. Acesse <https://supabase.com/dashboard> → **New project**.
2. Escolha nome (ex.: `cota-produtos`), senha do banco (guarde) e região **South America (São Paulo)**.
3. Aguarde o projeto ficar pronto.

## 2. Pegar as chaves

Em **Project Settings → API**:

| Variável no `.env.local`        | Onde está no painel                        |
| ------------------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | **Project URL**                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Project API keys → anon / publishable**  |
| `SUPABASE_SERVICE_ROLE_KEY`     | **Project API keys → service_role** (secreta) |

Copie `.env.example` para `.env.local` e preencha. A `service_role` **nunca** vai para o client nem para o git.

## 3. Rodar o schema

As migrações ficam em [`supabase/migrations/`](../supabase/migrations/) e devem ser aplicadas **em ordem** (`0001`, `0002`, …), uma única vez cada.

**Opção A — SQL Editor (sem configurar nada):** no painel, **SQL Editor → New query**, cole o conteúdo do arquivo e clique em **Run**.

**Opção B — pela linha de comando:** coloque a senha do banco (**Project Settings → Database → Database password**) em `SUPABASE_PASSWORD` no `.env` e rode:

```bash
npm run db:sql -- supabase/migrations/0002_product_categories.sql
```

O script roda o arquivo dentro de uma transação (se falhar, nada é aplicado). Confira em **Table Editor** se as tabelas apareceram.

## 4. Configurar autenticação

Em **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` (depois troque pelo domínio de produção)
- **Redirect URLs**: adicione
  - `http://localhost:3000/auth/callback`
  - `https://SEU-DOMINIO/auth/callback` (quando publicar)

Em **Authentication → Providers → Email**: deixe **Enable email provider** ligado. Pode desligar **Confirm email**: os cadastros são feitos manualmente pela equipe, já confirmados, e nenhum e-mail é enviado.

> As Redirect URLs só são usadas se você ativar recuperação de senha por e-mail no futuro. Hoje a senha é redefinida pelo admin em **Fornecedores/Clientes → ⋯ → Redefinir senha**.

## 5. Criar o seu usuário admin

1. **Authentication → Users → Add user → Create new user**.
2. Informe seu e-mail e uma senha. Marque **Auto Confirm User**.
3. No **SQL Editor**, rode (trocando o e-mail):

```sql
update public.profiles
set role = 'admin', full_name = 'Seu Nome'
where email = 'voce@exemplo.com';
```

## 6. Testar

```bash
npm run dev
```

Acesse <http://localhost:3000>, entre com o admin e cadastre o primeiro fornecedor em **Fornecedores → Cadastrar fornecedor** (ou cliente em **Clientes → Cadastrar cliente**). A equipe define o e-mail e a senha de acesso e repassa ao usuário.

## Usuários de teste (opcional)

Para popular o banco com contas e dados de exemplo (2 fornecedores com produtos e cotações de hoje, 1 cliente, 1 admin):

```bash
npm run seed:test
```

| Perfil     | E-mail                 | Senha           |
| ---------- | ---------------------- | --------------- |
| Admin      | admin@teste.com        | admin123        |
| Fornecedor | fornecedor@teste.com   | fornecedor123   |
| Fornecedor | fornecedor2@teste.com  | fornecedor123   |
| Cliente    | cliente@teste.com      | cliente123      |

O script é idempotente (pode rodar de novo: atualiza senha/papel e reenvia as cotações de hoje). Usa a service role, então **só em ambiente local/dev**. Para remover, apague os usuários em **Authentication → Users**; os cadastros caem em cascata.

> **Cache:** a aplicação guarda as leituras em cache por até 1 hora e as invalida automaticamente a cada ação feita pela interface. Mudanças feitas **direto no banco** (seed, SQL Editor) só aparecem depois de clicar em **Atualizar dados** no dashboard do admin.

## Fluxo de cadastro manual

1. Admin preenche `/admin/fornecedores/novo` ou `/admin/clientes/novo` com os dados captados e um e-mail + senha de acesso (há um gerador de senha).
2. `auth.admin.createUser` (service role) cria o usuário já confirmado, com `role` nos metadados.
3. O trigger `handle_new_user` cria o `profile`; a action cria o registro em `suppliers`/`customers` (e os produtos listados, no caso do fornecedor).
4. A equipe repassa e-mail e senha; a pessoa entra em `/login`. Senha esquecida → admin usa **Redefinir senha**.

## Gerar tipos a partir do banco (opcional, recomendado depois)

```bash
npx supabase login
npx supabase gen types typescript --project-id SEU_PROJECT_ID > types/database.ts
```

Isso substitui os tipos escritos à mão por tipos gerados do schema real.
