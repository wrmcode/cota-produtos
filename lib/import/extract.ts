import "server-only";
import * as XLSX from "xlsx";
import { extractWithAnthropic } from "@/lib/import/providers/anthropic";
import { extractWithGemini } from "@/lib/import/providers/gemini";
import { getAiProvider } from "@/lib/ai-provider";
import { type ExtractionOutcome, type ImportPart } from "@/lib/import/schema";

export * from "@/lib/import/schema";
import { UNITS } from "@/types/schemas";

export interface ImportSource {
  text: string;
  files: { name: string; type: string; buffer: Buffer }[];
}

export interface ExtractionContext {
  suppliers: {
    id: string;
    name: string;
    city: string | null;
    supplier_type: string | null;
  }[];
  categories: { id: string; name: string }[];
  today: string;
}

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const SHEET_EXT = /\.(xlsx|xlsm|xls|csv|ods)$/i;
const MAX_SHEET_ROWS = 2000;

/** Converte planilhas em CSV por aba (texto é mais barato e mais fiel do que imagem). */
function sheetToText(name: string, buffer: Buffer): string {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const parts: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
    const lines = csv
      .split("\n")
      .filter((l) => l.replace(/,/g, "").trim() !== "");
    if (lines.length === 0) continue;
    const limited = lines.slice(0, MAX_SHEET_ROWS);
    parts.push(
      `### Arquivo: ${name} · Aba: ${sheetName}${lines.length > MAX_SHEET_ROWS ? ` (primeiras ${MAX_SHEET_ROWS} linhas)` : ""}\n${limited.join("\n")}`,
    );
  }
  return parts.join("\n\n");
}

/** Monta as partes neutras: planilhas e CSV viram texto; imagens e PDFs vão como anexos base64. */
export function buildParts(source: ImportSource): ImportPart[] {
  const parts: ImportPart[] = [];
  const texts: string[] = [];

  for (const f of source.files) {
    const isCsv = f.type === "text/csv" || /\.csv$/i.test(f.name);
    if (IMAGE_TYPES.has(f.type)) {
      parts.push({
        kind: "image",
        mimeType: f.type as Extract<ImportPart, { kind: "image" }>["mimeType"],
        base64: f.buffer.toString("base64"),
      });
    } else if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
      parts.push({
        kind: "pdf",
        name: f.name,
        base64: f.buffer.toString("base64"),
      });
    } else if (
      SHEET_EXT.test(f.name) ||
      isCsv ||
      f.type.includes("spreadsheet") ||
      f.type.includes("excel")
    ) {
      texts.push(sheetToText(f.name, f.buffer));
    } else if (f.type.startsWith("text/") || /\.(txt|md)$/i.test(f.name)) {
      texts.push(`### Arquivo: ${f.name}\n${f.buffer.toString("utf8")}`);
    } else {
      throw new Error(
        `Tipo de arquivo não suportado: ${f.name} (${f.type || "desconhecido"})`,
      );
    }
  }

  if (source.text.trim()) texts.push(`### Texto colado\n${source.text.trim()}`);
  if (texts.length) parts.push({ kind: "text", text: texts.join("\n\n") });
  return parts;
}

export function systemPrompt(ctx: ExtractionContext): string {
  const suppliers = ctx.suppliers
    .map(
      (s) =>
        `- ${s.id} | ${s.name}${s.city ? ` (${s.city})` : ""}${s.supplier_type ? ` · ${s.supplier_type}` : ""}`,
    )
    .join("\n");
  const categories = ctx.categories
    .map((c) => `- ${c.id} | ${c.name}`)
    .join("\n");
  return `Você extrai listas de preços de fornecedores de alimentos e insumos para restaurantes (Brasil) e as converte em dados estruturados.

Regras:
- Cada item é um produto com preço unitário. Ignore cabeçalhos, totais, frete, condições de pagamento e itens sem preço.
- Preços em reais. "R$ 12,50" vira 12.5. Se houver preço por kg e por caixa, prefira a unidade que o fornecedor usa para vender (normalmente a menor) e registre a outra em notes.
- Nome do produto: limpo, sem código interno, mantendo marca e peso quando fizerem parte do item (ex.: "Polpa de manga Nutricau (pct 20 × 100 g)").
- Unidade: use as abreviações ${UNITS.join(", ")} quando couber; caso contrário algo curto como "caixa c/ 12" ou "fardo c/ 6".
- Categoria: escolha o id mais adequado da lista; null se não tiver certeza.
- Fornecedor: tente identificar pelo cabeçalho, logo, nome do arquivo ou texto. Só preencha supplier_id se corresponder claramente a um da lista; sempre preencha supplier_name com o que estiver na fonte.
- Data: só preencha quote_date se a fonte indicar a data da tabela. Hoje é ${ctx.today}.
- Não invente itens. Em dúvida, registre em warnings.

Fornecedores cadastrados (id | nome):
${suppliers}

Categorias (id | nome):
${categories}`;
}

/** Chama o provedor configurado e devolve a extração validada. Lança erro com mensagem amigável em falhas. */
export async function extractQuotes(
  source: ImportSource,
  ctx: ExtractionContext,
): Promise<ExtractionOutcome> {
  const parts = buildParts(source);
  if (parts.length === 0)
    throw new Error("Envie um texto ou ao menos um arquivo.");

  const provider = getAiProvider();
  if (provider === "gemini") return extractWithGemini(parts, systemPrompt(ctx));
  if (provider === "anthropic")
    return extractWithAnthropic(parts, systemPrompt(ctx));
  throw new Error(
    "Nenhum provedor de IA configurado (GEMINI_API_KEY ou ANTHROPIC_API_KEY).",
  );
}
