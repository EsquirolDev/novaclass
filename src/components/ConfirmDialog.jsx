import { useEffect, useId, useRef } from 'react'
import { Button } from './controls.jsx'
import { Icon } from './Icon.jsx'

/*
 * Pop-up de confirmación para acciones que no se pueden deshacer a la ligera (borrar).
 * Usa <dialog> nativo: atrapa el foco, Esc cancela y al cerrar el foco vuelve a lo que lo abrió.
 * El foco empieza en «Cancelar», para que un Enter sin querer no borre nada.
 */
export function ConfirmDialog({ open, title, children, confirmLabel, icon = 'trash', onConfirm, onCancel }) {
  const ref = useRef(null)
  const id = useId()
  useEffect(() => {
    const d = ref.current
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])
  return (
    <dialog
      ref={ref}
      className="nc-dialog"
      aria-labelledby={id + 't'}
      aria-describedby={id + 'd'}
      onCancel={e => {
        e.preventDefault()
        onCancel()
      }}
      onClick={e => e.target === ref.current && onCancel()}
    >
      {open ? (
        <div className="nc-dialog-box">
          <span className="nc-dialog-icon" aria-hidden="true">
            <Icon name={icon} size={24} />
          </span>
          <h2 id={id + 't'} className="na-t-title">
            {title}
          </h2>
          <p id={id + 'd'} className="nc-dialog-text">
            {children}
          </p>
          <div className="nc-dialog-actions">
            <Button variant="secondary" onClick={onCancel} autoFocus>
              Cancelar
            </Button>
            <Button variant="danger" icon={icon} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </dialog>
  )
}
