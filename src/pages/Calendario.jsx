import { useState } from 'react'
import { Button, EventChip, Icon, ListRow, Pill, Sigil, StatusBadge, SubjectTag, Tabs } from '../components/index.js'
import { BREAK, SESSIONS } from '../data/seed.js'
import { OTHER_ORDER, SUBJECTS, SUBJECT_ORDER, subjectOf, subjectVars } from '../data/subjects.js'
import { cx } from '../lib/cx.js'
import {
  addDays, isoDate, longDate, MONTHS_SHORT, monthTitle, parseDate, relative, sameDay, startOfWeek,
} from '../lib/dates.js'
import { href } from '../lib/router.jsx'
import {
  blocksFor, classInfo, DAY_SHORT, DAYS, dayEnd, nowStatus, teacherNames, teacherShort, toHours, totalHours, weeklyHours,
} from '../lib/schedule.js'
import { chip } from '../state/selectors.js'
import { useStore } from '../state/store.jsx'

const DOWS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/* Filtros: las cinco asignaturas y los módulos que solo salen en el horario */
const FILTER_ORDER = [...SUBJECT_ORDER, ...OTHER_ORDER]
const allOn = () => Object.fromEntries(FILTER_ORDER.map(k => [k, true]))

function query() {
  return new URLSearchParams(window.location.hash.split('?')[1] || '')
}

function initialDate() {
  const q = query()
  return q.get('d') ? parseDate(q.get('d')) : null
}

export default function Calendario() {
  const { now, events } = useStore()
  const fromLink = initialDate()
  const [view, setView] = useState(() => (query().get('v') === 'horario' ? 'horario' : 'mes'))
  const [ref, setRef] = useState(fromLink || now)
  const [active, setActive] = useState(allOn)
  const [selId, setSelId] = useState(() => {
    const day = fromLink || now
    const first = events.find(e => e.type !== 'festivo' && !e.done && e.at >= day) || null
    return first && first.id
  })
  const horario = view === 'horario'
  const sel = horario ? null : events.find(e => e.id === selId) || null
  const all = FILTER_ORDER.every(k => active[k])
  const visible = events.filter(e => !e.subject || active[e.subject])

  function toggle(k) {
    if (all) setActive(Object.fromEntries(FILTER_ORDER.map(s => [s, s === k])))
    else {
      const n = { ...active, [k]: !active[k] }
      setActive(FILTER_ORDER.some(s => n[s]) ? n : allOn())
    }
  }
  function move(dir) {
    setRef(view === 'mes' ? new Date(ref.getFullYear(), ref.getMonth() + dir, 1) : addDays(ref, 7 * dir))
  }
  const mon = startOfWeek(ref)
  const sun = addDays(mon, 6)
  const title = horario ? 'Horario de 1.º DAW' : view === 'mes'
    ? monthTitle(ref)
    : `Semana del ${mon.getDate()}${mon.getMonth() !== sun.getMonth() ? ' ' + MONTHS_SHORT[mon.getMonth()] : ''} al ${sun.getDate()} ${MONTHS_SHORT[sun.getMonth()]}`

  return (
    <div className="nc-screen">
      <div className={cx('nc-split', 'nc-split--cal', !sel && 'is-single')}>
        <main className="nc-main nc-main--tight">
          <div className="nc-cal-bar">
            <Tabs label="Vista" value={view} onChange={setView} items={[{ id: 'mes', label: 'Mes', icon: 'month' }, { id: 'semana', label: 'Semana', icon: 'week' }, { id: 'horario', label: 'Horario', icon: 'clock' }]} />
            <div className="nc-cal-nav" hidden={horario}>
              <Button variant="secondary" icon="chevron-left" label="Anterior" onClick={() => move(-1)} />
              <Button variant="secondary" onClick={() => setRef(now)}>Hoy</Button>
              <Button variant="secondary" icon="chevron-right" label="Siguiente" onClick={() => move(1)} />
            </div>
          </div>
          <h1 className="na-t-display-xl nc-cal-title">{title}</h1>
          <div className="nc-filters" role="group" aria-label="Filtrar por asignatura">
            <Pill toggle selected={all} onClick={() => setActive(allOn())}>Todas</Pill>
            <span className="nc-sep" aria-hidden="true" />
            {FILTER_ORDER.map(k => (
              <Pill key={k} toggle subject={k} selected={active[k] && !all} onClick={() => toggle(k)}>{subjectOf(k).code}</Pill>
            ))}
            {view === 'mes' ? (
              <div className="nc-legend nc-only-desktop" aria-hidden="true">
                <span><span className="na-chip na-chip--entrega" style={subjectVars('pro')}><Sigil subject="pro" size={10} tone="current" />Entrega</span></span>
                <span><span className="na-chip na-chip--examen" style={subjectVars('pro')}><Icon name="flag" size={13} strokeWidth={2.4} />Examen</span></span>
                <span><span className="na-chip is-done"><Icon name="check" size={13} strokeWidth={2.6} /><s>Hecha</s></span></span>
              </div>
            ) : null}
          </div>
          {horario ? <Horario now={now} active={active} /> : (
            <div className="nc-scroll-x">
              {view === 'mes'
                ? <MonthGrid refDate={ref} now={now} events={visible} sel={sel} onSel={e => setSelId(e.id)} />
                : <WeekAgenda monday={mon} now={now} events={visible} sel={sel} onSel={e => setSelId(e.id)} />}
            </div>
          )}
        </main>
        {sel ? <Detail event={sel} now={now} onClose={() => setSelId(null)} /> : null}
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
    <div className="nc-month" role="grid" aria-label={monthTitle(refDate)}>
      {DOWS.map(d => <div key={d} className="nc-dow">{d}</div>)}
      {cells.map((d, i) => {
        const out = d.getMonth() !== refDate.getMonth()
        const today = sameDay(d, now)
        const evs = out ? [] : events.filter(e => e.date === isoDate(d))
        return (
          <div key={i} className={cx('nc-cell', out && 'out', i % 7 >= 5 && 'we', today && 'today')} aria-current={today ? 'date' : undefined}>
            <span className="d">{d.getDate()}</span>
            {evs.slice(0, 2).map(e => (
              <EventChip key={e.id} {...chip(e)} compact selected={sel && sel.id === e.id} onClick={e.subject ? () => onSel(e) : undefined} />
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
          <section key={iso} role="listitem" className={cx('nc-aday', today && 'today', (i >= 5 || holiday) && 'off')} aria-current={today ? 'date' : undefined} aria-label={longDate(iso)}>
            <div className="dt">
              <span className="dow">{today ? 'Hoy' : DOWS[i]}</span>
              <b className="na-num">{d.getDate()}</b>
            </div>
            <div className="evs">
              <span className="hrs">{hours}</span>
              {items.length ? items.map(e => {
                const exam = e.type === 'examen'
                const on = !!(sel && sel.id === e.id)
                return (
                  <ListRow
                    key={e.id} subject={e.subject} done={e.done} onClick={() => onSel(e)} aria-pressed={on}
                    className={cx('nc-arow', exam && 'exam', on && 'is-sel')}
                    leading={exam
                      ? <span className="nc-aicon exam"><Icon name="flag" size={18} strokeWidth={2.4} /></span>
                      : <span className="nc-aicon">{e.done ? <Icon name="check" size={18} strokeWidth={2.6} /> : <Sigil subject={e.subject} size={14} tone="current" />}</span>}
                    title={e.title}
                    meta={<><SubjectTag subject={e.subject} /><span>{exam ? `Examen · ${e.time}–${e.end || ''}` : e.done ? 'Entrega · hecha' : `Entrega · hasta las ${e.time}`}</span></>}
                    trailing={e.done ? null : <span className="nc-arel">{relative(now, e.date)}</span>}
                  />
                )
              }) : <span className="empty">{i >= 5 || holiday ? 'Libre' : 'Nada que entregar'}</span>}
            </div>
          </section>
        )
      })}
    </div>
  )
}

const trim = t => t.replace(/^0/, '')

/* Una clase del horario: sigilo + código, nombre, horas y profe. Los módulos sin asignatura van en neutro. */
function ClassBlock({ block: b, style, className, current }) {
  if (!b.id) {
    return <div className={cx('blk', 'free', className)} style={style}><span>Libre</span></div>
  }
  const c = classInfo(b.id)
  return (
    <div className={cx('blk', 'cls', current && 'is-now', className)} style={{ ...style, ...subjectVars(b.id) }} aria-current={current ? 'time' : undefined}>
      <span className="code"><Sigil subject={b.id} size={11} tone="current" />{c.code}</span>
      <span className="nm">{c.name}</span>
      <small>{trim(b.start)}–{trim(b.end)}{b.teacher ? ' · ' + teacherShort(b.teacher) : ''}</small>
    </div>
  )
}

/* «Ahora: Programación · Pau · quedan 23 min · Después: Bases de Datos a las 20:45» */
function NowLine({ now }) {
  const st = nowStatus(now)
  const name = b => classInfo(b.id).name
  const nextTxt = st.next ? `${name(st.next)} a las ${trim(st.next.start)}` : null
  let main
  if (st.state === 'finde') main = 'Fin de semana. El lunes empiezas a las 15:00.'
  else if (st.state === 'fin') main = 'Por hoy ya has terminado.'
  else if (st.state === 'antes') main = nextTxt ? `Hoy empiezas con ${nextTxt}.` : 'Hoy no tienes clase.'
  else if (st.state === 'patio') main = `Ahora: patio · quedan ${st.left} min`
  else if (st.state === 'libre') main = `Ahora: hora libre · quedan ${st.left} min`
  else main = `Ahora: ${name(st.block)}${st.block.teacher ? ' · ' + teacherShort(st.block.teacher) : ''} · quedan ${st.left} min`
  const sid = st.state === 'clase' ? st.block.id : null
  return (
    <p className="nc-nowline" role="status" style={subjectVars(sid)}>
      {sid ? <Sigil subject={sid} size={12} /> : <Icon name="clock" size={18} />}
      <span>{main}{['clase', 'libre', 'patio'].includes(st.state) && nextTxt ? <span className="na-muted"> · Después: {nextTxt}</span> : null}</span>
    </p>
  )
}

/* Horario semanal: filas = franjas, columnas = lunes a viernes. Datos de seed.js (SESSIONS, SCHEDULE). */
function Horario({ now, active }) {
  const today = now.getDay()
  const h = now.getHours() + now.getMinutes() / 60
  const row = i => (i <= BREAK.after ? i + 2 : i + 3)
  return (
    <div className="nc-horario-wrap">
      <NowLine now={now} />
      <div className="nc-scroll-x">
        <div className="nc-horario" role="table" aria-label="Horario semanal de DAW 26/27">
          <div style={{ gridRow: 1, gridColumn: 1 }} />
          {DAYS.map(d => (
            <div key={d} role="columnheader" className={cx('hd', d === today && 'today')} style={{ gridRow: 1, gridColumn: d + 1 }}>
              {DAY_SHORT[d]}<small>hasta {trim(dayEnd(d))}</small>
            </div>
          ))}
          {SESSIONS.map((s, i) => (
            <div key={i} className="tm" style={{ gridRow: row(i), gridColumn: 1 }}><b>{trim(s.start)}</b>{trim(s.end)}</div>
          ))}
          <div className="brkrow" style={{ gridRow: BREAK.after + 3, gridColumn: '1 / -1' }}>{BREAK.label} · {BREAK.start}–{BREAK.end}</div>
          {DAYS.flatMap(d => blocksFor(d, { free: true }).map(b => (
            <ClassBlock
              key={d + '-' + b.from} block={b}
              current={d === today && h >= toHours(b.start) && h < toHours(b.end)}
              className={cx(d === today && 'is-today', b.id && !active[b.id] && 'is-dim')}
              style={{ gridColumn: d + 1, gridRow: `${row(b.from)} / ${row(b.to) + 1}` }}
            />
          )))}
        </div>
      </div>
      <section className="nc-hours" aria-labelledby="nc-hours-t">
        <div className="nc-hours-head">
          <h2 id="nc-hours-t" className="na-t-eyebrow na-muted">Módulos y profesorado</h2>
          <span className="na-num"><b>{totalHours()} h</b> a la semana</span>
        </div>
        <ul className="nc-hours-grid">
          {FILTER_ORDER.map(id => {
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
                  {Array.from({ length: n }, (_, i) => <i key={i} />)}
                </span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function Detail({ event: e, now, onClose }) {
  const { dudas, setDone } = useStore()
  const s = SUBJECTS[e.subject]
  const exam = e.type === 'examen'
  const related = e.related ? dudas.find(d => d.id === e.related) : null
  return (
    <aside className="nc-detail" style={subjectVars(e.subject)} aria-label="Detalle del evento">
      <div className="nc-dhead">
        <Sigil subject={e.subject} variant="outline" tone="current" size={200} strokeWidth={1.6} className="na-hero-deco" style={{ width: 200, height: 200, right: -96, top: -84 }} />
        <div className="row">
          <SubjectTag subject={e.subject} variant="oncolor" showName />
          <Button variant="ghost" icon="x" label="Cerrar detalle" className="close" onClick={onClose} />
        </div>
        <div style={{ position: 'relative' }}>
          <span className="na-t-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name={exam ? 'flag' : 'inbox'} size={15} strokeWidth={2.4} />{exam ? 'Examen' : 'Entrega'}
          </span>
          <h2 className="na-t-display" style={{ fontSize: 34, marginTop: 8 }}>{e.title}</h2>
        </div>
      </div>
      <div className="nc-dbody">
        <div className="left">
          <Icon name={e.done ? 'check' : 'clock'} size={20} />
          {e.done ? 'Hecha' : <b>{relative(now, e.date)}</b>}
        </div>
        <dl className="nc-facts">
          <dt><Icon name="calendar" size={18} /></dt>
          <dd>{longDate(e.date)} · {exam ? `${e.time} – ${e.end || ''}` : `hasta las ${e.time}`}</dd>
          <dt><Icon name="pin" size={18} /></dt>
          <dd>{exam ? `En clase de ${s.code}` : e.where || 'Moodle'}</dd>
          {e.tema ? <><dt><Icon name="book" size={18} /></dt><dd>{e.tema}</dd></> : null}
        </dl>
        {e.topics?.length ? (
          <div>
            <p className="na-t-eyebrow na-muted" style={{ marginBottom: 10 }}>{exam ? 'Qué entra' : 'Qué hay que entregar'}</p>
            <ol className="nc-topics">{e.topics.map((t, i) => <li key={i}><span className="n">{i + 1}</span>{t}</li>)}</ol>
          </div>
        ) : null}
        {related ? (
          <div>
            <p className="na-t-eyebrow na-muted" style={{ marginBottom: 4 }}>Duda relacionada</p>
            <ListRow
              to={'/dudas/' + related.id} className="nc-bleed" leading={<Icon name="help" size={22} />} title={related.title}
              meta={<StatusBadge status={related.status} answers={related.answers.length} />}
              trailing={<Icon name="chevron-right" size={18} />}
            />
          </div>
        ) : null}
        <div className="nc-actions">
          {exam
            ? <Button variant="primary" icon="notes" block href={href('/apuntes?s=' + e.subject)}>Ver apuntes de {s.code}</Button>
            : <Button variant={e.done ? 'secondary' : 'primary'} icon="check" block onClick={() => setDone(e.id, !e.done)}>
              {e.done ? 'Marcar como pendiente' : 'Marcar como hecha'}
            </Button>}
          <Button variant="secondary" icon="book" block href={href('/asignaturas/' + e.subject)}>Ir a {s.name}</Button>
        </div>
      </div>
    </aside>
  )
}
