/**
 * Cria usuários de teste e dados de exemplo no Supabase.
 *
 *   npm run seed:test
 *
 * Idempotente: pode rodar várias vezes. Usa a service role (ignora RLS),
 * por isso só roda localmente com o .env preenchido. NÃO rodar em produção.
 */
import { createClient, type User } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

type Role = "admin" | "supplier" | "customer";

const USERS = [
  { email: "admin@teste.com", password: "admin123", role: "admin" as Role, full_name: "Administrador" },
  { email: "fornecedor@teste.com", password: "fornecedor123", role: "supplier" as Role, full_name: "Diego (Alvorada Norte)" },
  { email: "fornecedor2@teste.com", password: "fornecedor123", role: "supplier" as Role, full_name: "Marcos (Hortifruti Central)" },
  { email: "cliente@teste.com", password: "cliente123", role: "customer" as Role, full_name: "Ana (Restaurante Sabor)" },
];

const SUPPLIERS: Record<string, { row: Record<string, unknown>; products: { name: string; unit: string; price: number; category: string }[] }> = {
  "fornecedor@teste.com": {
    row: {
      name: "Alvorada Norte",
      supplier_type: "Açougue",
      min_order_kg: 30,
      min_order_brl: 500,
      payment_terms: "7 dias, boleto",
      seller_name: "Diego",
      seller_whatsapp: "63992132267",
      delivery_info: "seg a sáb, até 11h",
      notes: "Só retirada na loja aos domingos",
      city: "Palmas",
    },
    products: [
      { name: "Peito de frango", unit: "kg", price: 14.9, category: "Aves" },
      { name: "Coxa e sobrecoxa", unit: "kg", price: 11.5, category: "Aves" },
      { name: "Alcatra", unit: "kg", price: 42.9, category: "Carnes" },
      { name: "Patinho moído", unit: "kg", price: 34.5, category: "Carnes" },
      { name: "Linguiça toscana", unit: "kg", price: 22.0, category: "Frios e embutidos" },
      { name: "Tomate", unit: "kg", price: 7.9, category: "Hortifruti" },
    ],
  },
  "fornecedor2@teste.com": {
    row: {
      name: "Hortifruti Central",
      supplier_type: "Hortifruti",
      min_order_kg: null,
      min_order_brl: 150,
      payment_terms: "À vista ou PIX",
      seller_name: "Marcos",
      seller_whatsapp: "63991112222",
      delivery_info: "seg a sex, até 9h",
      notes: null,
      city: "Palmas",
    },
    products: [
      { name: "Tomate", unit: "kg", price: 6.5, category: "Hortifruti" },
      { name: "Cebola", unit: "kg", price: 4.2, category: "Hortifruti" },
      { name: "Batata inglesa", unit: "kg", price: 5.1, category: "Hortifruti" },
      { name: "Alface crespa", unit: "un", price: 2.8, category: "Hortifruti" },
      { name: "Peito de frango", unit: "kg", price: 15.9, category: "Aves" },
      { name: "Limão taiti", unit: "kg", price: 3.9, category: "Hortifruti" },
    ],
  },
};

const CUSTOMER = {
  name: "Restaurante Sabor",
  business_type: "Restaurante",
  cnpj: "00.000.000/0001-00",
  phone: "63999990000",
  city: "Palmas",
};

async function ensureSchema() {
  const { error } = await db.from("profiles").select("id", { head: true, count: "exact" });
  if (error) {
    console.error("\n✖ Não encontrei a tabela `profiles`. Rode primeiro o SQL de supabase/migrations/0001_init.sql no SQL Editor.\n");
    console.error("  Detalhe:", error.message);
    process.exit(1);
  }
}

async function findUserByEmail(email: string): Promise<User | null> {
  let page = 1;
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function ensureUser(u: (typeof USERS)[number]): Promise<string> {
  const existing = await findUserByEmail(u.email);
  if (existing) {
    // Garante senha e metadados conhecidos
    const { error } = await db.auth.admin.updateUserById(existing.id, {
      password: u.password,
      email_confirm: true,
      user_metadata: { role: u.role, full_name: u.full_name },
      app_metadata: { role: u.role },
    });
    if (error) throw error;
    await db.from("profiles").upsert({ id: existing.id, role: u.role, full_name: u.full_name, email: u.email });
    console.log(`  ↻ ${u.email} já existia — senha/papel atualizados`);
    return existing.id;
  }

  const { data, error } = await db.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { role: u.role, full_name: u.full_name },
    app_metadata: { role: u.role },
  });
  if (error || !data.user) throw error ?? new Error("createUser sem retorno");
  // O trigger cria o profile; o upsert cobre o caso do trigger não existir
  await db.from("profiles").upsert({ id: data.user.id, role: u.role, full_name: u.full_name, email: u.email });
  console.log(`  ✔ ${u.email} criado`);
  return data.user.id;
}

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

async function ensureSupplier(profileId: string, email: string) {
  const cfg = SUPPLIERS[email];
  const { data: supplier, error } = await db
    .from("suppliers")
    .upsert({ profile_id: profileId, ...cfg.row }, { onConflict: "profile_id" })
    .select("id")
    .single();
  if (error || !supplier) throw error ?? new Error("supplier sem retorno");

  const { data: cats } = await db.from("product_categories").select("id, name");
  const catId = (name: string) => cats?.find((c) => c.name === name)?.id ?? null;

  const { error: pErr } = await db
    .from("products")
    .upsert(
      cfg.products.map((p) => ({ supplier_id: supplier.id, name: p.name, unit: p.unit, category_id: catId(p.category) })),
      { onConflict: "supplier_id,normalized_name,unit", ignoreDuplicates: true },
    );
  if (pErr) throw pErr;
  // Garante categoria também nos produtos que já existiam
  for (const p of cfg.products) {
    await db.from("products").update({ category_id: catId(p.category) }).eq("supplier_id", supplier.id).eq("name", p.name).eq("unit", p.unit);
  }

  const { data: products, error: lErr } = await db.from("products").select("id, name, unit").eq("supplier_id", supplier.id);
  if (lErr) throw lErr;

  const today = todayISO();
  const quotes = cfg.products
    .map((p) => {
      const prod = products?.find((x) => x.name === p.name && x.unit === p.unit);
      return prod ? { product_id: prod.id, supplier_id: supplier.id, price: p.price, quote_date: today } : null;
    })
    .filter((q): q is NonNullable<typeof q> => q !== null);

  const { error: qErr } = await db.from("price_quotes").upsert(quotes, { onConflict: "product_id,quote_date" });
  if (qErr) throw qErr;

  console.log(`  ✔ fornecedor "${cfg.row.name}" com ${products?.length ?? 0} produtos e ${quotes.length} cotações de hoje`);
}

async function ensureCustomer(profileId: string) {
  const { error } = await db.from("customers").upsert({ profile_id: profileId, ...CUSTOMER }, { onConflict: "profile_id" });
  if (error) throw error;
  console.log(`  ✔ cliente "${CUSTOMER.name}"`);
}

async function main() {
  console.log(`Supabase: ${url}\n`);
  await ensureSchema();

  console.log("Usuários:");
  const ids = new Map<string, string>();
  for (const u of USERS) ids.set(u.email, await ensureUser(u));

  console.log("\nCadastros:");
  for (const email of Object.keys(SUPPLIERS)) await ensureSupplier(ids.get(email)!, email);
  await ensureCustomer(ids.get("cliente@teste.com")!);

  console.log("\nPronto! Acessos de teste:");
  console.table(USERS.map((u) => ({ perfil: u.role, email: u.email, senha: u.password })));
}

main().catch((e: unknown) => {
  console.error("\n✖ Falhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
