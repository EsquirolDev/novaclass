import { useRef, useState } from 'react'
import { Button, EventChip, Icon, Pill, Sigil, SubjectTag, Tabs } from '../components/index.js'
import { allModulesOn, MODULE_ORDER, subjectOf, subjectVars } from '../data/subjects.js'
import { cx } from '../lib/cx.js'
import { addDays, DOWS, isoDate, longDate, MONTHS_SHORT, monthTitle, parseDate, sameDay, startOfWeek } from '../lib/dates.js'
import { useIsMobile } from '../lib/useMedia.js'
import {
  BREAK,
  blocksFor,
  classInfo,
  DAY_NAMES,
  DAY_SHORT,
  DAYS,
  dayEnd,
  SESSIONS,
  teacherNames,
  toHours,
  totalHours,
  trim,
  weeklyHours,
} from '../lib/schedule.js'
import { chip } from '../state/selectors.js'
import { useClase } from '../state/clase.jsx'
import { useStore } from '../state/store.jsx'
import CalendarioMovil from './CalendarioMovil.jsx'
import { AgendaRow, ClassBlock, Detail, NowLine, SinHorario } from './CalendarioPartes.jsx'

function query() {
  return new URLSearchParams(window.location.hash.split('?')[1] || '')
}

function initialDate() {
  const q = query()
  return q.get('d') ? parseDate(q.get('d')) : null
}

/* Escritorio y móvil son pantallas distintas: el móvil sigue el patrón de las apps de calendario (CalendarioMovil.jsx) */
export default function Calendario() {
  return useIsMobile() ? <CalendarioMovil /> : <CalendarioEscritorio />
}

function CalendarioEscritorio() {
  const { now, events } = useStore()
  const clase = useClase()
  const fromLink = initialDate()
  const [view, setView] = useState(() => (query().get('v') === 'horario' ? 'horario' : 'mes'))
  const [ref, setRef] = useState(fromLink || now)
  const [active, setActive] = useState(allModulesOn)
  /* Al entrar se abre el detalle de lo siguiente que toca */
  const [selId, setSelId] = useState(() => {
    const day = fromLink || now
    const first = events.find(e => e.type !== 'festivo' && !e.done && e.at >= day) || null
    return first && first.id
  })
  /* Lo que abrió el detalle, para devolverle el foco al cerrarlo */
  const trigger = useRef(null)
  const [focusDetail, setFocusDetail] = useState(false)
  function select(e) {
    trigger.current = document.activeElement
    setSelId(e.id)
    setFocusDetail(true)
  }
  function closeDetail() {
    setSelId(null)
    trigger.current?.focus()
  }
  const horario = view === 'horario'
  const sel = horario ? null : events.find(e => e.id === selId) || null
  const all = MODULE_ORDER.every(k => active[k])
  const visible = events.filter(e => !e.subject || active[e.subject])

  function toggle(k) {
    if (all) setActive(Object.fromEntries(MODULE_ORDER.map(s => [s, s === k])))
    else {
      const n = { ...active, [k]: !active[k] }
      setActive(MODULE_ORDER.some(s => n[s]) ? n : allModulesOn())
    }
  }
  function move(dir) {
    setRef(view === 'mes' ? new Date(ref.getFullYear(), ref.getMonth() + dir, 1) : addDays(ref, 7 * dir))
  }
  const mon = startOfWeek(ref)
  const sun = addDays(mon, 6)
  const title = horario
    ? `Horario de ${clase.curso?.name || '1.º DAW'}`
    : view === 'mes'
      ? monthTitle(ref)
      : `Semana del ${mon.getDate()}${mon.getMonth() !== sun.getMonth() ? ' ' + MONTHS_SHORT[mon.getMonth()] : ''} al ${sun.getDate()} ${MONTHS_SHORT[sun.getMonth()]}`

  return (
    <div className="nc-screen">
      <div className={cx('nc-split', 'nc-split--cal', !sel && 'is-single')}>
        <main className="nc-main nc-main--tight">
          <div className="nc-cal-bar">
            <Tabs
              label="Vista"
              value={view}
              onChange={setView}
              items={[
                { id: 'mes', label: 'Mes', icon: 'month' },
                { id: 'semana', label: 'Semana', icon: 'week' },
                { id: 'horario', label: 'Horario', icon: 'clock' },
              ]}
            />
            <div className="nc-cal-nav" hidden={horario}>
              <Button variant="secondary" icon="chevron-left" label="Anterior" onClick={() => move(-1)} />
              <Button variant="secondary" onClick={() => setRef(now)}>
                Hoy
              </Button>
              <Button variant="secondary" icon="chevron-right" label="Siguiente" onClick={() => move(1)} />
            </div>
          </div>
          <h1 className="na-t-display-xl nc-cal-title">{title}</h1>
          <div className="nc-filters" role="group" aria-label="Filtrar por asignatura">
            <Pill toggle selected={all} onClick={() => setActive(allModulesOn())}>
              Todas
            </Pill>
            <span className="nc-sep" aria-hidden="true" />
            {MODULE_ORDER.map(k => (
              <Pill key={k} toggle subject={k} selected={active[k] && !all} onClick={() => toggle(k)}>
                {subjectOf(k).code}
              </Pill>
            ))}
            {view === 'mes' ? (
              <div className="nc-legend nc-only-desktop" aria-hidden="true">
                <span>
                  <span className="na-chip na-chip--entrega" style={subjectVars(MODULE_ORDER[0])}>
                    <Sigil subject={MODULE_ORDER[0]} size={10} tone="current" />
                    Entrega
                  </span>
                </span>
                <span>
                  <span className="na-chip na-chip--examen" style={subjectVars(MODULE_ORDER[0])}>
                    <Icon name="flag" size={13} strokeWidth={2.4} />
                    Examen
                  </span>
                </span>
                <span>
                  <span className="na-chip is-done">
                    <Icon name="check" size={13} strokeWidth={2.6} />
                    <s>Hecha</s>
                  </span>
                </span>
              </div>
            ) : null}
          </div>
          {horario ? (
            <Horario now={now} active={active} />
          ) : (
            <div className="nc-scroll-x">
              {view === 'mes' ? (
                <MonthGrid refDate={ref} now={now} events={visible} sel={sel} onSel={select} />
              ) : (
                <WeekAgenda monday={mon} now={now} events={visible} sel={sel} onSel={select} />
              )}
            </div>
          )}
        </main>
        {sel ? <Detail event={sel} now={now} onClose={closeDetail} focusTitle={focusDetail} /> : null}
      </div>
    </div>
  )
}

function MonthGrid({ refDate, now, events, sel, onSel }) {
  const first = new Date(refDate.getFullYear(), refDate.getMonth(), 1)
  const start = startOfWeek(first)
  const last = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0)
  const weeks = Math.ceil((((first.getDay() + 6) % 7) + last.getDate()) / 7)
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i))
  return (
    <div className="nc-month" role="group" aria-label={monthTitle(refDate)}>
      {DOWS.map(d => (
        <div key={d} className="nc-dow">
          {d}
        </div>
      ))}
      {cells.map((d, i) => {
        const out = d.getMonth() !== refDate.getMonth()
        const today = sameDay(d, now)
        const evs = out ? [] : events.filter(e => e.date === isoDate(d))
        return (
          <div
            key={i}
            className={cx('nc-cell', out && 'out', i % 7 >= 5 && 'we', today && 'today')}
            aria-current={today ? 'date' : undefined}
          >
            <span className="d">{d.getDate()}</span>
            {evs.slice(0, 2).map(e => (
              <EventChip
                key={e.id}
                {...chip(e)}
                compact
                selected={sel && sel.id === e.id}
                onClick={e.subject ? () => onSel(e) : undefined}
              />
            ))}
            {evs.length > 2 ? <span className="more">+{evs.length - 2} más</span> : null}
          </div>
        )
      })}
    </div>
  )
}

/*
 * Semana como agenda: un día por fila con sus entregas y exámenes a tamaño de lectura.
 * Las clases no se repiten aquí (para eso está la vista Horario); solo se indica el horario del día.
 */
function WeekAgenda({ monday, now, events, sel, onSel }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  return (
    <div className="nc-agenda" role="list" aria-label="Semana">
      {days.map((d, i) => {
        const iso = isoDate(d)
        const today = sameDay(d, now)
        const evs = events.filter(e => e.date === iso)
        const holiday = evs.some(e => e.type === 'festivo')
        const items = evs.filter(e => e.type !== 'festivo').sort((x, z) => (x.time || '').localeCompare(z.time || ''))
        const blocks = i < 5 ? blocksFor(i + 1) : []
        const hours = holiday ? 'Festivo' : blocks.length ? `Clase de ${trim(blocks[0].start)} a ${trim(dayEnd(i + 1))}` : 'Sin clase'
        return (
          <div
            key={iso}
            role="listitem"
            className={cx('nc-aday', today && 'today', (i >= 5 || holiday) && 'off')}
            aria-current={today ? 'date' : undefined}
            aria-label={longDate(iso)}
          >
            <div className="dt">
              <span className="dow">{today ? 'Hoy' : DOWS[i]}</span>
              <b className="na-num">{d.getDate()}</b>
            </div>
            <div className="evs">
              <span className="hrs">{hours}</span>
              {items.length ? (
                items.map(e => <AgendaRow key={e.id} e={e} now={now} sel={sel} onSel={onSel} />)
              ) : (
                <span className="empty">{i >= 5 || holiday ? 'Libre' : 'Nada que entregar'}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* Horario semanal: filas = franjas, columnas = lunes a viernes. Datos de la clase (lib/schedule.js). */
function Horario({ now, active }) {
  const today = now.getDay()
  const h = now.getHours() + now.getMinutes() / 60
  const row = i => (!BREAK || i <= BREAK.after ? i + 2 : i + 3)
  if (!totalHours()) return <SinHorario />
  return (
    <div className="nc-horario-wrap">
      <NowLine now={now} />
      <div className="nc-scroll-x">
        <div className="nc-horario" role="group" aria-label="Horario semanal">
          <div style={{ gridRow: 1, gridColumn: 1 }} />
          {DAYS.map(d => (
            <div key={d} aria-hidden="true" className={cx('hd', d === today && 'today')} style={{ gridRow: 1, gridColumn: d + 1 }}>
              {DAY_SHORT[d]}
              <small>{dayEnd(d) ? `hasta ${trim(dayEnd(d))}` : 'sin clase'}</small>
            </div>
          ))}
          {SESSIONS.map((s, i) => (
            <div key={i} className="tm" style={{ gridRow: row(i), gridColumn: 1 }}>
              <b>{trim(s.start)}</b>
              {trim(s.end)}
            </div>
          ))}
          {BREAK ? (
            <div className="brkrow" style={{ gridRow: BREAK.after + 3, gridColumn: '1 / -1' }}>
              {BREAK.label} · {BREAK.start}–{BREAK.end}
            </div>
          ) : null}
          {DAYS.flatMap(d =>
            blocksFor(d, { free: true }).map(b => (
              <ClassBlock
                key={d + '-' + b.from}
                block={b}
                day={DAY_NAMES[d]}
                current={d === today && h >= toHours(b.start) && h < toHours(b.end)}
                className={cx(d === today && 'is-today', b.id && !active[b.id] && 'is-dim')}
                style={{ gridColumn: d + 1, gridRow: `${row(b.from)} / ${row(b.to) + 1}` }}
              />
            )),
          )}
        </div>
      </div>
      <section className="nc-hours" aria-labelledby="nc-hours-t">
        <div className="nc-hours-head">
          <h2 id="nc-hours-t" className="na-t-eyebrow na-muted">
            Módulos y profesorado
          </h2>
          <span className="na-num">
            <b>{totalHours()} h</b> a la semana
          </span>
        </div>
        <ul className="nc-hours-grid">
          {MODULE_ORDER.map(id => {
            const c = classInfo(id)
            const n = weeklyHours(id)
            return (
              <li key={id} className={cx(!active[id] && 'is-dim')} style={subjectVars(id)}>
                <div className="top">
                  <SubjectTag subject={id} />
                  <b className="na-num">{n} h</b>
                </div>
                <span className="nm">{c.name}</span>
                <small>{teacherNames(id).join(' · ')}</small>
                <span className="bar" role="img" aria-label={`${n} de ${totalHours()} horas semanales`}>
                  {Array.from({ length: n }, (_, i) => (
                    <i key={i} />
                  ))}
                </span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
