/* Lógica pura de las dudas (sin React), para el store y los tests */

export function dudaStatus(d) {
  if (d.accepted) return 'resuelta'
  return d.answers.length ? 'abierta' : 'sin-responder'
}

export function voteDelta(v) {
  return v === 'up' ? 1 : v === 'down' ? -1 : 0
}

/*
 * Junta las dudas de ejemplo con lo que ha hecho la persona: sus dudas, respuestas, votos,
 * respuestas aceptadas, ediciones y borradas. `edits[id]` pisa los campos editables; `deleted[id]` la quita.
 */
export function mergeDudas({ seed, own = [], answers = {}, accepted = {}, votes = {}, edits = {}, deleted = {} }) {
  return [...own, ...seed]
    .filter(base => !deleted[base.id])
    .map(base => {
      const d = edits[base.id] ? { ...base, ...edits[base.id] } : base
      const list = [...d.answers, ...(answers[d.id] || [])].map(a => ({
        ...a,
        votes: a.votes + voteDelta(votes[`${d.id}:${a.id}`]),
        myVote: votes[`${d.id}:${a.id}`] || null,
      }))
      const acc = accepted[d.id] !== undefined ? accepted[d.id] : d.accepted
      const full = { ...d, answers: list, accepted: acc, votes: d.votes + voteDelta(votes[d.id]), myVote: votes[d.id] || null }
      return { ...full, status: dudaStatus(full) }
    })
}

/* Campos que se pueden editar de una duda (el resto: votos, respuestas, autor… no) */
export const EDITABLE = ['subject', 'title', 'body', 'code', 'tags']

export function pickEditable(fields) {
  return Object.fromEntries(EDITABLE.filter(k => k in fields).map(k => [k, fields[k]]))
}
