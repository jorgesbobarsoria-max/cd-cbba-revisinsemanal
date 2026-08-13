const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function normalizarBase64(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("El informe recibido no tiene un formato válido");
  }

  let base64 = value.trim();
  const comma = base64.indexOf(",");
  if (base64.startsWith("data:") && comma >= 0) base64 = base64.slice(comma + 1);

  try {
    if (base64.includes("%")) base64 = decodeURIComponent(base64);
  } catch {
    throw new Error("El informe recibido está dañado. Intenta generarlo nuevamente");
  }

  base64 = base64
    .replace(/[\r\n\t]/g, "")
    .replace(/ /g, "+")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const firstPadding = base64.indexOf("=");
  if (firstPadding >= 0) base64 = base64.slice(0, firstPadding);
  base64 += "=".repeat((4 - (base64.length % 4)) % 4);

  if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new Error("El informe recibido está dañado. Intenta generarlo nuevamente");
  }

  return base64;
}

export function descargarDocx(base64Value: unknown, filename: string): void {
  const base64 = normalizarBase64(base64Value);
  const chunks: ArrayBuffer[] = [];
  const chunkSize = 32_768;

  for (let offset = 0; offset < base64.length; offset += chunkSize) {
    const chunk = base64.slice(offset, offset + chunkSize);
    const binary = window.atob(chunk);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    chunks.push(bytes.buffer);
  }

  const blob = new Blob(chunks, { type: DOCX_MIME });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}