import { ago, fromPb } from './dates.js'

/* 1 234 567 → «1,2 MB»; 85 000 → «85 KB» */
export function sizeLabel(bytes) {
  if (!bytes) return ''
  return bytes > 1e6 ? (bytes / 1e6).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(bytes / 1e3)) + ' KB'
}

/* Minutos de lectura de una nota (unas 200 palabras por minuto, mínimo 1) */
export function readingTime(text) {
  const words = String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
  return `${Math.max(1, Math.round(words / 200))} min de lectura`
}

function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/*
 * Apuntes de PocketBase → la forma que ya usa la app (la de APUNTES en seed.js). `size` es lo que se enseña debajo del
 * título según el tipo; `file` y `collectionId` hacen falta para pedir el PDF. Más nuevos primero.
 */
export function toApuntes(records, uid, now) {
  return [...records]
    .sort((a, b) => fromPb(b.created) - fromPb(a.created))
    .map(a => ({
      id: a.id,
      collectionId: a.collectionId,
      subject: a.asignatura || null,
      tema: a.tema || 'Sin tema',
      type: a.type,
      title: a.title,
      author: a.expand?.author?.name || 'Alguien',
      mine: a.author === uid,
      date: ago(a.created, now),
      size: a.type === 'pdf' ? sizeLabel(a.bytes) || 'PDF' : a.type === 'enlace' ? hostname(a.url) : readingTime(a.body),
      url: a.type === 'enlace' ? a.url : undefined,
      body: a.body || '',
      file: a.file || '',
      downloads: a.downloads || 0,
    }))
}

/* Reglas de subida (las de verdad las aplica PocketBase: tipo PDF y 20 MB) */
export const MAX_PDF = 20 * 1024 * 1024
export function checkApunte({ type, title, url, body, file }) {
  if (title.trim().length < 3) return 'El título necesita al menos 3 caracteres.'
  if (type === 'enlace' && !/^https?:\/\/\S+\.\S+/.test(url.trim())) return 'Pon un enlace completo, que empiece por https://'
  if (type === 'nota' && !body.trim()) return 'Escribe el texto de la nota.'
  if (type === 'pdf') {
    if (!file) return 'Elige un PDF.'
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return 'Tiene que ser un PDF.'
    if (file.size > MAX_PDF) return `Ocupa ${sizeLabel(file.size)}: el máximo son 20 MB.`
  }
  return null
}
