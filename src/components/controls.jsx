import { subjectVars } from '../data/subjects.js'
import { cx } from '../lib/cx.js'
import { Icon } from './Icon.jsx'
import { Sigil } from './Sigil.jsx'

/* Pill interactiva: navegación y filtros. Seleccionado = invertido. */
export function Pill({ selected, current, toggle, icon, subject, count, variant, children, className, as, style, ...rest }) {
  const on = !!(selected || current)
  const Tag = as || (rest.href ? 'a' : 'button')
  const attrs = {
    ...rest,
    className: cx('na-pill', variant === 'ghost' && 'na-pill--ghost', subject && 'na-pill--subject', on && 'is-on', className),
    style: { ...subjectVars(subject), ...style },
  }
  if (current) attrs['aria-current'] = 'page'
  if (toggle) attrs['aria-pressed'] = !!selected
  if (Tag === 'button' && !attrs.type) attrs.type = 'button'
  return (
    <Tag {...attrs}>
      {subject ? <Sigil subject={subject} size={12} tone="current" /> : null}
      {icon ? <Icon name={icon} size={18} /> : null}
      {children}
      {count != null ? <span className="na-pill-count">{count}</span> : null}
    </Tag>
  )
}

export function Button({ variant = 'primary', size, icon, iconRight, children, className, subject, block, label, style, ...rest }) {
  const iconOnly = icon && !children
  const Tag = rest.href ? 'a' : 'button'
  const attrs = {
    ...rest,
    className: cx('na-btn', `na-btn--${variant}`, size === 'lg' && 'na-btn--lg', iconOnly && 'na-btn--icon', block && 'na-btn--block', className),
    style: { ...subjectVars(subject), ...style },
  }
  if (iconOnly) attrs['aria-label'] = label
  if (Tag === 'button' && !attrs.type) attrs.type = 'button'
  return (
    <Tag {...attrs}>
      {icon ? <Icon name={icon} size={size === 'lg' ? 20 : 18} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={18} /> : null}
    </Tag>
  )
}

export function Tabs({ items = [], value, onChange, label, className }) {
  return (
    <div className={cx('na-tabs', className)} role="tablist" aria-label={label}>
      {items.map(it => {
        const sel = it.id === value
        return (
          <button
            key={it.id} type="button" role="tab" className="na-tab" aria-selected={sel} tabIndex={sel ? 0 : -1}
            onClick={onChange ? () => onChange(it.id) : undefined}
          >
            {it.icon ? <Icon name={it.icon} size={18} /> : null}
            {it.label}
            {it.count != null ? <span className="na-pill-count">{it.count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

/* Marcar una entrega como hecha */
export function DoneToggle({ done, subject, title = '', onChange, className }) {
  const on = !!done
  return (
    <button
      type="button" className={cx('na-done', on && 'is-on', className)} style={subjectVars(subject)}
      aria-pressed={on} aria-label={(on ? 'Hecha: ' : 'Marcar como hecha: ') + title}
      onClick={onChange ? () => onChange(!on) : undefined}
    >
      <span className="na-done-box"><Icon name="check" size={16} strokeWidth={3} /></span>
    </button>
  )
}

export function VoteCounter({ count = 0, voted, static: isStatic, onUp, onDown, className }) {
  if (isStatic) {
    return (
      <span className="na-vote na-vote--static" aria-label={count + ' votos'}>
        <Icon name="up" size={16} strokeWidth={2.6} />
        <span className="na-vote-num">{count}</span>
      </span>
    )
  }
  return (
    <div className={cx('na-vote', className)} role="group" aria-label="Votos">
      <button type="button" className={cx('na-vote-btn', voted === 'up' && 'is-on')} aria-pressed={voted === 'up'} aria-label="Votar a favor" onClick={onUp}>
        <Icon name="up" size={22} strokeWidth={2.4} />
      </button>
      <span className="na-vote-num" aria-live="polite">{count}</span>
      <button type="button" className={cx('na-vote-btn', voted === 'down' && 'is-on')} aria-pressed={voted === 'down'} aria-label="Votar en contra" onClick={onDown}>
        <Icon name="down" size={22} strokeWidth={2.4} />
      </button>
    </div>
  )
}
