import { useEffect, useState } from 'react'

/* Mismo punto de corte que app.css: por debajo de 860 px es la versión móvil */
const MOBILE = '(max-width: 860px)'

export function useIsMobile() {
  const [on, setOn] = useState(() => window.matchMedia(MOBILE).matches)
  useEffect(() => {
    const mq = window.matchMedia(MOBILE)
    const fn = () => setOn(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return on
}
