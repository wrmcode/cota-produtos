import { unzip, type Unzipped } from "fflate";

/**
 * Expande arquivos .zip no navegador antes do upload da importação assistida.
 * Cada entrada suportada vira um File comum (com o MIME inferido pela extensão),
 * assim as imagens passam pelo `shrinkImage` e o servidor não precisa saber de ZIP.
 */
const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xlsm: "application/vnd.ms-excel.sheet.macroEnabled.12",
  xls: "application/vnd.ms-excel",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  csv: "text/csv",
  txt: "text/plain",
};

/** Limite do conteúdo descompactado, contra "zip bombs". */
const MAX_UNZIPPED_BYTES = 200 * 1024 * 1024;

export function isZip(file: File): boolean {
  return (
    /\.zip$/i.test(file.name) ||
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed"
  );
}

function unzipAsync(data: Uint8Array): Promise<Unzipped> {
  return new Promise((resolve, reject) => {
    let total = 0;
    unzip(
      data,
      {
        filter: (f) => {
          total += f.originalSize;
          return total <= MAX_UNZIPPED_BYTES;
        },
      },
      (err, out) => (err ? reject(err) : resolve(out)),
    );
  });
}

export interface ExpandResult {
  files: File[];
  /** entradas ignoradas (tipo não suportado, pastas de sistema etc.) */
  skipped: string[];
}

/** Substitui cada .zip pelos arquivos suportados que ele contém; os demais passam direto. */
export async function expandZipFiles(input: File[]): Promise<ExpandResult> {
  const files: File[] = [];
  const skipped: string[] = [];

  for (const file of input) {
    if (!isZip(file)) {
      files.push(file);
      continue;
    }
    let entries: Unzipped;
    try {
      entries = await unzipAsync(new Uint8Array(await file.arrayBuffer()));
    } catch {
      throw new Error(`Não foi possível abrir ${file.name}.`);
    }
    for (const [path, bytes] of Object.entries(entries)) {
      if (path.endsWith("/")) continue; // pasta
      const name = path.split("/").pop() ?? path;
      if (path.startsWith("__MACOSX/") || name.startsWith(".")) continue;
      const ext = name.split(".").pop()?.toLowerCase() ?? "";
      const type = MIME_BY_EXT[ext];
      if (!type || bytes.length === 0) {
        skipped.push(name);
        continue;
      }
      files.push(new File([bytes as Uint8Array<ArrayBuffer>], name, { type }));
    }
  }

  return { files, skipped };
}
