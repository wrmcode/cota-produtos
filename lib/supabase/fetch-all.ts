/**
 * O PostgREST do Supabase devolve no máximo 1.000 linhas por requisição
 * (configuração "Max rows" do projeto). Qualquer leitura de tabela/view que
 * possa passar disso precisa paginar. Use este helper em vez de `.select()` solto.
 *
 *   const rows = await fetchAll((from, to) =>
 *     supabase.from("products").select("*").order("id").range(from, to),
 *   );
 *
 * A consulta DEVE ter `order` estável para a paginação não repetir/pular linhas.
 */
export const PAGE_SIZE = 1000;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

export async function fetchAll<T>(page: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    out.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return out;
}
