import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { env } from "@/lib/env";
import {
  extractionSchema,
  USER_INSTRUCTION,
  type ExtractionOutcome,
  type ImportPart,
} from "@/lib/import/schema";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY)
    throw new Error("ANTHROPIC_API_KEY não configurada");
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2 });
  return client;
}

function toBlocks(parts: ImportPart[]): Anthropic.ContentBlockParam[] {
  return parts.map((p): Anthropic.ContentBlockParam => {
    if (p.kind === "image")
      return {
        type: "image",
        source: { type: "base64", media_type: p.mimeType, data: p.base64 },
      };
    if (p.kind === "pdf")
      return {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: p.base64,
        },
        title: p.name,
      };
    return { type: "text", text: p.text };
  });
}

/** Extração via API da Anthropic (structured outputs). Modelo em ANTHROPIC_MODEL. */
export async function extractWithAnthropic(
  parts: ImportPart[],
  system: string,
): Promise<ExtractionOutcome> {
  const response = await getClient().messages.parse({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 16000,
    output_config: {
      effort: "medium",
      format: zodOutputFormat(extractionSchema),
    },
    system: [
      { type: "text", text: system, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: [...toBlocks(parts), { type: "text", text: USER_INSTRUCTION }],
      },
    ],
  });

  if (response.stop_reason === "refusal")
    throw new Error("O modelo recusou processar este conteúdo.");
  if (response.stop_reason === "max_tokens")
    throw new Error(
      "A fonte tem itens demais para uma única importação. Divida o arquivo e tente de novo.",
    );
  if (!response.parsed_output)
    throw new Error(
      "Não foi possível interpretar a resposta do modelo. Tente novamente.",
    );

  return {
    data: response.parsed_output,
    usage: {
      input:
        response.usage.input_tokens +
        (response.usage.cache_read_input_tokens ?? 0),
      output: response.usage.output_tokens,
    },
    model: response.model,
  };
}
