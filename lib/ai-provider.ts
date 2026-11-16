import "server-only";
import { env } from "@/lib/env";

export type AiProvider = "anthropic" | "gemini";

/**
 * Provedor usado na importação assistida. `AI_PROVIDER` força um; sem ele,
 * usa o Anthropic se houver chave, senão o Gemini (camada gratuita do AI Studio).
 */
export function getAiProvider(): AiProvider | null {
  if (env.AI_PROVIDER === "anthropic")
    return env.ANTHROPIC_API_KEY ? "anthropic" : null;
  if (env.AI_PROVIDER === "gemini") return env.GEMINI_API_KEY ? "gemini" : null;
  if (env.ANTHROPIC_API_KEY) return "anthropic";
  if (env.GEMINI_API_KEY) return "gemini";
  return null;
}

export function isAiImportEnabled(): boolean {
  return getAiProvider() !== null;
}
