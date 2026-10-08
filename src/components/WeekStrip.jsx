import { cx } from '../lib/cx.js'
import { EventChip } from './display.jsx'
import { Sigil } from './Sigil.jsx'

/* days: [{ dow, long, date, today?, weekend?, events: EventChipProps[] }] */
export function WeekStrip({ days = [], compact, onSelect, onSelectDay }) {
  if (compact) {
    return (
      <div className="na-week na-week--compact" role="list" aria-label="Semana actual">
        {days.map(d => {
          const n = d.events.length
          return (
            <button
              key={d.date} type="button" role="listitem" className={cx('na-dayc', d.today && 'is-today')}
              aria-current={d.today ? 'date' : undefined}
              aria-label={d.long + ', ' + (n ? n + (n === 1 ? ' evento' : ' eventos') : 'sin eventos')}
              onClick={onSelectDay ? () => onSelectDay(d) : undefined}
            >
              <span className="na-day-dow">{d.dow}</span>
              <span className="na-day-num na-num">{d.date}</span>
              <span className="na-dayc-dots" aria-hidden="true">
                {d.events.filter(e => e.subject).map((e, i) => (
                  <Sigil key={i} subject={e.subject} size={9} variant={e.done ? 'outline' : 'solid'} />
                ))}
              </span>
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div className="na-week" role="list" aria-label="Semana actual">
      {days.map(d => (
        <div
          key={d.date} role="listitem" className={cx('na-day', d.today && 'is-today', d.weekend && 'is-weekend')}
          aria-current={d.today ? 'date' : undefined}
        >
          <div className="na-day-head">
            <span className="na-day-dow">{d.today ? 'Hoy' : d.dow}</span>
            <span className="na-day-num">{d.date}</span>
          </div>
          <div className="na-day-events">
            {d.events.length
              ? d.events.map((e, i) => (
                <EventChip key={e.id || i} {...e} compact onClick={onSelect ? () => onSelect(e) : undefined} />
              ))
              : <span className="na-day-empty">{d.weekend ? 'Libre' : 'Nada'}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
