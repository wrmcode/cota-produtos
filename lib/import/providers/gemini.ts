import "server-only";
import { GoogleGenAI, type Part } from "@google/genai";
import { z } from "zod";
import { env } from "@/lib/env";
import {
  extractionSchema,
  USER_INSTRUCTION,
  type ExtractionOutcome,
  type ImportPart,
} from "@/lib/import/schema";

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

function toParts(parts: ImportPart[]): Part[] {
  return parts.map((p): Part => {
    if (p.kind === "image")
      return { inlineData: { mimeType: p.mimeType, data: p.base64 } };
    if (p.kind === "pdf")
      return { inlineData: { mimeType: "application/pdf", data: p.base64 } };
    return { text: p.text };
  });
}

/**
 * JSON Schema aceito pelo Gemini: sem a chave `$schema` do Zod e com
 * `type: ["string", "null"]` reescrito como `anyOf`, a forma documentada.
 */
function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === "$schema") continue;
    if (k === "type" && Array.isArray(v)) {
      const types = v.filter((x) => x !== "null");
      if (types.length === 1 && v.length === 2) {
        out.anyOf = [{ type: types[0] }, { type: "null" }];
        continue;
      }
    }
    out[k] = toGeminiSchema(v);
  }
  return out;
}

function responseJsonSchema(): unknown {
  return toGeminiSchema(z.toJSONSchema(extractionSchema));
}

/** Extração via Gemini (AI Studio; tem camada gratuita). Modelo em GEMINI_MODEL. */
export async function extractWithGemini(
  parts: ImportPart[],
  system: string,
): Promise<ExtractionOutcome> {
  const response = await getClient().models.generateContent({
    model: env.GEMINI_MODEL,
    contents: [
      { role: "user", parts: [...toParts(parts), { text: USER_INSTRUCTION }] },
    ],
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      responseJsonSchema: responseJsonSchema(),
      maxOutputTokens: 16000,
    },
  });

  const finish = response.candidates?.[0]?.finishReason;
  if (finish === "SAFETY" || finish === "PROHIBITED_CONTENT")
    throw new Error("O modelo recusou processar este conteúdo.");
  if (finish === "MAX_TOKENS")
    throw new Error(
      "A fonte tem itens demais para uma única importação. Divida o arquivo e tente de novo.",
    );

  const text = response.text;
  if (!text)
    throw new Error("O modelo não devolveu conteúdo. Tente novamente.");

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      "A resposta do modelo não veio em JSON válido. Tente novamente.",
    );
  }
  const parsed = extractionSchema.safeParse(json);
  if (!parsed.success)
    throw new Error(
      `Resposta fora do formato esperado: ${parsed.error.issues[0]?.message ?? "erro"}`,
    );

  const u = response.usageMetadata;
  return {
    data: parsed.data,
    usage: {
      input: u?.promptTokenCount ?? 0,
      output: (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0),
    },
    model: response.modelVersion ?? env.GEMINI_MODEL,
  };
}
