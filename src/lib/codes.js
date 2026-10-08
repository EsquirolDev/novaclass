/* «xyzw 2345» → «XYZW-2345» mientras se escribe (el servidor acepta el código escrito como sea) */
export function formatCode(text) {
  const raw = String(text)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
  return raw.length > 4 ? raw.slice(0, 4) + '-' + raw.slice(4) : raw
}
