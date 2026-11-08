export const TEXT_LIMIT = 256 * 1024;
export function decodeText(bytes: Uint8Array, total = bytes.length) {
  const bom =
    bytes[0] === 239 && bytes[1] === 187 && bytes[2] === 191
      ? "utf-8"
      : bytes[0] === 255 && bytes[1] === 254
        ? "utf-16le"
        : bytes[0] === 254 && bytes[1] === 255
          ? "utf-16be"
          : "";
  const encoding = bom || "utf-8";
  try {
    const text = new TextDecoder(encoding, { fatal: true }).decode(bytes, {
      stream: bytes.length < total,
    });
    if (/[\u0000-\u0008\u000b\u000e-\u001f]/.test(text)) return null;
    return { text, encoding, bom: !!bom, truncated: bytes.length < total };
  } catch {
    return null;
  }
}
export function encodeText(text: string, encoding = "utf-8", bom = false) {
  if (encoding === "utf-8") {
    const bytes = new TextEncoder().encode((bom ? "\uFEFF" : "") + text);
    return bytes;
  }
  if (!["utf-16le", "utf-16be"].includes(encoding))
    throw new Error("Unsupported text encoding.");
  const bytes = new Uint8Array((text.length + (bom ? 1 : 0)) * 2),
    view = new DataView(bytes.buffer),
    offset = bom ? 2 : 0,
    le = encoding === "utf-16le";
  if (bom) view.setUint16(0, 0xfeff, le);
  for (let i = 0; i < text.length; i++)
    view.setUint16(offset + i * 2, text.charCodeAt(i), le);
  return bytes;
}
export function workspaceFilePath(path: unknown) {
  if (
    typeof path !== "string" ||
    !path.trim() ||
    path.length > 512 ||
    path.includes("\0") ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.split("/").some((s) => s === ".." || s === "." || !s)
  )
    throw new Error(
      "Enter a relative file path without empty, dot or parent directory segments.",
    );
  return path;
}
