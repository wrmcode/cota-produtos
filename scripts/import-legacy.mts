/**
 * Limpa os dados de catálogo/cotações e reimporta o backup do app legado (CotaJá), sem mudar o schema.
 *
 *   npm run import:legacy -- ~/Downloads/cotaja-backup-2026-11-18.json
 *   npm run classify -- ~/Downloads/cotaja-backup-2026-11-18.json   (atribui as categorias)
 *
 * 1. Limpeza: apaga TODAS as cotações, produtos e canônicos. Usuários, fornecedores e clientes
 *    são mantidos (logins já repassados continuam valendo). Fornecedores importados
 *    (`*@fornecedor.cota.local`) que não existem mais no backup são removidos com o usuário.
 * 2. Fornecedores → suppliers (atualiza pelo nome; cria usuário quando não existir) e completa
 *    campos vazios com valores padrão (tipo, pagamento, entrega, vendedor, cidade).
 * 3. Catálogo global → canonical_products; produtos por fornecedor (de TODAS as cotações + mapa)
 *    já vinculados ao canônico. Fornecedores sem catálogo recebem a lista curada abaixo.
 * 4. Cotações (todas as datas) → price_quotes.
 *
 * Idempotente. Usa a service role: só rodar localmente com o .env preenchido.
 * Acessos criados ficam em .local/acessos-fornecedores.csv (ignorado pelo git).
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

type LegacySupplier = {
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
};
type Legacy = {
  fornecedores: LegacySupplier[];
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

const LOGIN_DOMAIN = "fornecedor.cota.local";
const ACCESS_FILE = ".local/acessos-fornecedores.csv";
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const digits = (s?: string | null) => (s ?? "").replace(/\D/g, "") || null;
const blank = (s?: string | null) => (s && s.trim() ? s.trim() : null);
const money = (n?: number | null) => (n && n > 0 ? n : null);
const key = (name: string, unit: string) => `${norm(name)}|${norm(unit)}`;

// ---------- Valores padrão para campos vazios ----------
/** Tipo do legado → opção do formulário (types/schemas.ts SUPPLIER_TYPES). */
const TYPE_MAP: Record<string, string> = {
  "hortifruti / verdurao": "Hortifruti",
  pescados: "Peixaria",
};
/** Fornecedores cadastrados como "Outro" no legado, com um tipo mais preciso pelo que vendem. */
const TYPE_BY_ID: Record<string, string> = {
  "f-agua-de-coco": "Bebidas",
  "f-brago": "Embalagens",
  "f-bs-clean": "Limpeza",
  "f-casa-do-alho": "Temperos",
  "f-casa-do-padeiro": "Padaria",
  "f-castanhas-carlos": "Mercearia",
  "f-grandioso-pastel": "Padaria",
  "f-maria-dos-temperos": "Temperos",
  "f-molho-pimenta": "Temperos",
  "f-palmas-embalagem": "Embalagens",
  "f-pep-palmitos": "Mercearia",
  "f-petisco-e-cia": "Mercearia",
  "f-pudim": "Padaria",
  "f-seiko": "Distribuidora",
};
const PAYMENT_DEFAULT = "A combinar";
const PAYMENT_BY_TYPE: Record<string, string> = { Atacarejo: "À vista (Pix, cartão ou dinheiro)" };
const DELIVERY_DEFAULT = "A combinar com o vendedor";
const DELIVERY_BY_TYPE: Record<string, string> = { Atacarejo: "Retirada na loja" };
const DELIVERY_BY_ID: Record<string, string> = { "f-jonathan-goiania": "Envio a partir de Goiânia (a combinar)" };
const CITY_BY_ID: Record<string, string> = { "f-jonathan-goiania": "Goiânia" };
const SELLER_DEFAULT = "Atendimento";

/** Telefone que o legado deixou só nas observações. */
function phoneFromNotes(obs?: string) {
  const m = obs?.match(/\(?\d{2}\)?\s*\d{4,5}-?\d{4}/);
  return m ? digits(m[0]) : null;
}

// ---------- Catálogo curado para quem não tem catálogo no legado ----------
// Montado a partir do texto "itens que fornece". Nome igual a um canônico → vincula ao canônico.
type Curated = { copyFrom?: string; items?: [name: string, unit: string][] };
const CURATED: Record<string, Curated> = {
  "f-agua-de-coco": { items: [["Água de coco (copo 300 ml)", "copo"]] },
  "f-alves-comercial": {
    items: [
      ["Abóbora cabotiá especial", "kg"], ["Batata", "kg"], ["Cenoura", "kg"], ["Cebola", "kg"], ["Cebola roxa", "kg"],
      ["Limão taiti", "kg"], ["Pimentão verde", "kg"], ["Pimentão vermelho", "kg"], ["Pimentão amarelo", "kg"],
      ["Repolho roxo", "kg"], ["Tomate", "kg"], ["Abacaxi", "unidade"], ["Ovos brancos (cx 360 un)", "caixa c/ 360"],
      ["Milho verde (bandeja)", "bandeja"],
    ],
  },
  // Mesma rede do Alvorada Norte 2: mesmos cortes, aguardando a primeira cotação
  "f-alvorada": { copyFrom: "f-1ocfiw3w" },
  "f-brago": { items: [["Perflex (rolo)", "rolo"], ["Guardanapo de guardanapeira", "pacote"]] },
  "f-bs-clean": {
    items: [
      ["Papel toalha refil", "fardo"], ["Papel higiênico rolão", "fardo"], ["Secante para máquina de lavar louça", "galão 5 L"],
      ["Detergente para máquina de lavar louça", "galão 5 L"], ["Desinfetante", "galão 5 L"], ["Limpa-alumínio", "galão 5 L"],
    ],
  },
  "f-casa-do-alho": {
    items: [["Alho descascado", "kg"], ["Chimichurri", "kg"], ["Orégano", "kg"], ["Colorau (corante)", "kg"], ["Açafrão", "kg"]],
  },
  "f-casa-do-padeiro": {
    items: [["Corante alimentício", "frasco"], ["Cereja em calda", "pote"], ["Cobertura para sorvete", "frasco"]],
  },
  "f-chopp-oktos": { items: [["Chopp Oktos", "litro"]] },
  "f-grandioso-pastel": { items: [["Massa de pastel", "kg"]] },
  "f-jairo-morango": { items: [["Morango", "bandeja"]] },
  "f-palmas-embalagem": {
    items: [
      ["Marmita quadrada 4 divisórias", "pacote"], ["Marmita redonda 1100 ml", "pacote"], ["Marmita redonda 500 ml", "pacote"],
      ["Marmita redonda 300 ml", "pacote"], ["Marmita de sanduíche", "pacote"], ["Saco de primeiro uso 5 kg", "pacote"],
      ["Saco de primeiro uso 3 kg", "pacote"], ["Insulfilme (filme PVC)", "rolo"], ["Saco de talher 6x23", "pacote"],
      ["Copo descartável 180 ml", "pacote c/ 100"], ["Copo descartável 500 ml", "pacote c/ 50"], ["Garfo descartável", "pacote c/ 50"],
      ["Faca descartável", "pacote c/ 50"], ["Saco a vácuo 20x30", "pacote"], ["Saco a vácuo 15x20", "pacote"],
      ["Luva preta", "caixa"], ["Canudo de suco embalado", "pacote"], ["Canudo mexedor de drinque", "pacote"],
    ],
  },
  // Mesma empresa da loja da Pista do Aeroporto
  "f-pega-bem": { copyFrom: "f-pega-bem-aeroporto" },
  "f-peixaria-tocantins": { items: [["Lombo de pirarucu", "kg"]] },
  "f-pep-palmitos": {
    items: [
      ["Kit feijoada", "kg"], ["Azeitona recheada", "kg"], ["Azeitona sem caroço", "kg"], ["Pimenta biquinho", "kg"],
      ["Palmito em conserva", "vidro"], ["Cogumelo inteiro em conserva", "kg"], ["Tomate seco", "kg"],
      ["Pepino em conserva", "vidro"], ["Polpa de morango (1 kg)", "pacote"],
    ],
  },
  "f-polly-folhas": {
    items: [
      ["Alface crespa", "maço"], ["Alface roxa", "unidade"], ["Couve", "maço"], ["Rúcula", "maço"], ["Cheiro-verde", "maço"],
      ["Jiló", "kg"], ["Quiabo", "kg"], ["Maxixe", "kg"], ["Pimenta de cheiro", "kg"], ["Manjericão", "maço"], ["Mandioca", "kg"],
    ],
  },
  "f-porquito": { items: [["Linguiça suína fina", "kg"], ["Linguiça suína apimentada", "kg"]] },
  "f-recarga-co2": { items: [["Recarga de CO2", "kg"]] },
  "f-sorvete-andrea-vogt": { items: [["Sorvete de creme (pote 10 L)", "pote"], ["Picolé", "unidade"]] },
  "f-temar": {
    items: [
      ["Água mineral sem gás (500 ml)", "garrafa"], ["Água mineral com gás (500 ml)", "garrafa"],
      ["Água tônica (lata 350 ml)", "lata"], ["Água tônica zero (lata 350 ml)", "lata"], ["Água tônica (1 L)", "garrafa"],
      ["Energético Red Bull (lata 250 ml)", "lata"], ["Refrigerante guaraná (lata 350 ml)", "lata"],
      ["Refrigerante guaraná zero (lata 350 ml)", "lata"], ["H2OH limão (500 ml)", "garrafa"], ["H2OH limoneto (lata 350 ml)", "lata"],
    ],
  },
};

function generatePassword(length = 10) {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function chunked<T>(rows: T[], size: number, fn: (part: T[]) => Promise<void>) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

function fail(step: string, error: { message: string } | null): asserts error is null {
  if (error) throw new Error(`${step}: ${error.message}`);
}

/** Apaga todas as linhas de uma tabela (PostgREST exige um filtro). */
async function wipe(table: string) {
  const { error, count } = await db.from(table).delete({ count: "exact" }).neq("id", NIL_UUID);
  fail(`limpar ${table}`, error);
  return count ?? 0;
}

function supplierType(f: LegacySupplier) {
  if (TYPE_BY_ID[f.id]) return TYPE_BY_ID[f.id];
  const t = blank(f.tipo);
  if (!t) return "Outro";
  return TYPE_MAP[norm(t)] ?? t;
}

async function main() {
  console.log(`Supabase: ${url}`);
  console.log(
    `Backup: ${legacy.fornecedores.length} fornecedores, ${legacy.produtos.length} produtos, ${legacy.cotacoes.length} cotação(ões): ${legacy.cotacoes.map((c) => c.data).join(", ")}\n`,
  );

  // ---------- 1. Limpeza ----------
  console.log("Limpando…");
  console.log(`  ✔ cotações apagadas: ${await wipe("price_quotes")}`);
  console.log(`  ✔ produtos apagados: ${await wipe("products")}`);
  console.log(`  ✔ canônicos apagados: ${await wipe("canonical_products")}`);

  const legacyNames = new Set(legacy.fornecedores.map((f) => norm(f.nome)));
  const { data: allSuppliers } = await db.from("suppliers").select("id, name, profile_id, profiles(email)");
  for (const s of allSuppliers ?? []) {
    const email = (s.profiles as unknown as { email: string | null } | null)?.email ?? "";
    if (email.endsWith(`@${LOGIN_DOMAIN}`) && !legacyNames.has(norm(s.name))) {
      const { error } = await db.auth.admin.deleteUser(s.profile_id);
      fail(`remover ${s.name}`, error);
      console.log(`  ✔ fornecedor fora do backup removido: "${s.name}" <${email}>`);
    }
  }

  // ---------- 2. Catálogo canônico (sem categoria: `npm run classify` atribui depois) ----------
  const canonicalRows = new Map<string, { name: string; unit: string }>();
  for (const p of legacy.produtos) canonicalRows.set(key(p.nome, p.unidade), { name: p.nome.trim(), unit: p.unidade.trim() });
  await chunked([...canonicalRows.values()], 300, async (part) => {
    const { error } = await db.from("canonical_products").upsert(part, { onConflict: "name,unit" });
    fail("canonical_products", error);
  });
  const canon: { id: string; name: string; unit: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("canonical_products").select("id, name, unit").order("id").range(from, from + 999);
    fail("ler canônicos", error);
    canon.push(...data);
    if (data.length < 1000) break;
  }
  const canonByKey = new Map(canon.map((c) => [key(c.name, c.unit), c]));
  const canonByName = new Map<string, (typeof canon)[number]>();
  for (const c of canon) if (!canonByName.has(norm(c.name))) canonByName.set(norm(c.name), c);
  const legacyProduct = new Map(legacy.produtos.map((p) => [p.id, p]));
  console.log(`  ✔ catálogo canônico: ${canon.length} itens`);

  // ---------- 3. Fornecedores ----------
  const { data: existingSuppliers } = await db.from("suppliers").select("id, name, profile_id");
  const supplierByNorm = new Map((existingSuppliers ?? []).map((s) => [norm(s.name), s]));
  const { data: usersPage } = await db.auth.admin.listUsers({ perPage: 1000 });
  const usedEmails = new Set((usersPage?.users ?? []).map((u) => u.email?.toLowerCase()));

  if (!existsSync(".local")) mkdirSync(".local");
  if (!existsSync(ACCESS_FILE)) writeFileSync(ACCESS_FILE, "fornecedor,email,senha,criado_em\n");

  const supplierIdByLegacy = new Map<string, string>();
  let created = 0;
  let reused = 0;

  for (const f of legacy.fornecedores) {
    const type = supplierType(f);
    const notesParts = [blank(f.obs), f.itensTexto?.trim() ? `Itens informados no cadastro: ${f.itensTexto.trim()}` : null].filter(Boolean);
    const row = {
      name: f.nome.trim(),
      supplier_type: type,
      min_order_kg: money(f.pedidoMinimoKg),
      min_order_brl: money(f.pedidoMinimo),
      payment_terms: blank(f.prazoPagamento) ?? PAYMENT_BY_TYPE[type] ?? PAYMENT_DEFAULT,
      seller_name: blank(f.contatoCotacao?.nome) ?? SELLER_DEFAULT,
      seller_whatsapp: digits(f.contatoCotacao?.whatsapp) ?? phoneFromNotes(f.obs),
      delivery_info: blank(f.entrega) ?? DELIVERY_BY_ID[f.id] ?? DELIVERY_BY_TYPE[type] ?? DELIVERY_DEFAULT,
      notes: notesParts.length ? notesParts.join("\n") : null,
      city: CITY_BY_ID[f.id] ?? "Palmas",
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
      user_metadata: { role: "supplier", full_name: row.seller_name === SELLER_DEFAULT ? row.name : row.seller_name },
      app_metadata: { role: "supplier" },
    });
    fail(`usuário ${email}`, uErr);
    await db.from("profiles").upsert({ id: user.user.id, role: "supplier", full_name: row.name, email });

    const { data: sup, error: sErr } = await db.from("suppliers").insert({ profile_id: user.user.id, ...row }).select("id").single();
    fail(`fornecedor ${f.nome}`, sErr);
    supplierIdByLegacy.set(f.id, sup.id);
    supplierByNorm.set(norm(f.nome), { id: sup.id, name: f.nome, profile_id: user.user.id });
    appendFileSync(ACCESS_FILE, `"${f.nome.replace(/"/g, '""')}",${email},${password},${new Date().toISOString()}\n`);
    created++;
  }

  // Fornecedores cadastrados à mão (fora do backup): só completa o que estiver vazio
  const { data: others } = await db.from("suppliers").select("id, supplier_type, payment_terms, delivery_info, seller_name, city");
  const imported = new Set(supplierIdByLegacy.values());
  let filled = 0;
  for (const s of others ?? []) {
    if (imported.has(s.id)) continue;
    const type = s.supplier_type ?? "Outro";
    const patch = {
      supplier_type: type,
      payment_terms: s.payment_terms ?? PAYMENT_BY_TYPE[type] ?? PAYMENT_DEFAULT,
      delivery_info: s.delivery_info ?? DELIVERY_BY_TYPE[type] ?? DELIVERY_DEFAULT,
      seller_name: s.seller_name ?? SELLER_DEFAULT,
      city: s.city ?? "Palmas",
    };
    const { error } = await db.from("suppliers").update(patch).eq("id", s.id);
    fail("completar fornecedor", error);
    filled++;
  }
  console.log(`  ✔ fornecedores: ${created} criado(s), ${reused} atualizado(s), ${filled} fora do backup completado(s)`);

  // ---------- 4. Produtos por fornecedor ----------
  const legacyIdsBySupplier = new Map<string, Set<string>>();
  for (const f of legacy.fornecedores) {
    const ids = new Set<string>(Object.values(f.mapa ?? {}));
    for (const c of legacy.cotacoes) for (const id of Object.keys(c.precos[f.id] ?? {})) ids.add(id);
    legacyIdsBySupplier.set(f.id, new Set([...ids].filter((id) => legacyProduct.has(id))));
  }

  type ProductRow = { supplier_id: string; name: string; unit: string; canonical_id: string | null; is_active: boolean };
  let productCount = 0;
  let curatedCount = 0;
  const productIdByLegacy = new Map<string, string>(); // `${supplierId}|${legacyProductId}`
  const empty: string[] = [];

  for (const f of legacy.fornecedores) {
    const supplierId = supplierIdByLegacy.get(f.id)!;
    const curated = CURATED[f.id];
    let legacyIds = [...legacyIdsBySupplier.get(f.id)!];
    if (legacyIds.length === 0 && curated?.copyFrom) legacyIds = [...(legacyIdsBySupplier.get(curated.copyFrom) ?? [])];

    const rows = new Map<string, ProductRow>();
    for (const id of legacyIds) {
      const p = legacyProduct.get(id)!;
      const c = canonByKey.get(key(p.nome, p.unidade));
      rows.set(key(p.nome, p.unidade), { supplier_id: supplierId, name: p.nome.trim(), unit: p.unidade.trim(), canonical_id: c?.id ?? null, is_active: true });
    }
    if (rows.size === 0) {
      for (const [name, unit] of curated?.items ?? []) {
        const c = canonByName.get(norm(name));
        const row = c
          ? { supplier_id: supplierId, name: c.name, unit: c.unit, canonical_id: c.id, is_active: true }
          : { supplier_id: supplierId, name, unit, canonical_id: null, is_active: true };
        rows.set(key(row.name, row.unit), row);
        curatedCount++;
      }
    }
    if (rows.size === 0) {
      empty.push(f.nome);
      continue;
    }

    await chunked([...rows.values()], 300, async (part) => {
      const { error } = await db.from("products").upsert(part, { onConflict: "supplier_id,normalized_name,unit" });
      fail(`produtos de ${f.nome}`, error);
    });

    const { data: saved } = await db.from("products").select("id, name, unit").eq("supplier_id", supplierId);
    const savedByKey = new Map((saved ?? []).map((p) => [key(p.name, p.unit), p.id]));
    for (const id of legacyIds) {
      const p = legacyProduct.get(id)!;
      const pid = savedByKey.get(key(p.nome, p.unidade));
      if (pid) productIdByLegacy.set(`${supplierId}|${id}`, pid);
    }
    productCount += rows.size;
  }
  console.log(`  ✔ produtos por fornecedor: ${productCount} (${curatedCount} da lista curada)`);
  if (empty.length) console.log(`  · sem produtos (backup não informa o que vendem): ${empty.join(", ")}`);

  // ---------- 5. Cotações ----------
  let quoteCount = 0;
  for (const c of legacy.cotacoes) {
    const rows = new Map<string, { product_id: string; supplier_id: string; price: number; quote_date: string }>();
    for (const [legacySupplierId, prices] of Object.entries(c.precos)) {
      const supplierId = supplierIdByLegacy.get(legacySupplierId);
      if (!supplierId) continue;
      for (const [legacyProductId, price] of Object.entries(prices)) {
        const productId = productIdByLegacy.get(`${supplierId}|${legacyProductId}`);
        if (productId && typeof price === "number" && price >= 0) rows.set(productId, { product_id: productId, supplier_id: supplierId, price, quote_date: c.data });
      }
    }
    await chunked([...rows.values()], 300, async (part) => {
      const { error } = await db.from("price_quotes").upsert(part, { onConflict: "product_id,quote_date" });
      fail(`cotações ${c.data}`, error);
    });
    quoteCount += rows.size;
    console.log(`  ✔ cotações de ${c.data}: ${rows.size}`);
  }

  console.log(`\nPronto: ${quoteCount} cotações. Agora rode \`npm run classify -- ${file}\` e clique em "Atualizar dados" no admin.`);
}

main().catch((e: unknown) => {
  console.error("\n✖ Falhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
