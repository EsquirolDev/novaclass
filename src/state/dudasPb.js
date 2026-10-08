import { useCallback, useEffect, useMemo, useRef } from 'react'
import { voteTarget } from '../lib/dudasData.js'
import { pb } from '../lib/pb.js'
import { pickEditable } from './dudas.js'

/*
 * Dudas contra PocketBase para el curso cargado (las de sus asignaturas que la persona puede ver) (state.qa = { dudas, answers, votes } en crudo, como llegan).
 * Votar y aceptar se ven al momento y se deshacen si fallan; preguntar, responder y editar esperan al servidor
 * (devuelven una promesa) porque necesitan el registro que crea. Las borradas se marcan con deleted para poder
 * deshacer. En tiempo real llegan las dudas, respuestas y votos de los demás.
 */
export const QA_EXPAND = { dudas: 'author', answers: 'author' }

export async function loadQa(cursoId) {
  const byCurso = pb.filter('duda.asignatura.curso = {:c}', { c: cursoId })
  const [dudas, answers, votes] = await Promise.all([
    pb
      .collection('dudas')
      .getFullList({ filter: pb.filter('asignatura.curso = {:c}', { c: cursoId }), expand: QA_EXPAND.dudas, sort: '-created' }),
    pb.collection('answers').getFullList({ filter: byCurso, expand: QA_EXPAND.answers, sort: 'created' }),
    pb.collection('votes').getFullList({ filter: byCurso }),
  ])
  return { dudas, answers, votes }
}

const upsert = (list, rec) => [...list.filter(x => x.id !== rec.id), rec]
const without = (list, id) => list.filter(x => x.id !== id)

export function useDudasPb({ state, setState, uid, setSaveError }) {
  const ready = state.status === 'ready'
  const cursoId = ready ? state.curso.id : null
  const stateRef = useRef(state)
  stateRef.current = state
  const queues = useRef({})

  /* Cambia una de las listas crudas (dudas, answers o votes) */
  const edit = useCallback(
    (kind, fn) => setState(s => (s.status !== 'ready' || s.curso.id !== cursoId ? s : { ...s, qa: { ...s.qa, [kind]: fn(s.qa[kind]) } })),
    [setState, cursoId],
  )
  const fail = useCallback(() => setSaveError('No se ha podido guardar. Revisa la conexión y vuelve a intentarlo.'), [setSaveError])
  /* Una cola por clave: los cambios de una misma cosa se envían en orden */
  const enqueue = (k, run) => {
    queues.current[k] = (queues.current[k] || Promise.resolve()).then(run)
    return queues.current[k]
  }
  const addDuda = useCallback(
    async ({ subject, title, body = '', code = '', tags = [] }) => {
      const rec = await pb
        .collection('dudas')
        .create({ asignatura: subject, author: uid, title, body, code, tags }, { expand: QA_EXPAND.dudas })
      edit('dudas', l => upsert(l, rec))
      return rec.id
    },
    [uid, edit],
  )

  const editDuda = useCallback(
    async (id, fields) => {
      const f = pickEditable(fields)
      if ('subject' in f) {
        f.asignatura = f.subject
        delete f.subject
      }
      const rec = await pb.collection('dudas').update(id, { ...f, edited: true }, { expand: QA_EXPAND.dudas })
      edit('dudas', l => upsert(l, rec))
    },
    [edit],
  )

  /* Borrar (deleted) y deshacer: se ven al momento */
  const setDeleted = useCallback(
    (id, deleted) => {
      const before = stateRef.current.qa.dudas.find(d => d.id === id)
      if (before) edit('dudas', l => upsert(l, { ...before, deleted }))
      return enqueue('duda:' + id, async () => {
        const rec = await pb.collection('dudas').update(id, { deleted }, { expand: QA_EXPAND.dudas })
        edit('dudas', l => upsert(l, rec))
      }).catch(() => {
        if (before) edit('dudas', l => upsert(l, before))
        fail()
      })
    },
    [edit, fail],
  )

  const addAnswer = useCallback(
    async (dudaId, body) => {
      const rec = await pb.collection('answers').create({ duda: dudaId, author: uid, body }, { expand: QA_EXPAND.answers })
      edit('answers', l => upsert(l, rec))
    },
    [uid, edit],
  )

  const acceptAnswer = useCallback(
    (dudaId, answerId) => {
      const before = stateRef.current.qa.dudas.find(d => d.id === dudaId)
      if (!before) return
      edit('dudas', l => upsert(l, { ...before, accepted: answerId }))
      enqueue('duda:' + dudaId, () => pb.collection('dudas').update(dudaId, { accepted: answerId })).catch(() => {
        edit('dudas', l => upsert(l, before))
        fail()
      })
    },
    [edit, fail],
  )

  /*
   * Votar: el mismo voto otra vez lo quita; el contrario lo cambia. Se ve al momento. Cada envío lleva el servidor al
   * estado que hay en pantalla en ese momento (serverVotes guarda lo que hay de verdad), así que da igual cuántos
   * clics rápidos haya: al final coinciden.
   */
  const serverVotes = useRef({})
  useEffect(() => {
    serverVotes.current = {}
    for (const v of stateRef.current.qa?.votes || []) if (v.user === uid) serverVotes.current[v.duda + ':' + (v.answer || '')] = v
  }, [cursoId, uid])

  const vote = useCallback(
    (voteKey, dir) => {
      const { duda, answer } = voteTarget(voteKey)
      const k = duda + ':' + answer
      const value = dir === 'up' ? 1 : -1
      const isMine = v => v.user === uid && v.duda === duda && (v.answer || '') === answer
      const shown = () => stateRef.current.qa.votes.find(isMine)
      const prev = shown()
      edit('votes', l => {
        const rest = l.filter(v => !isMine(v))
        if (prev && prev.value === value) return rest
        return [...rest, prev ? { ...prev, value } : { id: 'tmp-' + k, user: uid, duda, answer, value }]
      })
      enqueue('vote:' + k, async () => {
        const col = pb.collection('votes')
        const want = shown()
        const have = serverVotes.current[k]
        if (!want && have) {
          await col.delete(have.id)
          delete serverVotes.current[k]
        } else if (want && !have) {
          const rec = await col.create({ user: uid, duda, answer, value: want.value })
          serverVotes.current[k] = rec
          edit('votes', l => [...l.filter(v => !isMine(v)), { ...rec, value: shown()?.value ?? rec.value }])
        } else if (want && have && want.value !== have.value) {
          serverVotes.current[k] = await col.update(have.id, { value: want.value })
        }
      }).catch(() => {
        const have = serverVotes.current[k]
        edit('votes', l => [...l.filter(v => !isMine(v)), ...(have ? [have] : [])])
        fail()
      })
    },
    [uid, edit, fail],
  )

  /* Tiempo real: lo de los demás (lo propio ya está en pantalla); los borrados, de cualquiera */
  useEffect(() => {
    if (!cursoId) return undefined
    let alive = true
    const offs = []
    const keep = off => (alive ? offs.push(off) : off())
    const inClass = dudaId => stateRef.current.qa?.dudas.some(d => d.id === dudaId)
    const listen = (name, owner, belongs, expand) =>
      pb
        .collection(name)
        .subscribe(
          '*',
          ({ action, record }) => {
            if (action === 'delete') return edit(name, l => without(l, record.id))
            if (!belongs(record) || record[owner] === uid) return
            edit(name, l => upsert(l, record))
          },
          expand ? { expand } : undefined,
        )
        .then(keep, () => {})
    listen('dudas', 'author', r => stateRef.current.asignaturas?.some(a => a.id === r.asignatura), QA_EXPAND.dudas)
    listen('answers', 'author', r => inClass(r.duda), QA_EXPAND.answers)
    listen('votes', 'user', r => inClass(r.duda))
    return () => {
      alive = false
      offs.forEach(off => off())
    }
  }, [cursoId, uid, edit])

  /*
   * PocketBase no avisa en tiempo real cuando un cambio hace invisible una duda (al borrarla, deja de estar permitida
   * para los demás). Por eso, al volver a la pestaña y cada minuto, se comprueba qué dudas siguen existiendo (solo ids).
   */
  useEffect(() => {
    if (!cursoId) return undefined
    async function resync() {
      if (document.visibilityState === 'hidden') return
      const alive = await pb
        .collection('dudas')
        .getFullList({ fields: 'id', filter: pb.filter('asignatura.curso = {:c}', { c: cursoId }) })
        .catch(() => null)
      if (!alive) return
      const ids = new Set(alive.map(x => x.id))
      edit('dudas', l => (l.every(d => ids.has(d.id)) ? l : l.filter(d => ids.has(d.id))))
    }
    const t = setInterval(resync, 60000)
    document.addEventListener('visibilitychange', resync)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', resync)
    }
  }, [cursoId, edit])

  /* Visita a una duda: una vez por sesión y duda; el servidor suma y devuelve la cifra */
  const visit = useCallback(
    id => {
      const key = 'novaclass:visita:' + id
      try {
        if (sessionStorage.getItem(key)) return
        sessionStorage.setItem(key, '1')
      } catch {
        /* sin almacenamiento: se cuenta igual */
      }
      pb.send(`/api/novaclass/dudas/${id}/visita`, { method: 'POST' })
        .then(({ views }) => edit('dudas', l => l.map(d => (d.id === id ? { ...d, views } : d))))
        .catch(() => {})
    },
    [edit],
  )

  return useMemo(
    () => ({
      addDuda,
      editDuda,
      deleteDuda: id => setDeleted(id, true),
      restoreDuda: id => setDeleted(id, false),
      addAnswer,
      acceptAnswer,
      vote,
      visit,
    }),
    [addDuda, editDuda, setDeleted, addAnswer, acceptAnswer, vote, visit],
  )
}
