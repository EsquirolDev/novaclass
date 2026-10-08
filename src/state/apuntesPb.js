import { useCallback, useEffect, useMemo, useRef } from 'react'
import { pb } from '../lib/pb.js'
import { navigate } from '../lib/router.jsx'

/*
 * Apuntes contra PocketBase para la clase cargada (state.apuntesRaw, en crudo). Subir espera al servidor (el PDF va en
 * un FormData); abrir cuenta una descarga en el servidor (ruta /api/novaclass/apuntes/:id/abierto) y:
 * - PDF: pide un token de archivo (los PDF están protegidos) y lo abre en otra pestaña
 * - enlace: lo abre en otra pestaña
 * - nota: va a su pantalla (#/apuntes/:id), que es la que cuenta la lectura
 */
export const APUNTES_EXPAND = 'author,module'

export function loadApuntes(groupId) {
  return pb
    .collection('apuntes')
    .getFullList({ filter: pb.filter('group = {:g}', { g: groupId }), expand: APUNTES_EXPAND, sort: '-created' })
}

const upsert = (list, rec) => [...list.filter(x => x.id !== rec.id), rec]

export function useApuntesPb({ state, setState, uid }) {
  const groupId = state.status === 'ready' ? state.group.id : null
  const stateRef = useRef(state)
  stateRef.current = state
  const counted = useRef(new Set())

  const edit = useCallback(
    fn => setState(s => (s.status !== 'ready' || s.group.id !== groupId ? s : { ...s, apuntesRaw: fn(s.apuntesRaw) })),
    [setState, groupId],
  )

  const addApunte = useCallback(
    async ({ subject, tema, type, title, url = '', body = '', file = null }) => {
      const form = new FormData()
      const fields = { group: groupId, module: stateRef.current.moduleIds?.[subject] || '', author: uid, type, title, tema }
      for (const [k, v] of Object.entries(fields)) form.append(k, v)
      if (type === 'enlace') form.append('url', url.trim())
      if (type === 'nota') form.append('body', body.trim())
      if (type === 'pdf') {
        form.append('file', file)
        form.append('bytes', String(file.size))
      }
      const rec = await pb.collection('apuntes').create(form, { expand: APUNTES_EXPAND })
      edit(l => upsert(l, rec))
      return rec.id
    },
    [groupId, uid, edit],
  )

  /* Suma una descarga o lectura (una vez por sesión y apunte) y pone la cifra que devuelve el servidor */
  const count = useCallback(
    id => {
      if (counted.current.has(id)) return
      counted.current.add(id)
      pb.send(`/api/novaclass/apuntes/${id}/abierto`, { method: 'POST' })
        .then(({ downloads }) => edit(l => l.map(a => (a.id === id ? { ...a, downloads } : a))))
        .catch(() => counted.current.delete(id))
    },
    [edit],
  )

  const openApunte = useCallback(
    async a => {
      if (a.type === 'nota') return navigate('/apuntes/' + a.id)
      count(a.id)
      if (a.type === 'enlace') return window.open(a.url, '_blank', 'noopener')
      /* La pestaña se abre ya (si se espera al token, el navegador la bloquearía) y luego se le pone la dirección */
      const tab = window.open('', '_blank')
      try {
        const token = await pb.files.getToken()
        const url = pb.files.getURL({ id: a.id, collectionId: a.collectionId, collectionName: 'apuntes' }, a.file, { token })
        if (tab) tab.location.href = url
        else window.location.href = url
      } catch {
        tab?.close()
        throw new Error('No se ha podido abrir el PDF.')
      }
    },
    [count],
  )

  /* Tiempo real: los apuntes que suben o cambian los demás */
  useEffect(() => {
    if (!groupId) return undefined
    let alive = true
    let off = null
    pb.collection('apuntes')
      .subscribe(
        '*',
        ({ action, record }) => {
          if (action === 'delete') return edit(l => l.filter(a => a.id !== record.id))
          if (record.group !== groupId || record.author === uid) return
          edit(l => upsert(l, record))
        },
        { expand: APUNTES_EXPAND },
      )
      .then(
        fn => (alive ? (off = fn) : fn()),
        () => {},
      )
    return () => {
      alive = false
      off?.()
    }
  }, [groupId, uid, edit])

  return useMemo(() => ({ addApunte, openApunte, countApunte: count }), [addApunte, openApunte, count])
}
