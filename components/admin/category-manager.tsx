"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { createCategory, deleteCategory, renameCategory } from "@/actions/categories";
import { Field } from "@/components/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/search-input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CategoryWithCount } from "@/lib/queries/categories";
import { matchesSearch } from "@/lib/search";

export function CategoryManager({ categories }: { categories: CategoryWithCount[] }) {
  const [newName, setNewName] = useState("");
  const [filter, setFilter] = useState("");
  const [pending, startTransition] = useTransition();

  const visible = categories.filter((c) => matchesSearch(filter, [c.name]));

  const add = () =>
    startTransition(async () => {
      const res = await createCategory({ name: newName });
      if (res.ok) {
        toast.success(res.message);
        setNewName("");
      } else {
        toast.error(res.error);
      }
    });

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/5 sm:flex-row sm:items-end"
      >
        <Field label="Nova categoria" className="flex-1" hint="Nomes são comparados sem acentos/maiúsculas: “Carne” e “carnes” não são iguais, revise antes de criar.">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: Carnes" />
        </Field>
        <Button type="submit" disabled={pending || newName.trim().length < 2}>
          <Plus />
          Adicionar
        </Button>
      </form>

      <section className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/5">
        <header className="flex flex-col gap-3 px-4 pt-4 pb-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:pt-5 sm:pb-4">
          <div>
            <h2 className="font-heading text-base font-semibold">Categorias</h2>
            <p className="text-xs text-muted-foreground">{categories.length} cadastrada(s)</p>
          </div>
          <SearchInput value={filter} onChange={setFilter} placeholder="Buscar categoria…" className="sm:w-64" />
        </header>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4 sm:pl-5">Nome</TableHead>
              <TableHead className="text-right">Produtos</TableHead>
              <TableHead className="pr-4 text-right sm:pr-5">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((c) => (
              <CategoryRow key={c.id} category={c} all={categories} />
            ))}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma categoria encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

function CategoryRow({ category, all }: { category: CategoryWithCount; all: CategoryWithCount[] }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await renameCategory(category.id, { name });
      if (res.ok) {
        toast.success(res.message);
        setEditing(false);
      } else {
        toast.error(res.error);
      }
    });

  return (
    <TableRow>
      <TableCell className="pl-4 whitespace-normal sm:pl-5">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="flex max-w-sm items-center gap-1.5"
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <Button type="submit" size="icon-sm" aria-label="Salvar" disabled={pending || name.trim().length < 2}>
              <Check />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Cancelar"
              onClick={() => {
                setName(category.name);
                setEditing(false);
              }}
            >
              <X />
            </Button>
          </form>
        ) : (
          <span className="font-medium">{category.name}</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Badge variant="secondary" className="rounded-full tabular-nums">{category.productCount}</Badge>
      </TableCell>
      <TableCell className="pr-4 text-right sm:pr-5">
        <div className="inline-flex gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Renomear" onClick={() => setEditing(true)} disabled={editing}>
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Remover" onClick={() => setConfirmDelete(true)}>
            <Trash2 />
          </Button>
        </div>
        <DeleteCategoryDialog category={category} all={all} open={confirmDelete} onOpenChange={setConfirmDelete} />
      </TableCell>
    </TableRow>
  );
}

function DeleteCategoryDialog({
  category,
  all,
  open,
  onOpenChange,
}: {
  category: CategoryWithCount;
  all: CategoryWithCount[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const others = all.filter((c) => c.id !== category.id);
  const [moveTo, setMoveTo] = useState("");
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      const res = await deleteCategory(category.id, moveTo || undefined);
      if (res.ok) {
        toast.success(res.message);
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remover “{category.name}”?</DialogTitle>
          <DialogDescription>
            {category.productCount > 0
              ? `${category.productCount} produto(s) usam esta categoria. Escolha para onde movê-los ou deixe-os sem categoria.`
              : "Nenhum produto usa esta categoria."}
          </DialogDescription>
        </DialogHeader>
        {category.productCount > 0 && others.length > 0 && (
          <Field label="Mover produtos para">
            <NativeSelect value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
              <option value="">Deixar sem categoria</option>
              {others.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </NativeSelect>
          </Field>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={remove} disabled={pending}>
            {pending ? "Removendo..." : "Remover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
