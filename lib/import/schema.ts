import { z } from "zod";

/** Esquema do que o modelo devolve (structured outputs). Compartilhado pelos provedores. */
export const extractedItemSchema = z.object({
  name: z
    .string()
    .describe(
      "Nome do produto como aparece na fonte, limpo de códigos e ruído",
    ),
  unit: z
    .string()
    .describe(
      "Unidade de venda curta, ex.: kg, un, cx, 'caixa c/ 12', 'fardo c/ 6'",
    ),
  price: z
    .number()
    .describe("Preço unitário em reais, número com ponto decimal (ex.: 12.5)"),
  category_id: z
    .string()
    .nullable()
    .describe("id da categoria da lista fornecida, ou null"),
  notes: z
    .string()
    .nullable()
    .describe(
      "Observação curta se algo estiver ambíguo (marca, peso, promoção)",
    ),
});

export const extractionSchema = z.object({
  supplier_id: z
    .string()
    .nullable()
    .describe(
      "id do fornecedor da lista fornecida, se identificado com confiança; senão null",
    ),
  supplier_name: z
    .string()
    .nullable()
    .describe("Nome do fornecedor como aparece na fonte, ou null"),
  quote_date: z
    .string()
    .nullable()
    .describe("Data da cotação em YYYY-MM-DD se a fonte indicar; senão null"),
  items: z.array(extractedItemSchema),
  warnings: z
    .array(z.string())
    .describe("Avisos curtos sobre dúvidas ou dados ignorados"),
});

export type Extraction = z.infer<typeof extractionSchema>;
export type ExtractedItem = z.infer<typeof extractedItemSchema>;

/** Representação neutra do conteúdo; cada provedor converte para o seu formato. */
export type ImportPart =
  | { kind: "text"; text: string }
  | {
      kind: "image";
      mimeType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
      base64: string;
    }
  | { kind: "pdf"; name: string; base64: string };

export interface ExtractionOutcome {
  data: Extraction;
  usage: { input: number; output: number };
  model: string;
}

export const USER_INSTRUCTION =
  "Extraia todos os itens com preço desta fonte seguindo as regras.";
