import { useEffect, useState } from 'react'

/* Router mínimo por hash: #/ruta/param. Sin dependencias. */
function current() {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  return raw.startsWith('/') ? raw : '/' + raw
}

export function useRoute() {
  const [path, setPath] = useState(current)
  useEffect(() => {
    const on = () => {
      setPath(current())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return path
}

export function navigate(to) {
  window.location.hash = to
}

export function href(to) {
  return '#' + to
}

/* Devuelve los parámetros si `path` encaja con `pattern` (p. ej. '/dudas/:id'), si no null. */
export function match(pattern, path) {
  const a = pattern.split('/').filter(Boolean)
  const b = path.split('?')[0].split('/').filter(Boolean)
  if (a.length !== b.length) return null
  const params = {}
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i])
    else if (a[i] !== b[i]) return null
  }
  return params
}
