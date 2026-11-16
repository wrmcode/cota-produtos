/**
 * Smoke test: faz login real com cada usuário de teste (via Supabase) e abre
 * todas as páginas do papel no servidor Next local, verificando status e erros.
 *
 *   npm run dev            (em outro terminal)
 *   npm run smoke          (usa BASE_URL, padrão http://localhost:3000)
 */
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const projectRef = new URL(url).hostname.split(".")[0];

const CASES = [
  { email: "admin@teste.com", password: "admin123", pages: ["/admin", "/admin/fornecedores", "/admin/fornecedores/novo", "/admin/clientes", "/admin/clientes/novo", "/admin/produtos", "/admin/categorias"], forbidden: "/cliente" },
  { email: "fornecedor@teste.com", password: "fornecedor123", pages: ["/fornecedor", "/fornecedor/produtos"], forbidden: "/admin" },
  { email: "cliente@teste.com", password: "cliente123", pages: ["/cliente", "/cliente?q=frango", "/cliente/fornecedores", "PRODUCT_LINK"], forbidden: "/fornecedor" },
];

/** Monta o cookie no formato do @supabase/ssr (base64 + chunks de 3180 chars). */
function sessionCookie(session: object): string {
  const name = `sb-${projectRef}-auth-token`;
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const MAX = 3180;
  if (value.length <= MAX) return `${name}=${value}`;
  const chunks: string[] = [];
  for (let i = 0; i * MAX < value.length; i++) chunks.push(`${name}.${i}=${value.slice(i * MAX, (i + 1) * MAX)}`);
  return chunks.join("; ");
}

async function fetchPage(path: string, cookie?: string) {
  const t0 = performance.now();
  const res = await fetch(BASE_URL + path, { headers: cookie ? { cookie } : {}, redirect: "manual" });
  const body = res.status === 200 ? await res.text() : "";
  const location = res.headers.get("location") ?? "";
  const errors = [
    body.includes("Only plain objects") && "plain objects",
    body.includes("unstable value") && "Date.now() prerender",
    body.includes("could not finish this Suspense boundary") && "Suspense boundary",
    body.includes("Application error") && "Application error",
  ].filter(Boolean) as string[];
  const ms = Math.round(performance.now() - t0);
  return { status: res.status, location, errors, body, ms };
}

let failures = 0;
function report(ok: boolean, label: string, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "  ✔" : "  ✖"} ${label}${detail ? ` — ${detail}` : ""}`);
}

console.log(`Servidor: ${BASE_URL}\n`);

console.log("Sem sessão:");
{
  const r = await fetchPage("/admin");
  report(r.status === 307 && r.location.includes("/login"), "/admin redireciona para /login", `${r.status} → ${r.location}`);
  const l = await fetchPage("/login");
  report(l.status === 200 && l.body.includes("Bem-vindo de volta"), "/login renderiza");
}

for (const c of CASES) {
  console.log(`\n${c.email}:`);
  const sb = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email: c.email, password: c.password });
  if (error || !data.session) {
    report(false, "login", error?.message);
    continue;
  }
  const cookie = sessionCookie(data.session);

  for (let p of c.pages) {
    if (p === "PRODUCT_LINK") {
      const home = await fetchPage("/cliente", cookie);
      const m = home.body.match(/href="\/cliente\?produto=([^"&]+)"/);
      if (!m) { report(false, "/cliente?produto=… (link de produto no card)", "nenhum link encontrado"); continue; }
      p = `/cliente?produto=${m[1]}`;
      const r = await fetchPage(p, cookie);
      const cards = (r.body.match(/economia até|fornecedor\(es\)/g) ?? []).length;
      report(r.status === 200 && r.errors.length === 0 && r.body.includes("Mostrando só:"), p, r.status !== 200 ? `${r.status}` : `${cards > 0 ? "card único renderizado" : "sem card"}`);
      continue;
    }
    const r = await fetchPage(p, cookie);
    report(r.status === 200 && r.errors.length === 0, p, r.status !== 200 ? `${r.status} → ${r.location}` : [r.errors.join(", "), `${r.ms} ms`].filter(Boolean).join(" · "));
  }
  const f = await fetchPage(c.forbidden, cookie);
  report(f.status === 307, `${c.forbidden} (outro papel) bloqueado`, `${f.status} → ${f.location}`);
  const home = await fetchPage("/", cookie);
  report(home.status === 307 && home.location.includes(c.pages[0].split("?")[0]), "/ redireciona para a home do papel", `${home.status} → ${home.location}`);
}

console.log(failures ? `\n✖ ${failures} falha(s)` : "\n✔ tudo ok");
process.exit(failures ? 1 : 0);
