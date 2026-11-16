import "server-only";
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url("NEXT_PUBLIC_SUPABASE_URL inválida"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY ausente"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY ausente"),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  /** Importação assistida (/admin/importar): basta UMA das chaves. Sem nenhuma, a página mostra aviso. */
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().min(1).default("claude-sonnet-5-5"),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  /** Força o provedor; sem ele usa Anthropic se houver chave, senão Gemini. */
  AI_PROVIDER: z.enum(["anthropic", "gemini"]).optional(),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || undefined,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || undefined,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || undefined,
  GEMINI_MODEL: process.env.GEMINI_MODEL || undefined,
  AI_PROVIDER: process.env.AI_PROVIDER || undefined,
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  const where = process.env.VERCEL
    ? "Cadastre-as em Vercel → Project → Settings → Environment Variables (Production e Preview) e refaça o deploy."
    : "Confira o arquivo .env (ou .env.local) na raiz do projeto — veja .env.example.";
  throw new Error(`Variáveis de ambiente ausentes ou inválidas:\n${issues}\n${where}`);
}

export const env = parsed.data;
