import { useEffect, useRef, useState } from 'react'
import { Button, EmptyState, Icon, ListRow, Sigil, StatusBadge, SubjectTag, Tabs } from '../components/index.js'
import { SUBJECTS, subjectVars } from '../data/subjects.js'
import { cx } from '../lib/cx.js'
import { longDate, relative } from '../lib/dates.js'
import { href } from '../lib/router.jsx'
import {
  BREAK,
  blocksFor,
  classInfo,
  totalHours,
  DAY_NAMES,
  DAY_SHORT,
  DAYS,
  dayEnd,
  nowStatus,
  teacherShort,
  toHours,
  trim,
} from '../lib/schedule.js'
import { useStore } from '../state/store.jsx'

/* Piezas del calendario que comparten la pantalla de escritorio (Calendario.jsx) y la de móvil (CalendarioMovil.jsx) */

/* Fila de entrega o examen a tamaño de lectura (agenda de la semana y día elegido en el mes del móvil) */
export function AgendaRow({ e, now, sel, onSel }) {
  const exam = e.type === 'examen'
  const on = !!(sel && sel.id === e.id)
  return (
    <ListRow
      subject={e.subject}
      done={e.done}
      onClick={() => onSel(e)}
      aria-pressed={on}
      className={cx('nc-arow', exam && 'exam', on && 'is-sel')}
      leading={
        exam ? (
          <span className="nc-aicon exam">
            <Icon name="flag" size={18} strokeWidth={2.4} />
          </span>
        ) : (
          <span className="nc-aicon">
            {e.done ? <Icon name="check" size={18} strokeWidth={2.6} /> : <Sigil subject={e.subject} size={14} tone="current" />}
          </span>
        )
      }
      title={e.title}
      meta={
        <>
          <SubjectTag subject={e.subject} />
          <span>{exam ? `Examen · ${e.time}–${e.end || ''}` : e.done ? 'Entrega · hecha' : `Entrega · hasta las ${e.time}`}</span>
        </>
      }
      trailing={e.done ? null : <span className="nc-arel">{relative(now, e.date)}</span>}
    />
  )
}

/* Una clase del horario: sigilo + código, nombre, horas y profe. Los módulos sin asignatura van en neutro. */
export function ClassBlock({ block: b, style, className, current, day }) {
  /* En la rejilla de escritorio el día solo está en la cabecera: se repite oculto para el lector de pantalla */
  const sr = day ? <span className="na-sr">{day}, </span> : null
  if (!b.id) {
    return (
      <div className={cx('blk', 'free', className)} style={style}>
        <span>
          {sr}
          Libre {trim(b.start)}–{trim(b.end)}
        </span>
      </div>
    )
  }
  const c = classInfo(b.id)
  return (
    <div
      className={cx('blk', 'cls', current && 'is-now', className)}
      style={{ ...style, ...subjectVars(b.id) }}
      aria-current={current ? 'time' : undefined}
    >
      {sr}
      <span className="code">
        <Sigil subject={b.id} size={11} tone="current" />
        {c.code}
      </span>
      <span className="nm">{c.name}</span>
      <small>
        {trim(b.start)}–{trim(b.end)}
        {b.teacher ? ' · ' + teacherShort(b.teacher) : ''}
      </small>
    </div>
  )
}

/* «Ahora: Programación · Pau · quedan 23 min · Después: Bases de Datos a las 20:45» */
export function NowLine({ now }) {
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
      <span>
        {main}
        {['clase', 'libre', 'patio'].includes(st.state) && nextTxt ? <span className="na-muted"> · Después: {nextTxt}</span> : null}
      </span>
    </p>
  )
}

/* `focusTitle`: al abrirlo con el teclado, el foco salta al título para no tener que recorrer todo el mes */
export function Detail({ event: e, now, onClose, focusTitle }) {
  const { dudas, setDone } = useStore()
  const title = useRef(null)
  useEffect(() => {
    if (focusTitle) title.current?.focus()
  }, [e.id, focusTitle])
  const s = SUBJECTS[e.subject]
  const exam = e.type === 'examen'
  const related = e.related ? dudas.find(d => d.id === e.related) : null
  return (
    <aside className="nc-detail" style={subjectVars(e.subject)} aria-label="Detalle del evento">
      <div className="nc-dhead">
        <Sigil
          subject={e.subject}
          variant="outline"
          tone="current"
          size={200}
          strokeWidth={1.6}
          className="na-hero-deco"
          style={{ width: 200, height: 200, right: -96, top: -84 }}
        />
        <div className="row">
          <SubjectTag subject={e.subject} variant="oncolor" showName />
          <Button variant="ghost" icon="x" label="Cerrar detalle" className="close" onClick={onClose} />
        </div>
        <div style={{ position: 'relative' }}>
          <span className="na-t-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name={exam ? 'flag' : 'inbox'} size={15} strokeWidth={2.4} />
            {exam ? 'Examen' : 'Entrega'}
          </span>
          <h2 ref={title} tabIndex={-1} className="na-t-display" style={{ fontSize: 34, marginTop: 8 }}>
            {e.title}
          </h2>
        </div>
      </div>
      <div className="nc-dbody">
        <div className="left">
          <Icon name={e.done ? 'check' : 'clock'} size={20} />
          {e.done ? 'Hecha' : <b>{relative(now, e.date)}</b>}
        </div>
        <dl className="nc-facts">
          <dt>
            <Icon name="calendar" size={18} />
          </dt>
          <dd>
            {longDate(e.date)} · {exam ? `${e.time} – ${e.end || ''}` : `hasta las ${e.time}`}
          </dd>
          <dt>
            <Icon name="pin" size={18} />
          </dt>
          <dd>{exam ? `En clase de ${s.code}` : e.where || 'Moodle'}</dd>
          {e.tema ? (
            <>
              <dt>
                <Icon name="book" size={18} />
              </dt>
              <dd>{e.tema}</dd>
            </>
          ) : null}
        </dl>
        {e.topics?.length ? (
          <div>
            <p className="na-t-eyebrow na-muted" style={{ marginBottom: 10 }}>
              {exam ? 'Qué entra' : 'Qué hay que entregar'}
            </p>
            <ol className="nc-topics">
              {e.topics.map((t, i) => (
                <li key={i}>
                  <span className="n">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        {related ? (
          <div>
            <p className="na-t-eyebrow na-muted" style={{ marginBottom: 4 }}>
              Duda relacionada
            </p>
            <ListRow
              to={'/dudas/' + related.id}
              className="nc-bleed"
              leading={<Icon name="help" size={22} />}
              title={related.title}
              meta={<StatusBadge status={related.status} answers={related.answers.length} />}
              trailing={<Icon name="chevron-right" size={18} />}
            />
          </div>
        ) : null}
        <div className="nc-actions">
          {exam ? (
            <Button variant="primary" icon="notes" block href={href('/apuntes?s=' + e.subject)}>
              Ver apuntes de {s.code}
            </Button>
          ) : (
            <Button variant={e.done ? 'secondary' : 'primary'} icon="check" block onClick={() => setDone(e.id, !e.done)}>
              {e.done ? 'Marcar como pendiente' : 'Marcar como hecha'}
            </Button>
          )}
          <Button variant="secondary" icon="book" block href={href('/asignaturas/' + e.subject)}>
            Ir a {s.name}
          </Button>
        </div>
      </div>
    </aside>
  )
}

/* Hoja inferior para el detalle en móvil: fondo que cierra al tocarlo, Esc también, y la página no se desplaza detrás */
export function Sheet({ onClose, label = 'Detalle del evento', children }) {
  const box = useRef(null)
  const close = useRef(onClose)
  close.current = onClose
  /* Al abrir, el foco entra en la hoja y no sale con Tab; al cerrar vuelve a lo que la abrió */
  useEffect(() => {
    const back = document.activeElement
    const focusables = () => [...box.current.querySelectorAll('button, a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])')]
    const first = focusables().find(el => !el.classList.contains('nc-sheet-bg'))
    first?.focus()
    function onKey(e) {
      if (e.key === 'Escape') close.current()
      if (e.key !== 'Tab') return
      const els = focusables().filter(el => !el.classList.contains('nc-sheet-bg'))
      const i = els.indexOf(document.activeElement)
      if (e.shiftKey && i <= 0) {
        e.preventDefault()
        els[els.length - 1].focus()
      } else if (!e.shiftKey && i === els.length - 1) {
        e.preventDefault()
        els[0].focus()
      }
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      back?.focus?.()
    }
  }, [])
  return (
    <div className="nc-sheet" role="dialog" aria-modal="true" aria-label={label} ref={box}>
      <button type="button" className="nc-sheet-bg" aria-label="Cerrar" tabIndex={-1} onClick={onClose} />
      <div className="nc-sheet-body">{children}</div>
    </div>
  )
}

/* Horario en móvil: un día cada vez (cinco columnas no caben en 390 px), con el de hoy elegido al entrar */
export function HorarioDia({ now, active }) {
  const today = now.getDay()
  const [day, setDay] = useState(today >= 1 && today <= 5 ? today : 1)
  const h = now.getHours() + now.getMinutes() / 60
  const blocks = blocksFor(day, { free: true })
  if (!totalHours()) return <SinHorario />
  return (
    <div className="nc-horario-wrap">
      <NowLine now={now} />
      <Tabs
        label="Día"
        value={String(day)}
        onChange={v => setDay(Number(v))}
        items={DAYS.map(d => ({ id: String(d), label: d === today ? 'Hoy' : DAY_SHORT[d] }))}
      />
      <ol className="nc-horario nc-hday" aria-label={'Clases del ' + DAY_NAMES[day].toLowerCase()}>
        {blocks.map(b => (
          <li key={b.from} className={BREAK && b.from === BREAK.after + 1 ? 'after-brk' : undefined}>
            {BREAK && b.from === BREAK.after + 1 ? (
              <div className="brkrow">
                {BREAK.label} · {BREAK.start}–{BREAK.end}
              </div>
            ) : null}
            <div className="slot">
              <span className="tm">
                <b>{trim(b.start)}</b>
                {trim(b.end)}
              </span>
              <ClassBlock
                block={b}
                current={day === today && h >= toHours(b.start) && h < toHours(b.end)}
                className={cx(day === today && 'is-today', b.id && !active[b.id] && 'is-dim')}
              />
            </div>
          </li>
        ))}
      </ol>
      <p className="na-t-label na-muted">{dayEnd(day) ? `Sales a las ${trim(dayEnd(day))}.` : 'Este día no hay clase.'}</p>
    </div>
  )
}

/* Una clase recién creada, sin franjas en el horario */
export function SinHorario() {
  return (
    <EmptyState icon="clock" title="Esta clase aún no tiene horario" className="nc-state-card">
      Lo añaden los Docentes, el Delegado o el Subdelegado. Mientras tanto, las entregas y los exámenes están en Mes y Semana.
    </EmptyState>
  )
}
