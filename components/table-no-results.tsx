import { TableCell, TableRow } from "@/components/ui/table";

/** Linha única exibida quando o filtro não encontra nada. */
export function TableNoResults({ colSpan, message = "Nenhum resultado para essa busca." }: { colSpan: number; message?: string }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-10 text-center text-sm whitespace-normal text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}
