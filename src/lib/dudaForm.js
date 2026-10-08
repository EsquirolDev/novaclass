/* Reglas del formulario de pregunta (nueva y editar) */

export const TITLE_MIN = 10
export const TITLE_MAX = 140
export const BODY_MIN = 20
export const TAGS_MAX = 3

/* «Joins, #SQL, joins» → ['joins', 'sql'] */
export function parseTags(text) {
  return [
    ...new Set(
      text
        .split(',')
        .map(t => t.trim().replace(/^#/, '').toLowerCase())
        .filter(Boolean),
    ),
  ]
}

/* Errores por campo (false si está bien) */
export function validateDuda({ subject, title, body, tags }) {
  return {
    subject: !subject && 'Elige la asignatura.',
    title: title.trim().length < TITLE_MIN && `El título necesita al menos ${TITLE_MIN} caracteres.`,
    body: body.trim().length < BODY_MIN && `Cuéntalo un poco más (mínimo ${BODY_MIN} caracteres).`,
    tags: tags.length > TAGS_MAX && `Máximo ${TAGS_MAX} etiquetas.`,
  }
}

/* Palabras de 4+ letras, sin tildes, para buscar dudas parecidas al título */
export function words(text) {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .match(/[a-z0-9]{4,}/g) || []
  )
}

/* Hasta 3 dudas que comparten palabras con el título, de la misma asignatura si ya está elegida */
export function similarDudas(dudas, title, subject, exceptId) {
  const ws = words(title)
  if (!ws.length) return []
  return dudas
    .filter(d => d.id !== exceptId && (!subject || d.subject === subject))
    .map(d => ({ d, score: words(d.title + ' ' + d.tags.join(' ')).filter(w => ws.includes(w)).length }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(x => x.d)
}
