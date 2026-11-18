import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(6, "Mínimo de 6 caracteres"),
});

export const setPasswordSchema = z
  .object({
    password: z.string().min(8, "Mínimo de 8 caracteres"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "As senhas não conferem",
    path: ["confirm"],
  });

/** Campo numérico opcional vindo de <input>: "" → undefined, "1.234,56" → 1234.56 */
const optionalNumber = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return undefined;
  if (typeof v === "string") return Number(v.replace(/\./g, "").replace(",", "."));
  return v;
}, z.number("Informe um número").nonnegative("Não pode ser negativo").optional());

const optionalText = z.string().trim().optional();

export const SUPPLIER_TYPES = [
  "Açougue",
  "Frigorífico",
  "Hortifruti",
  "Frios e laticínios",
  "Peixaria",
  "Distribuidora",
  "Atacarejo",
  "Bebidas",
  "Polpas e sucos",
  "Padaria",
  "Mercearia",
  "Temperos",
  "Embalagens",
  "Limpeza",
  "Outro",
] as const;

/** Dados do fornecedor (criação e edição). */
export const supplierSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do fornecedor"),
  supplier_type: optionalText,
  min_order_kg: optionalNumber,
  min_order_brl: optionalNumber,
  payment_terms: optionalText,
  seller_name: z.string().trim().min(2, "Informe o vendedor que envia a cotação"),
  seller_whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v === "" || (v.length >= 10 && v.length <= 13), "WhatsApp inválido (use DDD + número)")
    .optional(),
  delivery_info: optionalText,
  notes: optionalText,
  /** Um por linha ou separados por vírgula. Vira `products` na criação. */
  products_text: optionalText,
});

/** Credenciais de acesso definidas pela equipe no cadastro manual. */
export const credentialsSchema = z.object({
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(6, "A senha precisa ter ao menos 6 caracteres"),
});

export const createSupplierSchema = supplierSchema.extend(credentialsSchema.shape);

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do estabelecimento"),
  full_name: z.string().trim().min(2, "Informe o nome do responsável"),
  business_type: optionalText,
  cnpj: optionalText,
  phone: optionalText,
  city: optionalText,
});

export const createCustomerSchema = customerSchema.extend(credentialsSchema.shape);

export const resetPasswordSchema = z.object({
  profile_id: z.uuid(),
  password: z.string().min(6, "A senha precisa ter ao menos 6 caracteres"),
});

/** Converte o textarea "Produtos que fornece" em nomes únicos. */
export function parseProductsText(text: string | undefined): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\n,;]+/)) {
    const name = raw.trim().replace(/\s+/g, " ");
    const key = name.toLowerCase();
    if (name.length >= 2 && !seen.has(key)) {
      seen.add(key);
      out.push(name);
    }
  }
  return out;
}

/** uuid opcional vindo de select/combobox: "" → undefined */
const optionalUuid = z.preprocess((v) => (v === "" || v === null ? undefined : v), z.uuid("Categoria inválida").optional());

export const productSchema = z.object({
  name: z.string().min(2, "Informe o nome do produto"),
  unit: z.string().min(1, "Informe a unidade"),
  category_id: optionalUuid,
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da categoria").max(60, "Máximo de 60 caracteres"),
});

export const quoteLineSchema = z.object({
  product_id: z.uuid(),
  price: z.coerce.number().nonnegative("Preço inválido"),
});

export const quotesSchema = z.object({
  quote_date: z.iso.date(),
  lines: z.array(quoteLineSchema).min(1, "Informe ao menos um preço"),
});

export const UNITS = ["kg", "g", "un", "cx", "dz", "l", "ml", "pct", "fd", "sc"] as const;
export const BUSINESS_TYPES = [
  "Restaurante",
  "Bar",
  "Lanchonete",
  "Padaria",
  "Pizzaria",
  "Hotel",
  "Outro",
] as const;

export type LoginInput = z.infer<typeof loginSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
export type SupplierInput = z.input<typeof supplierSchema>;
export type SupplierData = z.output<typeof supplierSchema>;
export type CreateSupplierInput = z.input<typeof createSupplierSchema>;
export type CustomerInput = z.input<typeof customerSchema>;
export type CreateCustomerInput = z.input<typeof createCustomerSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
export type ProductInput = z.input<typeof productSchema>;
export type CategoryInput = z.input<typeof categorySchema>;
export type QuotesInput = z.infer<typeof quotesSchema>;

/** Linha aprovada pelo admin na importação assistida. `product_id` vazio = criar produto novo. */
export const importRowSchema = z.object({
  product_id: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.uuid().optional()),
  name: z.string().trim().min(2, "Informe o nome do produto"),
  unit: z.string().trim().min(1, "Informe a unidade"),
  category_id: optionalUuid,
  price: z.coerce.number().nonnegative("Preço inválido"),
});

export const importCommitSchema = z.object({
  supplier_id: z.uuid("Escolha o fornecedor"),
  quote_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  rows: z.array(importRowSchema).min(1, "Nenhuma linha selecionada"),
});

export type ImportRowInput = z.input<typeof importRowSchema>;
export type ImportCommitInput = z.input<typeof importCommitSchema>;
