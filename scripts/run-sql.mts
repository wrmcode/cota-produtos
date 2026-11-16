/**
 * Executa um arquivo SQL no Postgres do Supabase (ex.: migrations), dentro de uma transação.
 *
 *   npm run db:sql -- supabase/migrations/0002_product_categories.sql
 *
 * Precisa de SUPABASE_PASSWORD (senha do banco, Project Settings → Database) no .env.
 * Tenta a conexão direta (IPv6) e depois o pooler em modo sessão.
 */
import { readFileSync } from "node:fs";
import { Client } from "pg";

const file = process.argv[2];
if (!file) {
  console.error("Uso: npm run db:sql -- <arquivo.sql>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const password = process.env.SUPABASE_PASSWORD;
if (!url || !password) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_PASSWORD no .env");
  process.exit(1);
}
const ref = new URL(url).hostname.split(".")[0];

const candidates = [
  { label: "direta", host: `db.${ref}.supabase.co`, port: 5432, user: "postgres" },
  ...["us-east-2", "sa-east-1", "us-east-1", "us-west-1", "eu-west-1", "eu-central-1", "ap-southeast-1"].map((r) => ({
    label: `pooler ${r}`,
    host: `aws-0-${r}.pooler.supabase.com`,
    port: 5432,
    user: `postgres.${ref}`,
  })),
];

async function connect(): Promise<Client> {
  let lastError: unknown;
  for (const c of candidates) {
    const client = new Client({
      host: c.host,
      port: c.port,
      user: c.user,
      password,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    try {
      await client.connect();
      console.log(`Conectado via ${c.label} (${c.host})`);
      return client;
    } catch (e) {
      lastError = e;
      await client.end().catch(() => {});
    }
  }
  throw new Error(`Não consegui conectar ao banco. Último erro: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

const sql = readFileSync(file, "utf8");
const client = await connect();
try {
  await client.query("begin");
  await client.query(sql);
  await client.query("commit");
  console.log(`✔ ${file} aplicado`);
} catch (e) {
  await client.query("rollback").catch(() => {});
  console.error(`✖ Falhou (rollback feito): ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
