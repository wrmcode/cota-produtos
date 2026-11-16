"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileUp,
  Link2,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  commitImport,
  extractImport,
  getSupplierProductOptions,
  type CommitSummary,
} from "@/actions/import";
import { CategoryCombobox } from "@/components/category-combobox";
import { SupplierCombobox } from "@/components/customer/supplier-combobox";
import { Field } from "@/components/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL, todayISO } from "@/lib/format";
import type { Extraction } from "@/lib/import/schema";
import type { ProductOption } from "@/lib/queries/admin";
import type { CategoryOption } from "@/lib/queries/categories";
import { normalizeText } from "@/lib/search";
import { cn } from "@/lib/utils";
import { UNITS } from "@/types/schemas";

interface SupplierOpt {
  id: string;
  name: string;
  city: string | null;
}

interface Row {
  key: string;
  include: boolean;
  name: string;
  unit: string;
  price: string;
  category_id: string;
  /** "" = criar produto novo; senão id de um produto existente do fornecedor */
  product_id: string;
  notes: string | null;
  /** como o vínculo foi definido: automático (nome igual) ou manual */
  matched: "exact" | "manual" | null;
}

const ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.gif,.xlsx,.xls,.xlsm,.csv,.ods,.txt,image/*,application/pdf";

function toInput(v: number): string {
  return Number.isFinite(v) ? v.toFixed(2).replace(".", ",") : "";
}
function parsePrice(v: string): number | null {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return v.trim() === "" || Number.isNaN(n) ? null : n;
}

/** Casa cada linha com o catálogo do fornecedor por nome normalizado (+ unidade quando possível). */
function autoMatch(rows: Row[], products: ProductOption[]): Row[] {
  const byName = new Map<string, ProductOption[]>();
  for (const p of products) {
    const list = byName.get(p.normalized_name) ?? [];
    list.push(p);
    byName.set(p.normalized_name, list);
  }
  return rows.map((r) => {
    if (r.matched === "manual") return r;
    const candidates = byName.get(normalizeText(r.name)) ?? [];
    const hit = candidates.find((p) => p.unit === r.unit) ?? candidates[0];
    return hit
      ? {
          ...r,
          product_id: hit.id,
          matched: "exact",
          unit: hit.unit,
          category_id: r.category_id || hit.category_id || "",
        }
      : { ...r, product_id: "", matched: null };
  });
}

export function ImportWizard({
  suppliers,
  categories,
}: {
  suppliers: SupplierOpt[];
  categories: CategoryOption[];
}) {
  const [step, setStep] = useState<"input" | "review" | "done">("input");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [meta, setMeta] = useState<{
    model: string;
    input: number;
    output: number;
  } | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [quoteDate, setQuoteDate] = useState(todayISO());
  const [rows, setRows] = useState<Row[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [summary, setSummary] = useState<CommitSummary | null>(null);

  // Ao trocar o fornecedor, recarrega o catálogo e refaz os vínculos automáticos
  // (função explícita em vez de effect: evita setState síncrono em useEffect).
  const requestId = useRef(0);
  const selectSupplier = (id: string) => {
    setSupplierId(id);
    const current = ++requestId.current;
    if (!id) {
      setProducts([]);
      setRows((prev) =>
        prev.map((r) =>
          r.matched === "exact" ? { ...r, product_id: "", matched: null } : r,
        ),
      );
      return;
    }
    setLoadingProducts(true);
    getSupplierProductOptions(id)
      .then((list) => {
        if (current !== requestId.current) return;
        setProducts(list);
        setRows((prev) =>
          autoMatch(
            prev.map((r) =>
              r.matched === "exact"
                ? { ...r, product_id: "", matched: null }
                : r,
            ),
            list,
          ),
        );
      })
      .catch(() =>
        toast.error("Não foi possível carregar os produtos do fornecedor"),
      )
      .finally(() => {
        if (current === requestId.current) setLoadingProducts(false);
      });
  };

  const extract = () =>
    startTransition(async () => {
      const fd = new FormData();
      fd.set("text", text);
      for (const f of files) fd.append("files", f);
      const res = await extractImport(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setExtraction(res.data);
      setMeta({ model: res.model, ...res.usage });
      setRows(
        res.data.items.map((it, i) => ({
          key: `${i}-${it.name}`,
          include: true,
          name: it.name,
          unit: it.unit,
          price: toInput(it.price),
          category_id:
            it.category_id && categories.some((c) => c.id === it.category_id)
              ? it.category_id
              : "",
          product_id: "",
          notes: it.notes,
          matched: null,
        })),
      );
      selectSupplier(
        res.data.supplier_id &&
          suppliers.some((s) => s.id === res.data.supplier_id)
          ? res.data.supplier_id
          : "",
      );
      setQuoteDate(res.data.quote_date ?? todayISO());
      setStep("review");
      if (res.data.items.length === 0)
        toast.warning("Nenhum item com preço foi encontrado.");
    });

  const update = (key: string, patch: Partial<Row>) =>
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  const remove = (key: string) =>
    setRows((prev) => prev.filter((r) => r.key !== key));

  const selected = useMemo(() => rows.filter((r) => r.include), [rows]);
  const invalid = selected.filter(
    (r) =>
      r.name.trim().length < 2 ||
      !r.unit.trim() ||
      parsePrice(r.price) === null,
  );
  const newCount = selected.filter((r) => !r.product_id).length;
  const canSave =
    Boolean(supplierId) &&
    selected.length > 0 &&
    invalid.length === 0 &&
    !pending;

  const save = () =>
    startTransition(async () => {
      const res = await commitImport({
        supplier_id: supplierId,
        quote_date: quoteDate,
        rows: selected.map((r) => ({
          product_id: r.product_id || undefined,
          name: r.name.trim(),
          unit: r.unit.trim(),
          category_id: r.category_id || undefined,
          price: parsePrice(r.price) ?? 0,
        })),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setSummary(res.summary ?? null);
      setStep("done");
    });

  const reset = () => {
    setStep("input");
    setText("");
    setFiles([]);
    setExtraction(null);
    setRows([]);
    setSummary(null);
    selectSupplier("");
    if (fileRef.current) fileRef.current.value = "";
  };

  if (step === "done") {
    return (
      <section className="rounded-2xl bg-card p-6 ring-1 ring-foreground/5 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-6" />
          </span>
          <h2 className="font-heading text-lg font-semibold">
            Cotação importada
          </h2>
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Cotações salvas</dt>
              <dd className="font-heading text-2xl font-semibold tabular-nums">
                {summary?.quotes ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Produtos novos</dt>
              <dd className="font-heading text-2xl font-semibold tabular-nums">
                {summary?.created ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Já existentes</dt>
              <dd className="font-heading text-2xl font-semibold tabular-nums">
                {summary?.reused ?? 0}
              </dd>
            </div>
          </dl>
          <p className="max-w-md text-sm text-muted-foreground">
            Os preços já valem no ranking dos clientes. Produtos novos entram
            sem unificação: revise em Produtos se precisar.
          </p>
          <Button onClick={reset}>
            <FileUp />
            Nova importação
          </Button>
        </div>
      </section>
    );
  }

  if (step === "input") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          extract();
        }}
        className="space-y-4"
      >
        <section className="space-y-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/5 sm:p-5">
          <Field
            label="Texto da lista de preços"
            hint="Cole a mensagem do WhatsApp, e-mail ou qualquer texto com produtos e preços."
          >
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder={
                "Ex.:\nPeito de frango kg 18,90\nCoxa e sobrecoxa kg 11,50\nOvo branco cx 30 dz 165,00"
              }
              disabled={pending}
            />
          </Field>

          <Field
            label="Arquivos"
            hint="Fotos (JPG/PNG/WebP), PDF, planilhas (XLSX/XLS/CSV) ou TXT. Até 10 arquivos de 20 MB."
          >
            <Input
              ref={fileRef}
              type="file"
              multiple
              accept={ACCEPT}
              disabled={pending}
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="h-auto py-1.5"
            />
          </Field>
          {files.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {files.map((f) => (
                <li key={`${f.name}-${f.size}`}>
                  <Badge
                    variant="secondary"
                    className="h-auto gap-1 rounded-full py-1"
                  >
                    {f.name}
                    <span className="text-muted-foreground">
                      · {(f.size / 1024).toFixed(0)} KB
                    </span>
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            O conteúdo é enviado para a API da Anthropic só para interpretação.
            Nada é salvo até você aprovar.
          </p>
          <Button
            type="submit"
            disabled={pending || (!text.trim() && files.length === 0)}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {pending ? "Interpretando…" : "Interpretar com IA"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <section className="space-y-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/5 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <Field
            label="Fornecedor"
            hint={
              extraction?.supplier_name
                ? `Na fonte aparece como “${extraction.supplier_name}”.`
                : "A fonte não identifica o fornecedor: escolha manualmente."
            }
          >
            <SupplierCombobox
              suppliers={suppliers}
              value={supplierId}
              onChange={selectSupplier}
              className="w-full"
            />
          </Field>
          <Field label="Data da cotação">
            <Input
              type="date"
              value={quoteDate}
              max={todayISO()}
              onChange={(e) => setQuoteDate(e.target.value)}
            />
          </Field>
        </div>

        {extraction && extraction.warnings.length > 0 && (
          <ul className="space-y-1 rounded-xl bg-warning/10 px-3 py-2 text-xs text-foreground">
            {extraction.warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                {w}
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          {rows.length} item(ns) interpretado(s)
          {meta &&
            ` · ${meta.model} · ${(meta.input / 1000).toFixed(1)}k tokens de entrada, ${(meta.output / 1000).toFixed(1)}k de saída`}
          {loadingProducts && " · carregando catálogo do fornecedor…"}
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/5">
        <header className="flex flex-col gap-2 px-4 pt-4 pb-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-heading text-base font-semibold">
              Conferência
            </h2>
            <p className="text-xs text-muted-foreground">
              Ajuste nome, unidade, categoria e preço. Em “Vincular a”, escolha
              um produto já cadastrado ou deixe criar um novo.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-brand"
              checked={rows.length > 0 && rows.every((r) => r.include)}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((r) => ({ ...r, include: e.target.checked })),
                )
              }
            />
            Selecionar todos
          </label>
        </header>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-4 sm:pl-5" />
              <TableHead className="min-w-64">Produto</TableHead>
              <TableHead className="min-w-32">Unidade</TableHead>
              <TableHead className="min-w-56">Categoria</TableHead>
              <TableHead className="min-w-28 text-right">Preço (R$)</TableHead>
              <TableHead className="min-w-64">Vincular a</TableHead>
              <TableHead className="pr-4 sm:pr-5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Nenhum item interpretado. Volte e tente com outra fonte.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => {
              const price = parsePrice(r.price);
              const bad =
                r.include &&
                (r.name.trim().length < 2 || !r.unit.trim() || price === null);
              return (
                <TableRow
                  key={r.key}
                  className={cn(
                    !r.include && "opacity-50",
                    bad && "bg-destructive/5",
                  )}
                >
                  <TableCell className="pl-4 align-top sm:pl-5">
                    <input
                      type="checkbox"
                      className="mt-2 size-4 accent-brand"
                      checked={r.include}
                      onChange={(e) =>
                        update(r.key, { include: e.target.checked })
                      }
                      aria-label={`Incluir ${r.name}`}
                    />
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    <Input
                      value={r.name}
                      onChange={(e) => update(r.key, { name: e.target.value })}
                      aria-label="Nome do produto"
                    />
                    {r.notes && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.notes}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <Input
                      value={r.unit}
                      list="import-units"
                      onChange={(e) => update(r.key, { unit: e.target.value })}
                      aria-label="Unidade"
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <CategoryCombobox
                      categories={categories}
                      value={r.category_id || null}
                      onChange={(id) =>
                        update(r.key, { category_id: id ?? "" })
                      }
                      placeholder="Sem categoria"
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <Input
                      inputMode="decimal"
                      value={r.price}
                      onChange={(e) => update(r.key, { price: e.target.value })}
                      className="text-right tabular-nums"
                      aria-label="Preço"
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <NativeSelect
                      value={r.product_id}
                      onChange={(e) => {
                        const id = e.target.value;
                        const p = products.find((x) => x.id === id);
                        update(r.key, {
                          product_id: id,
                          matched: "manual",
                          ...(p
                            ? {
                                unit: p.unit,
                                category_id:
                                  r.category_id || p.category_id || "",
                              }
                            : {}),
                        });
                      }}
                      disabled={!supplierId || loadingProducts}
                      aria-label="Vincular a produto existente"
                    >
                      <option value="">+ Criar produto novo</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} / {p.unit}
                          {!p.is_active ? " (inativo)" : ""}
                        </option>
                      ))}
                    </NativeSelect>
                    {r.product_id && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-success">
                        <Link2 className="size-3" />
                        {r.matched === "exact"
                          ? "Vínculo automático (nome igual)"
                          : "Vínculo manual"}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="pr-4 text-right align-top sm:pr-5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remover linha"
                      onClick={() => remove(r.key)}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <datalist id="import-units">
          {UNITS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:border-0 sm:bg-transparent sm:px-0">
        <p className="text-sm text-muted-foreground">
          {selected.length} selecionado(s) · {newCount} produto(s) novo(s)
          {selected.length > 0 &&
            ` · total ${formatBRL(selected.reduce((acc, r) => acc + (parsePrice(r.price) ?? 0), 0))}`}
          {invalid.length > 0 && (
            <span className="text-destructive">
              {" "}
              · {invalid.length} linha(s) com erro
            </span>
          )}
          {!supplierId && (
            <span className="text-destructive"> · escolha o fornecedor</span>
          )}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button
            variant="outline"
            onClick={() => setStep("input")}
            disabled={pending}
          >
            <ArrowLeft />
            Voltar
          </Button>
          <Button onClick={save} disabled={!canSave}>
            {pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
            {pending ? "Salvando…" : `Aprovar e salvar (${selected.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
