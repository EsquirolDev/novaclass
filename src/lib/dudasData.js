import { ago, fromPb } from './dates.js'
import { dudaStatus } from '../state/dudas.js'

/*
 * Dudas, respuestas y votos de PocketBase → la forma que ya usan las pantallas (la de mergeDudas con los datos de
 * ejemplo). `mine` dice si es de quien ha entrado (por su cuenta, no por su nombre: puede haber dos iguales).
 * Las borradas (deleted) no salen. Más nuevas primero; las respuestas, en el orden en que llegaron.
 */
export function toDudas({ dudas, answers, votes, uid, teachers: teacherIds = [], now }) {
  const teachers = new Set(teacherIds)
  const name = rec => rec.expand?.author?.name || 'Alguien'
  const key = (duda, answer) => duda + ':' + (answer || '')
  const sum = {}
  const mineVote = {}
  for (const v of votes) {
    const k = key(v.duda, v.answer)
    sum[k] = (sum[k] || 0) + v.value
    if (v.user === uid) mineVote[k] = v.value > 0 ? 'up' : 'down'
  }
  const byDuda = {}
  for (const a of [...answers].sort((x, y) => fromPb(x.created) - fromPb(y.created))) (byDuda[a.duda] ||= []).push(a)

  return dudas
    .filter(d => !d.deleted)
    .sort((x, y) => fromPb(y.created) - fromPb(x.created))
    .map(d => {
      const list = (byDuda[d.id] || []).map(a => ({
        id: a.id,
        author: name(a),
        mine: a.author === uid,
        teacher: teachers.has(a.author),
        when: ago(a.created, now),
        votes: sum[key(d.id, a.id)] || 0,
        myVote: mineVote[key(d.id, a.id)] || null,
        body: a.body,
        code: a.code || '',
        after: a.after || '',
      }))
      const full = {
        id: d.id,
        subject: d.asignatura || null,
        title: d.title,
        body: d.body || '',
        code: d.code || '',
        tags: Array.isArray(d.tags) ? d.tags : [],
        views: d.views || 0,
        edited: !!d.edited,
        author: name(d),
        mine: d.author === uid,
        when: ago(d.created, now),
        accepted: d.accepted || null,
        votes: sum[key(d.id)] || 0,
        myVote: mineVote[key(d.id)] || null,
        answers: list,
      }
      return { ...full, status: dudaStatus(full) }
    })
}

/* «dudaId» o «dudaId:respuestaId» (la clave de votos de la app) → { duda, answer } */
export function voteTarget(voteKey) {
  const [duda, answer = ''] = String(voteKey).split(':')
  return { duda, answer }
}
