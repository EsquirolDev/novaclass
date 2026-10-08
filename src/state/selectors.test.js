import { describe, expect, it } from 'vitest'
import { parseDate } from '../lib/dates.js'
import { chip, nextUp, subjectProgress, weekDays } from './selectors.js'

const ev = (id, date, extra = {}) => ({
  id,
  type: 'entrega',
  subject: 'pro',
  title: id,
  date,
  time: '23:59',
  done: false,
  at: parseDate(date, '23:59'),
  ...extra,
})
const now = parseDate('2026-10-08', '12:00')
const events = [
  ev('vieja', '2026-10-01', { done: true }),
  ev('atrasada', '2026-10-05'),
  ev('fiesta', '2026-10-12', { type: 'festivo', subject: null }),
  ev('hoy', '2026-10-08'),
  ev('examen', '2026-10-13', { type: 'examen', subject: 'pro' }),
]

describe('selectores', () => {
  it('nextUp: lo primero pendiente que no ha pasado, nunca un festivo', () => {
    expect(nextUp(events, now).id).toBe('hoy')
    expect(nextUp(events, parseDate('2026-10-11', '12:00')).id).toBe('examen')
    expect(nextUp([], now)).toBe(null)
  })

  it('chip: sin hora si está hecha o es festivo', () => {
    expect(chip(events[0]).time).toBeUndefined()
    expect(chip(events[2]).time).toBeUndefined()
    expect(chip(events[3]).time).toBe('23:59')
  })

  it('weekDays: lunes a domingo con hoy marcado y sus eventos', () => {
    const days = weekDays(events, now, now)
    expect(days.map(d => d.iso)).toEqual(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'])
    expect(days.filter(d => d.today).map(d => d.iso)).toEqual(['2026-10-08'])
    expect(days[3].events.map(e => e.id)).toEqual(['hoy'])
    expect(days[5].weekend && days[6].weekend && !days[4].weekend).toBe(true)
  })

  it('subjectProgress: hechas, atrasadas, siguiente y examen', () => {
    const p = subjectProgress(events, 'pro', now)
    expect(p).toMatchObject({ done: 1, total: 3, overdue: 1 })
    expect(p.next.id).toBe('hoy')
    expect(p.exam.id).toBe('examen')
  })
})
