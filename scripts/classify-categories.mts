/**
 * Atribui a cada produto (e canônico) a categoria que mais faz sentido.
 *
 *   npm run classify -- ~/Downloads/cotaja-backup-2026-11-16.json
 *
 * Fontes, nesta ordem: família do catálogo legado → palavras-chave no nome.
 * Produtos vinculados a um canônico herdam a categoria dele.
 * Gera .local/categorias-atribuidas.csv para revisão e lista o que não classificou.
 * Idempotente. Service role: só local.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(url, svc, { auth: { autoRefreshToken: false, persistSession: false } });

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");

// ---------- Categorias alvo (ordem de exibição) ----------
const CATEGORIES = [
  "Carnes bovinas",
  "Aves",
  "Suínos",
  "Peixes e frutos do mar",
  "Embutidos e frios",
  "Laticínios e queijos",
  "Hortifruti",
  "Polpas e congelados",
  "Mercearia",
  "Molhos, temperos e condimentos",
  "Padaria, salgados e pratos prontos",
  "Sobremesas e doces",
  "Destilados, vinhos e bar",
  "Cervejas e chopes",
  "Bebidas não alcoólicas",
  "Limpeza e higiene",
  "Descartáveis e embalagens",
  "Gelo, carvão e insumos",
] as const;
type Cat = (typeof CATEGORIES)[number];

// ---------- Regras por família do legado ("categoria > familia") ----------
const FAMILY: Record<string, Cat> = {
  // Mercearia (legado) desmembrada
  "mercearia > bacon": "Embutidos e frios",
  "mercearia > calabresa": "Embutidos e frios",
  "mercearia > frios": "Embutidos e frios",
  "mercearia > queijos": "Laticínios e queijos",
  "mercearia > mussarela": "Laticínios e queijos",
  "mercearia > requeijao": "Laticínios e queijos",
  "mercearia > cream cheese e requeijao": "Laticínios e queijos",
  "mercearia > creme de leite": "Laticínios e queijos",
  "mercearia > leite": "Laticínios e queijos",
  "mercearia > leites": "Laticínios e queijos",
  "mercearia > leite condensado": "Laticínios e queijos",
  "mercearia > lacteos": "Laticínios e queijos",
  "mercearia > margarina e manteiga": "Laticínios e queijos",
  "mercearia > polpas e congelados": "Polpas e congelados",
  "mercearia > sorvetes": "Sobremesas e doces",
  "mercearia > sobremesas": "Sobremesas e doces",
  "mercearia > doces": "Sobremesas e doces",
  "mercearia > sucos": "Bebidas não alcoólicas",
  "mercearia > agua de coco": "Bebidas não alcoólicas",
  "mercearia > limpeza": "Limpeza e higiene",
  "mercearia > descartaveis": "Descartáveis e embalagens",
  "mercearia > gelo": "Gelo, carvão e insumos",
  "mercearia > carvao": "Gelo, carvão e insumos",
  "mercearia > molhos": "Molhos, temperos e condimentos",
  "mercearia > molho de pimenta": "Molhos, temperos e condimentos",
  "mercearia > molho de tomate": "Molhos, temperos e condimentos",
  "mercearia > molho e extrato de tomate": "Molhos, temperos e condimentos",
  "mercearia > shoyu": "Molhos, temperos e condimentos",
  "mercearia > maionese e ketchup": "Molhos, temperos e condimentos",
  "mercearia > temperos": "Molhos, temperos e condimentos",
  "mercearia > pao de queijo e salgados": "Padaria, salgados e pratos prontos",
  "mercearia > pao de alho": "Padaria, salgados e pratos prontos",
  "mercearia > pratos prontos": "Padaria, salgados e pratos prontos",
  // Proteínas (legado) desmembrada
  "proteinas > frango": "Aves",
  "proteinas > empanados": "Aves",
  "proteinas > peixe": "Peixes e frutos do mar",
  "proteinas > camarao": "Peixes e frutos do mar",
  "proteinas > caranguejo": "Peixes e frutos do mar",
  "proteinas > frutos do mar": "Peixes e frutos do mar",
  "proteinas > frutos do mar empanados": "Peixes e frutos do mar",
  "proteinas > linguica": "Embutidos e frios",
  "proteinas > bacon": "Embutidos e frios",
  "proteinas > salsicha": "Embutidos e frios",
  "proteinas > hamburguer": "Embutidos e frios",
  "proteinas > suino": "Suínos",
};
const LEGACY_DEFAULT: Record<string, Cat> = {
  mercearia: "Mercearia",
  proteinas: "Carnes bovinas",
  hortifruti: "Hortifruti",
  "bebidas destiladas": "Destilados, vinhos e bar",
  "cervejas e chopes": "Cervejas e chopes",
  "refrigerantes e energeticos": "Bebidas não alcoólicas",
};

// ---------- Palavras-chave (ordem importa: a primeira que casar vence) ----------
const KEYWORDS: [Cat, RegExp][] = [
  ["Cervejas e chopes", /\b(cervejas?|chopp|chopes?|brahma|original|heineken|amstel|spaten|corona|skol|antarctica|budweiser|stella)\b/],
  ["Destilados, vinhos e bar", /\b(destilado|vodka|whisky|gin\b|cachaca|licor|vinho|espumante|aperol|campari|saque|xarope|rum|tequila|bitter)/],
  ["Bebidas não alcoólicas", /\b(agua|tonica|guarana|refrigerante|coca|fanta|h2oh|energetico|red bull|suco|bebidas em geral|agua de coco|nectar)\b/],
  ["Limpeza e higiene", /\b(desinfetante|detergente|secante|limpa|papel higienico|papel toalha|sabao|esponja|rodo|alvejante|sanitaria)/],
  ["Descartáveis e embalagens", /\b(copo|canudo|marmita|saco|garfo|faca|luva|insulfilme|filme|guardanapo|perflex|embalage|talher|\d+ ?ml e \d+ ?ml)/],
  ["Gelo, carvão e insumos", /\b(gelo|carvao|co2|recarga)\b/],
  ["Sobremesas e doces", /\b(cereja|cobertura|corante|picole|sorvete|pudim|brownie|rapadura|frutas secas|doce de leite|geladinho|petit|crepe)/],
  ["Padaria, salgados e pratos prontos", /\b(massa de pastel|pao de queijo|pao de alho|lasanha|salgado|coxinha|empada|pastel)/],
  ["Peixes e frutos do mar", /\b(pirarucu|peixe|camarao|tilapia|salmao|pescada|lula|polvo|mexilhao|caranguejo|manjubinha|bacalhau)/],
  ["Embutidos e frios", /\b(linguica|bacon|calabresa|presunto|apresuntado|salsicha|mortadela|salame|toscana)/],
  ["Suínos", /\b(suin[ao]|costelinha|toucinho|pernil|lombo suino|leitoa)/],
  ["Aves", /\b(frango|coxa|sobrecoxa|peito com osso|asa|moela|passarinho|coracao de frango|peru|chester)/],
  ["Carnes bovinas", /\b(alcatra|contrafile|coxao|cupim|lagarto|maminha|picanha|file mignon|fraldinha|acem|patinho|musculo|costela|capa do file|cortes|carne|bovin)/],
  ["Laticínios e queijos", /\b(catupiry|cheddar|queijo|mussarela|requeijao|manteiga|margarina|leite|iogurte|nata|cream cheese)/],
  ["Molhos, temperos e condimentos", /\b(acafrao|chimichurri|colorau|oregano|tempero|molho|shoyu|ketchup|maionese|mostarda|sal de|cominho|louro|pimenta do reino|alho descascado|alho frito)/],
  ["Polpas e congelados", /\b(polpa|congelad|batata palito|seleta|iqf)\b/],
  ["Mercearia", /\b(azeitona|palmito|conserva|cogumelo|pimenta biquinho|tomate seco|kit feijoada|batata palha|arroz|feijao|acucar|cafe|farinha|macarrao|azeite|oleo|vinagre|castanha|biscoito|geleia|coco ralado|milho verde lata|ervilha lata|extrato)/],
  ["Hortifruti", /\b(abacaxi|abobora|alface|batatinha|batata|brocolis|cebola|cenoura|cheiro|couve|jilo|limao|mandioca|manjericao|maxixe|milho|ovo|pimenta de cheiro|pimentao|quiabo|repolho|rucula|tomate|vermelho e amarelo|banana|laranja|maca|uva|melancia|melao|mamao|manga|alho|verdura|legume|fruta|hortalica|salsa|coentro|hortela|espinafre|agriao)/],
];

function byKeywords(name: string): Cat | null {
  const n = norm(name);
  for (const [cat, re] of KEYWORDS) if (re.test(n)) return cat;
  return null;
}

async function main() {
  const file = process.argv[2] ?? `${process.env.HOME}/Downloads/cotaja-backup-2026-11-16.json`;
  const legacy = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as { produtos: { nome: string; unidade: string; categoria?: string; familia?: string }[] }) : null;
  const familyOf = new Map<string, string>();
  for (const p of legacy?.produtos ?? []) familyOf.set(`${norm(p.nome)}|${norm(p.unidade)}`, `${norm(p.categoria ?? "")} > ${norm(p.familia ?? "")}`);
  console.log(`Catálogo legado: ${familyOf.size} itens com família\n`);

  // 1. Categorias
  const { data: existing } = await db.from("product_categories").select("id, name, normalized_name");
  const idByNorm = new Map((existing ?? []).map((c) => [c.normalized_name, c.id]));
  const catId = new Map<Cat, string>();
  for (const [i, name] of CATEGORIES.entries()) {
    const n = norm(name);
    let id = idByNorm.get(n);
    if (id) {
      await db.from("product_categories").update({ name, sort_order: (i + 1) * 10 }).eq("id", id);
    } else {
      const { data, error } = await db.from("product_categories").insert({ name, sort_order: (i + 1) * 10 }).select("id").single();
      if (error) throw new Error(`categoria ${name}: ${error.message}`);
      id = data.id;
    }
    catId.set(name, id);
  }

  // 2. Canônicos
  const { data: canon } = await db.from("canonical_products").select("id, name, unit");
  const canonCat = new Map<string, Cat>();
  const unmatchedCanon: string[] = [];
  for (const c of canon ?? []) {
    const fam = familyOf.get(`${norm(c.name)}|${norm(c.unit)}`);
    let cat: Cat | null = null;
    // Higiene vem antes da família do legado (lá "papel higiênico" estava em Descartáveis)
    if (/\b(papel higienico|papel toalha)\b/.test(norm(c.name))) cat = "Limpeza e higiene";
    else if (fam) {
      const legacyCat = fam.split(" > ")[0];
      cat = FAMILY[fam] ?? byKeywordsIfSpecific(c.name, legacyCat) ?? LEGACY_DEFAULT[legacyCat] ?? null;
    }
    cat ??= byKeywords(c.name);
    if (cat) canonCat.set(c.id, cat);
    else unmatchedCanon.push(c.name);
  }

  // Dentro de "Proteínas", espetinhos/recortes mistos: deixa a palavra-chave decidir antes do padrão bovino
  function byKeywordsIfSpecific(name: string, legacyCat: string): Cat | null {
    if (legacyCat !== "proteinas") return null;
    const n = norm(name);
    if (/\b(frango|asa|meio da asa)\b/.test(n)) return "Aves";
    if (/\b(suin[ao]|costelinha|toucinho|pernil)\b/.test(n)) return "Suínos";
    if (/\b(linguica|bacon|calabresa|salsicha)\b/.test(n)) return "Embutidos e frios";
    if (/\b(queijo coalho)\b/.test(n) && /\bfrango\b/.test(n)) return "Aves";
    return null;
  }

  // 3. Produtos
  const products: { id: string; name: string; canonical_id: string | null; suppliers: { name: string } | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("products").select("id, name, canonical_id, suppliers(name)").order("id").range(from, from + 999);
    if (error) throw new Error(error.message);
    products.push(...((data ?? []) as unknown as typeof products));
    if (!data || data.length < 1000) break;
  }
  const productCat = new Map<string, Cat>();
  const unmatched: { name: string; supplier: string }[] = [];
  for (const p of products ?? []) {
    const cat = (p.canonical_id ? canonCat.get(p.canonical_id) : null) ?? byKeywords(p.name);
    if (cat) productCat.set(p.id, cat);
    else unmatched.push({ name: p.name, supplier: (p.suppliers as { name: string } | null)?.name ?? "" });
  }

  // 4. Aplica em lotes por categoria
  const apply = async (table: "canonical_products" | "products", map: Map<string, Cat>) => {
    const groups = new Map<Cat, string[]>();
    for (const [id, cat] of map) groups.set(cat, [...(groups.get(cat) ?? []), id]);
    for (const [cat, ids] of groups) {
      for (let i = 0; i < ids.length; i += 200) {
        const { error } = await db.from(table).update({ category_id: catId.get(cat)! }).in("id", ids.slice(i, i + 200));
        if (error) throw new Error(`${table}/${cat}: ${error.message}`);
      }
    }
  };
  await apply("canonical_products", canonCat);
  await apply("products", productCat);

  // 5. Remove categorias antigas que ficaram sem uso
  const usedIds = new Set(productCat.values().map((c) => catId.get(c)!));
  const keep = new Set(catId.values());
  const removable = (existing ?? []).filter((c) => !keep.has(c.id) && !usedIds.has(c.id));
  if (removable.length) await db.from("product_categories").delete().in("id", removable.map((c) => c.id));

  // 6. Relatório
  const dist = new Map<Cat, number>();
  for (const cat of productCat.values()) dist.set(cat, (dist.get(cat) ?? 0) + 1);
  console.log("Distribuição (produtos por fornecedor):");
  for (const name of CATEGORIES) console.log(`  ${String(dist.get(name) ?? 0).padStart(4)}  ${name}`);
  console.log(`\n  canônicos classificados: ${canonCat.size}/${canon?.length ?? 0}`);
  console.log(`  produtos classificados: ${productCat.size}/${products?.length ?? 0}`);
  if (removable.length) console.log(`  categorias antigas removidas: ${removable.map((c) => c.name).join(", ")}`);
  if (unmatchedCanon.length) console.log(`\n  ✖ canônicos sem categoria: ${unmatchedCanon.join(" | ")}`);
  if (unmatched.length) console.log(`\n  ✖ produtos sem categoria:\n${unmatched.map((u) => `    - ${u.name} [${u.supplier}]`).join("\n")}`);

  if (!existsSync(".local")) mkdirSync(".local");
  const rows = (products ?? []).map((p) => `"${p.name.replace(/"/g, '""')}","${((p.suppliers as { name: string } | null)?.name ?? "").replace(/"/g, '""')}","${productCat.get(p.id) ?? ""}"`);
  writeFileSync(".local/categorias-atribuidas.csv", "produto,fornecedor,categoria\n" + rows.join("\n") + "\n");
  console.log(`\nRevisão: .local/categorias-atribuidas.csv · Depois clique em "Atualizar dados" no admin.`);
}

main().catch((e: unknown) => {
  console.error("\n✖ Falhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
