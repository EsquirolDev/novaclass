import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button, Icon, Pill, Sigil, Tabs } from '../components/index.js'
import { allModulesOn, MODULE_ORDER, subjectOf } from '../data/subjects.js'
import { cx } from '../lib/cx.js'
import { addDays, DOWS, isoDate, longDate, MONTHS_SHORT, monthTitle, parseDate, sameDay, startOfWeek } from '../lib/dates.js'
import { blocksFor, dayEnd, trim } from '../lib/schedule.js'
import { useStore } from '../state/store.jsx'
import { AgendaRow, Detail, HorarioDia, Sheet } from './CalendarioPartes.jsx'

/*
 * Calendario en móvil, con el patrón de las apps de calendario:
 * - Cabecera fija con el mes y una tira de la semana (como Apple Calendar y Fantastical). Al tocar el mes se
 *   despliega el mes entero; deslizar la tira cambia de semana.
 * - Debajo, una agenda continua por días (como la vista «Agenda» de Google Calendar): solo los días con algo,
 *   más hoy y el día que elijas. Al desplazarla, la tira sigue al día que tienes arriba.
 * - El detalle se abre en una hoja inferior; los filtros también, para no ocupar la pantalla.
 */

const WEEKS = 8 /* semanas de agenda que se cargan de golpe */

function query() {
  return new URLSearchParams(window.location.hash.split('?')[1] || '')
}

export default function CalendarioMovil() {
  const { now, events } = useStore()
  const todayIso = isoDate(now)
  const link = query().get('d')
  const [mode, setMode] = useState(() => (query().get('v') === 'horario' ? 'horario' : 'agenda'))
  const [picked, setPicked] = useState(link || todayIso) /* día elegido a mano: siempre sale en la agenda */
  const [focus, setFocus] = useState(link || todayIso) /* día que está arriba en la agenda: lo marca la tira */
  const [from, setFrom] = useState(link || todayIso) /* como la agenda de Google: empieza hoy; lo anterior, eligiéndolo */
  const [weeks, setWeeks] = useState(WEEKS)
  const [monthOpen, setMonthOpen] = useState(false)
  const [month, setMonth] = useState(() => parseDate(link || todayIso))
  const [active, setActive] = useState(allModulesOn)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selId, setSelId] = useState(null)
  const pending = useRef(null)
  const lock = useRef(0)

  const all = MODULE_ORDER.every(k => active[k])
  const nOn = MODULE_ORDER.filter(k => active[k]).length
  const visible = useMemo(() => events.filter(e => !e.subject || active[e.subject]), [events, active])
  const sel = events.find(e => e.id === selId) || null
  const to = isoDate(addDays(parseDate(from), weeks * 7 - 1))

  /* Días de la agenda agrupados por semana */
  const groups = useMemo(() => {
    const out = []
    for (let i = 0; i < weeks * 7; i++) {
      const d = addDays(parseDate(from), i)
      const iso = isoDate(d)
      const evs = visible.filter(e => e.date === iso)
      if (!evs.length && iso !== todayIso && iso !== picked) continue
      const mon = isoDate(startOfWeek(d))
      if (!out.length || out[out.length - 1].mon !== mon) out.push({ mon, days: [] })
      out[out.length - 1].days.push({ d, iso, evs })
    }
    return out
  }, [from, weeks, visible, todayIso, picked])

  /* Elegir un día: si está fuera de lo cargado, la agenda empieza en su semana; luego se desplaza hasta él */
  function pick(iso) {
    setPicked(iso)
    setFocus(iso)
    if (iso < from || iso > to) {
      setFrom(iso)
      setWeeks(WEEKS)
    }
    pending.current = iso
  }

  useLayoutEffect(() => {
    if (!pending.current) return
    const el = document.querySelector(`[data-day="${pending.current}"]`)
    pending.current = null
    if (!el) return
    lock.current = Date.now() + 700 /* que el desplazamiento suave no mueva la tira a medio camino */
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })

  /* La tira sigue al primer día visible debajo de la cabecera fija */
  useEffect(() => {
    if (mode !== 'agenda') return undefined
    const head = document.querySelector('.nc-mhead')
    const top = head ? head.getBoundingClientRect().bottom : 200
    const io = new IntersectionObserver(
      entries => {
        if (Date.now() < lock.current) return
        const hit = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (hit) setFocus(hit.target.dataset.day)
      },
      { rootMargin: `-${Math.round(top)}px 0px -60% 0px` },
    )
    document.querySelectorAll('[data-day]').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [mode, groups])

  function toggle(k) {
    if (all) setActive(Object.fromEntries(MODULE_ORDER.map(s => [s, s === k])))
    else {
      const n = { ...active, [k]: !active[k] }
      setActive(MODULE_ORDER.some(s => n[s]) ? n : allModulesOn())
    }
  }

  const focusDate = parseDate(focus)
  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(focusDate), i))

  return (
    <div className="nc-screen nc-mcal">
      <div className="nc-mtop">
        <Tabs
          label="Vista"
          value={mode}
          onChange={setMode}
          items={[
            { id: 'agenda', label: 'Agenda', icon: 'week' },
            { id: 'horario', label: 'Horario', icon: 'clock' },
          ]}
        />
        <button
          type="button"
          className={cx('nc-mfilter', !all && 'is-on')}
          aria-label={all ? 'Filtrar por asignatura' : `Filtrar por asignatura (${nOn} elegidas)`}
          onClick={() => setFiltersOpen(true)}
        >
          <Icon name="filter" size={20} />
          {all ? null : <span className="na-num">{nOn}</span>}
        </button>
      </div>

      {mode === 'horario' ? (
        <div className="nc-pad">
          <HorarioDia now={now} active={active} />
        </div>
      ) : (
        <>
          <div className="nc-mhead">
            <div className="row">
              <button
                type="button"
                className="nc-mmonth-btn"
                aria-expanded={monthOpen}
                onClick={() => {
                  setMonth(focusDate)
                  setMonthOpen(o => !o)
                }}
              >
                {monthTitle(monthOpen ? month : focusDate)}
                <Icon name="down" size={18} strokeWidth={2.4} />
              </button>
              {monthOpen ? (
                <span className="nav">
                  <Button
                    variant="ghost"
                    icon="chevron-left"
                    label="Mes anterior"
                    onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                  />
                  <Button
                    variant="ghost"
                    icon="chevron-right"
                    label="Mes siguiente"
                    onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                  />
                </span>
              ) : null}
              {monthOpen ? null : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setMonthOpen(false)
                    pick(todayIso)
                  }}
                >
                  Hoy
                </Button>
              )}
            </div>
            {monthOpen ? (
              <MonthPicker
                month={month}
                now={now}
                events={visible}
                focus={focus}
                onPick={iso => {
                  setMonthOpen(false)
                  pick(iso)
                }}
              />
            ) : (
              <WeekStripM days={week} now={now} events={visible} focus={focus} onPick={pick} />
            )}
          </div>

          <div className="nc-pad nc-mag">
            {groups.map(g => {
              const mon = parseDate(g.mon)
              const sun = addDays(mon, 6)
              return (
                <section key={g.mon} className="nc-mweek" aria-label={`Semana del ${mon.getDate()} ${MONTHS_SHORT[mon.getMonth()]}`}>
                  <h2 className="wk">
                    {mon.getDate()} {mon.getMonth() !== sun.getMonth() ? MONTHS_SHORT[mon.getMonth()] + ' ' : ''}– {sun.getDate()}{' '}
                    {MONTHS_SHORT[sun.getMonth()]}
                  </h2>
                  {g.days.map(({ d, iso, evs }) => (
                    <AgendaDay key={iso} d={d} iso={iso} evs={evs} now={now} sel={sel} onSel={e => setSelId(e.id)} />
                  ))}
                </section>
              )
            })}
            <div className="nc-mmore">
              <p className="na-muted">Hasta el {longDate(to).toLowerCase()}.</p>
              <Button variant="secondary" icon="down" onClick={() => setWeeks(w => w + WEEKS)}>
                Ver más semanas
              </Button>
            </div>
          </div>
        </>
      )}

      {sel ? (
        <Sheet onClose={() => setSelId(null)}>
          <Detail event={sel} now={now} onClose={() => setSelId(null)} />
        </Sheet>
      ) : null}

      {filtersOpen ? (
        <Sheet onClose={() => setFiltersOpen(false)} label="Filtrar por asignatura">
          <div className="nc-sheet-panel">
            <div className="head">
              <h2 className="na-t-title">Asignaturas</h2>
              <Button variant="ghost" icon="x" label="Cerrar filtros" onClick={() => setFiltersOpen(false)} />
            </div>
            <div className="nc-filters" role="group" aria-label="Filtrar por asignatura">
              <Pill toggle selected={all} onClick={() => setActive(allModulesOn())}>
                Todas
              </Pill>
              {MODULE_ORDER.map(k => (
                <Pill key={k} toggle subject={k} selected={active[k] && !all} onClick={() => toggle(k)}>
                  {subjectOf(k).code}
                </Pill>
              ))}
            </div>
            <Button variant="primary" block onClick={() => setFiltersOpen(false)}>
              Ver {all ? 'todo' : nOn === 1 ? subjectOf(MODULE_ORDER.find(k => active[k])).code : `${nOn} asignaturas`}
            </Button>
          </div>
        </Sheet>
      ) : null}
    </div>
  )
}

/* Un día de la agenda: fecha a la izquierda, horario del día y sus entregas, exámenes o festivo */
function AgendaDay({ d, iso, evs, now, sel, onSel }) {
  const today = sameDay(d, now)
  const wd = (d.getDay() + 6) % 7
  const holiday = evs.find(e => e.type === 'festivo')
  const items = evs.filter(e => e.type !== 'festivo').sort((x, z) => (x.time || '').localeCompare(z.time || ''))
  const blocks = wd < 5 && !holiday ? blocksFor(wd + 1) : []
  return (
    <div className={cx('nc-mday-row', today && 'today')} data-day={iso} aria-current={today ? 'date' : undefined}>
      <div className="dt" aria-label={longDate(iso)}>
        <span className="dow">{today ? 'Hoy' : DOWS[wd]}</span>
        <b className="na-num">{d.getDate()}</b>
      </div>
      <div className="evs">
        {holiday ? <span className="hrs">Festivo · {holiday.title}</span> : null}
        {blocks.length ? (
          <span className="hrs">
            Clase de {trim(blocks[0].start)} a {trim(dayEnd(wd + 1))}
          </span>
        ) : null}
        {items.map(e => (
          <AgendaRow key={e.id} e={e} now={now} sel={sel} onSel={onSel} />
        ))}
        {!items.length && !holiday ? <span className="empty">Nada que entregar</span> : null}
      </div>
    </div>
  )
}

/* Botón de un día (tira de la semana y mes desplegado): número y sigilos de lo que tiene */
function DayButton({ d, iso, now, events, focus, onPick, muted }) {
  const evs = events.filter(e => e.date === iso)
  const fest = evs.some(e => e.type === 'festivo')
  const n = evs.filter(e => e.subject).length
  return (
    <button
      type="button"
      className={cx('nc-mday', ((d.getDay() + 6) % 7 >= 5 || muted) && 'we', fest && 'fest', sameDay(d, now) && 'today')}
      aria-pressed={iso === focus}
      aria-current={sameDay(d, now) ? 'date' : undefined}
      aria-label={longDate(iso) + (fest ? ', festivo' : n ? `, ${n} ${n === 1 ? 'evento' : 'eventos'}` : '')}
      onClick={() => onPick(iso)}
    >
      <span className="na-num">{d.getDate()}</span>
      <span className="dots" aria-hidden="true">
        {evs
          .filter(e => e.subject)
          .slice(0, 3)
          .map(e => (
            <Sigil key={e.id} subject={e.subject} size={8} variant={e.done ? 'outline' : 'solid'} />
          ))}
      </span>
    </button>
  )
}

function DowRow() {
  return DOWS.map(d => (
    <span key={d} className="dow" aria-hidden="true">
      {d.slice(0, 1)}
    </span>
  ))
}

/* Tira de la semana: se desliza con el dedo para cambiar de semana; con teclado, flechas izquierda y derecha */
function WeekStripM({ days, now, events, focus, onPick }) {
  const x0 = useRef(null)
  const step = n => onPick(isoDate(addDays(parseDate(focus), n)))
  return (
    <div
      className="nc-mmonth nc-mstrip"
      role="group"
      aria-label="Semana"
      onTouchStart={e => (x0.current = e.touches[0].clientX)}
      onTouchEnd={e => {
        if (x0.current === null) return
        const dx = e.changedTouches[0].clientX - x0.current
        x0.current = null
        if (Math.abs(dx) > 50) step(dx < 0 ? 7 : -7)
      }}
      onKeyDown={e => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault()
          step(e.key === 'ArrowRight' ? 1 : -1)
        }
      }}
    >
      <DowRow />
      {days.map(d => (
        <DayButton key={isoDate(d)} d={d} iso={isoDate(d)} now={now} events={events} focus={focus} onPick={onPick} />
      ))}
    </div>
  )
}

/* Mes desplegado: se elige un día y vuelve a la tira */
function MonthPicker({ month, now, events, focus, onPick }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = startOfWeek(first)
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const weeks = Math.ceil((((first.getDay() + 6) % 7) + last.getDate()) / 7)
  return (
    <div className="nc-mmonth" role="group" aria-label={monthTitle(month)}>
      <DowRow />
      {Array.from({ length: weeks * 7 }, (_, i) => {
        const d = addDays(start, i)
        if (d.getMonth() !== month.getMonth()) return <span key={i} aria-hidden="true" />
        return <DayButton key={i} d={d} iso={isoDate(d)} now={now} events={events} focus={focus} onPick={onPick} />
      })}
    </div>
  )
}
