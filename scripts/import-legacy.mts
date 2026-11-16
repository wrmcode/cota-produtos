/**
 * Importa o backup do app legado (CotaJá) para as tabelas atuais, sem mudar o schema.
 *
 *   npm run import:legacy -- ~/Downloads/cotaja-backup-2026-11-16.json
 *
 * - Fornecedores → suppliers (+ usuário de acesso quando não existir um com o mesmo nome)
 * - Produtos (catálogo global) → canonical_products; por fornecedor → products já vinculados
 * - Categorias do legado → product_categories
 * - Cotações → price_quotes
 * - Remove produtos/cotações FICTÍCIOS dos fornecedores de teste (usuários são mantidos)
 *
 * Idempotente. Usa a service role: só rodar localmente com o .env preenchido.
 * Acessos criados ficam em .local/acessos-fornecedores.csv (ignorado pelo git).
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

type Legacy = {
  fornecedores: {
    id: string;
    nome: string;
    tipo?: string;
    contatoCotacao?: { nome?: string; whatsapp?: string };
    entrega?: string;
    itensTexto?: string;
    obs?: string;
    pedidoMinimo?: number;
    pedidoMinimoKg?: number;
    prazoPagamento?: string;
    mapa?: Record<string, string>;
  }[];
  produtos: { id: string; nome: string; unidade: string; categoria?: string; familia?: string }[];
  cotacoes: { data: string; precos: Record<string, Record<string, number>> }[];
};

const file = process.argv[2];
if (!file) {
  console.error("Uso: npm run import:legacy -- <backup.json>");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !svc) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}
const db = createClient(url, svc, { auth: { autoRefreshToken: false, persistSession: false } });
const legacy = JSON.parse(readFileSync(file, "utf8")) as Legacy;

const TEST_SUPPLIER_EMAILS = ["fornecedor@teste.com", "fornecedor2@teste.com"];
const LOGIN_DOMAIN = "fornecedor.cota.local";
const ACCESS_FILE = ".local/acessos-fornecedores.csv";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const digits = (s?: string) => (s ?? "").replace(/\D/g, "") || null;
const blank = (s?: string) => (s && s.trim() ? s.trim() : null);
const money = (n?: number) => (n && n > 0 ? n : null);

function generatePassword(length = 10) {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function parseItems(text?: string): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\n,;]+/)) {
    const name = raw.trim().replace(/\s+/g, " ");
    if (name.length >= 2 && !seen.has(norm(name))) {
      seen.add(norm(name));
      out.push(name);
    }
  }
  return out;
}

async function chunked<T>(rows: T[], size: number, fn: (part: T[]) => Promise<void>) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

function fail(step: string, error: { message: string } | null): asserts error is null {
  if (error) throw new Error(`${step}: ${error.message}`);
}

async function main() {
  console.log(`Supabase: ${url}`);
  console.log(`Legado: ${legacy.fornecedores.length} fornecedores, ${legacy.produtos.length} produtos, ${legacy.cotacoes.length} cotação(ões)\n`);

  // ---------- 1. Limpa dados fictícios (mantém usuários e cadastros) ----------
  const { data: testProfiles } = await db.from("profiles").select("id, email").in("email", TEST_SUPPLIER_EMAILS);
  const { data: testSuppliers } = await db.from("suppliers").select("id, name").in("profile_id", (testProfiles ?? []).map((p) => p.id));
  for (const s of testSuppliers ?? []) {
    const { count } = await db.from("products").delete({ count: "exact" }).eq("supplier_id", s.id);
    console.log(`  ✔ removidos ${count ?? 0} produto(s) fictício(s) de "${s.name}" (cotações em cascata)`);
  }
  await db.from("canonical_products").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // ---------- 2. Categorias ----------
  const legacyCategories = [...new Set(legacy.produtos.map((p) => p.categoria?.trim()).filter((c): c is string => Boolean(c)))];
  const { data: existingCats } = await db.from("product_categories").select("id, name, normalized_name, sort_order");
  const catByNorm = new Map((existingCats ?? []).map((c) => [c.normalized_name, c.id]));
  let order = Math.max(0, ...(existingCats ?? []).map((c) => c.sort_order)) + 10;
  for (const name of legacyCategories) {
    if (catByNorm.has(norm(name))) continue;
    const { data, error } = await db.from("product_categories").insert({ name, sort_order: order }).select("id").single();
    fail(`categoria ${name}`, error);
    catByNorm.set(norm(name), data.id);
    order += 10;
  }
  console.log(`  ✔ categorias: ${legacyCategories.join(", ")}`);

  // ---------- 3. Catálogo canônico ----------
  const canonicalRows = legacy.produtos.map((p) => ({
    name: p.nome.trim(),
    unit: p.unidade.trim(),
    category_id: p.categoria ? (catByNorm.get(norm(p.categoria)) ?? null) : null,
  }));
  await chunked(canonicalRows, 300, async (part) => {
    const { error } = await db.from("canonical_products").upsert(part, { onConflict: "name,unit" });
    fail("canonical_products", error);
  });
  const { data: canon } = await db.from("canonical_products").select("id, name, unit");
  const canonKey = (name: string, unit: string) => `${name.trim()}|${unit.trim()}`;
  const canonId = new Map((canon ?? []).map((c) => [canonKey(c.name, c.unit), c.id]));
  const legacyProduct = new Map(legacy.produtos.map((p) => [p.id, p]));
  console.log(`  ✔ catálogo canônico: ${canon?.length ?? 0} itens`);

  // ---------- 4. Fornecedores ----------
  const { data: existingSuppliers } = await db.from("suppliers").select("id, name, profile_id");
  const supplierByNorm = new Map((existingSuppliers ?? []).map((s) => [norm(s.name), s]));
  const { data: usersPage } = await db.auth.admin.listUsers({ perPage: 1000 });
  const usedEmails = new Set((usersPage?.users ?? []).map((u) => u.email?.toLowerCase()));

  if (!existsSync(".local")) mkdirSync(".local");
  const isNewFile = !existsSync(ACCESS_FILE);
  if (isNewFile) writeFileSync(ACCESS_FILE, "fornecedor,email,senha,criado_em\n");

  const quotes = legacy.cotacoes[0];
  const supplierIdByLegacy = new Map<string, string>();
  let created = 0;
  let reused = 0;

  for (const f of legacy.fornecedores) {
    const notesParts = [blank(f.obs), f.itensTexto?.trim() ? `Itens informados no cadastro: ${f.itensTexto.trim()}` : null].filter(Boolean);
    const row = {
      name: f.nome.trim(),
      supplier_type: blank(f.tipo),
      min_order_kg: money(f.pedidoMinimoKg),
      min_order_brl: money(f.pedidoMinimo),
      payment_terms: blank(f.prazoPagamento),
      seller_name: blank(f.contatoCotacao?.nome),
      seller_whatsapp: digits(f.contatoCotacao?.whatsapp),
      delivery_info: blank(f.entrega),
      notes: notesParts.length ? notesParts.join("\n") : null,
      city: "Palmas",
      is_active: true,
    };

    const existing = supplierByNorm.get(norm(f.nome));
    if (existing) {
      const { error } = await db.from("suppliers").update(row).eq("id", existing.id);
      fail(`atualizar ${f.nome}`, error);
      supplierIdByLegacy.set(f.id, existing.id);
      reused++;
      continue;
    }

    let email = `${slug(f.nome) || f.id}@${LOGIN_DOMAIN}`;
    let n = 2;
    while (usedEmails.has(email)) email = `${slug(f.nome)}-${n++}@${LOGIN_DOMAIN}`;
    usedEmails.add(email);
    const password = generatePassword();

    const { data: user, error: uErr } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "supplier", full_name: row.seller_name ?? row.name },
      app_metadata: { role: "supplier" },
    });
    fail(`usuário ${email}`, uErr);
    await db.from("profiles").upsert({ id: user.user.id, role: "supplier", full_name: row.seller_name ?? row.name, email });

    const { data: sup, error: sErr } = await db.from("suppliers").insert({ profile_id: user.user.id, ...row }).select("id").single();
    fail(`fornecedor ${f.nome}`, sErr);
    supplierIdByLegacy.set(f.id, sup.id);
    supplierByNorm.set(norm(f.nome), { id: sup.id, name: f.nome, profile_id: user.user.id });
    appendFileSync(ACCESS_FILE, `"${f.nome.replace(/"/g, '""')}",${email},${password},${new Date().toISOString()}\n`);
    created++;
  }
  console.log(`  ✔ fornecedores: ${created} criado(s), ${reused} reaproveitado(s)`);

  // ---------- 5. Produtos por fornecedor ----------
  let productCount = 0;
  let freeTextCount = 0;
  const productIdByLegacy = new Map<string, string>(); // `${supplierId}|${legacyProductId}`

  for (const f of legacy.fornecedores) {
    const supplierId = supplierIdByLegacy.get(f.id)!;
    const quoted = Object.keys(quotes?.precos[f.id] ?? {});
    const mapped = Object.values(f.mapa ?? {});
    const legacyIds = [...new Set([...quoted, ...mapped])].filter((id) => legacyProduct.has(id));

    const rows = legacyIds.map((id) => {
      const p = legacyProduct.get(id)!;
      return {
        supplier_id: supplierId,
        name: p.nome.trim(),
        unit: p.unidade.trim(),
        category_id: p.categoria ? (catByNorm.get(norm(p.categoria)) ?? null) : null,
        canonical_id: canonId.get(canonKey(p.nome, p.unidade)) ?? null,
        is_active: true,
      };
    });

    // Fornecedor sem catálogo no legado: aproveita o texto livre "itens que fornece" (unidade kg)
    if (rows.length === 0) {
      for (const name of parseItems(f.itensTexto)) {
        rows.push({ supplier_id: supplierId, name, unit: "kg", category_id: null, canonical_id: null, is_active: true });
        freeTextCount++;
      }
    }
    if (rows.length === 0) continue;

    await chunked(rows, 300, async (part) => {
      const { error } = await db.from("products").upsert(part, { onConflict: "supplier_id,normalized_name,unit" });
      fail(`produtos de ${f.nome}`, error);
    });

    const { data: saved } = await db.from("products").select("id, name, unit").eq("supplier_id", supplierId);
    const savedByKey = new Map((saved ?? []).map((p) => [canonKey(p.name, p.unit), p.id]));
    for (const id of legacyIds) {
      const p = legacyProduct.get(id)!;
      const pid = savedByKey.get(canonKey(p.nome, p.unidade));
      if (pid) productIdByLegacy.set(`${supplierId}|${id}`, pid);
    }
    productCount += rows.length;
  }
  console.log(`  ✔ produtos por fornecedor: ${productCount} (${freeTextCount} a partir do texto livre)`);

  // ---------- 6. Cotações ----------
  let quoteCount = 0;
  for (const c of legacy.cotacoes) {
    const rows: { product_id: string; supplier_id: string; price: number; quote_date: string }[] = [];
    for (const [legacySupplierId, prices] of Object.entries(c.precos)) {
      const supplierId = supplierIdByLegacy.get(legacySupplierId);
      if (!supplierId) continue;
      for (const [legacyProductId, price] of Object.entries(prices)) {
        const productId = productIdByLegacy.get(`${supplierId}|${legacyProductId}`);
        if (productId && typeof price === "number" && price >= 0) rows.push({ product_id: productId, supplier_id: supplierId, price, quote_date: c.data });
      }
    }
    await chunked(rows, 300, async (part) => {
      const { error } = await db.from("price_quotes").upsert(part, { onConflict: "product_id,quote_date" });
      fail(`cotações ${c.data}`, error);
    });
    quoteCount += rows.length;
    console.log(`  ✔ cotações de ${c.data}: ${rows.length}`);
  }

  // ---------- 7. Categorias iniciais sem uso ----------
  const { data: catUse } = await db.from("products").select("category_id").not("category_id", "is", null);
  const used = new Set((catUse ?? []).map((r) => r.category_id));
  const legacySet = new Set(legacyCategories.map(norm));
  const removable = (existingCats ?? []).filter((c) => !used.has(c.id) && !legacySet.has(c.normalized_name));
  if (removable.length) {
    const { error } = await db.from("product_categories").delete().in("id", removable.map((c) => c.id));
    fail("remover categorias sem uso", error);
    console.log(`  ✔ categorias iniciais sem produtos removidas: ${removable.map((c) => c.name).join(", ")}`);
  }

  console.log(`\nPronto. Acessos dos fornecedores criados: ${ACCESS_FILE}`);
  console.log(`Total: ${quoteCount} cotações importadas. Clique em "Atualizar dados" no admin para limpar o cache.`);
}

main().catch((e: unknown) => {
  console.error("\n✖ Falhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
