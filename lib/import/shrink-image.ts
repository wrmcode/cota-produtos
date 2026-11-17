/**
 * Reduz fotos no navegador antes do upload da importação assistida.
 * Fotos de celular passam fácil de 5 MB (limite por imagem da API da Anthropic)
 * e os modelos reduzem a resolução de qualquer forma, então 2048 px no lado
 * maior em JPEG preserva a leitura de listas de preços e corta o upload.
 */
const MAX_EDGE = 2048;
const MAX_BYTES = 1.5 * 1024 * 1024;
const QUALITY = 0.85;
const RESIZABLE = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function shrinkImage(file: File): Promise<File> {
  if (!RESIZABLE.has(file.type)) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // formato que o navegador não decodifica: envia como está
  }

  try {
    const longEdge = Math.max(bitmap.width, bitmap.height);
    if (longEdge <= MAX_EDGE && file.size <= MAX_BYTES) return file;

    const scale = Math.min(1, MAX_EDGE / longEdge);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // Fundo branco: PNG com transparência viraria preto no JPEG.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: QUALITY,
    });
    if (blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
