import { describe, expect, it } from 'vitest'
import { addDays, countdown, isoDate, longDate, monthTitle, parseDate, relative, sameDay, shortDate, startOfWeek } from './dates.js'

const at = (iso, time) => parseDate(iso, time)

describe('fechas', () => {
  it('parseDate e isoDate van y vuelven en hora local', () => {
    const d = at('2026-10-09', '23:59')
    expect(d.getHours()).toBe(23)
    expect(d.getMinutes()).toBe(59)
    expect(isoDate(d)).toBe('2026-10-09')
  })

  it('addDays cruza meses y años', () => {
    expect(isoDate(addDays(at('2026-10-31'), 1))).toBe('2026-11-01')
    expect(isoDate(addDays(at('2026-12-31'), 1))).toBe('2027-01-01')
    expect(isoDate(addDays(at('2026-10-01'), -1))).toBe('2026-09-30')
  })

  it('startOfWeek devuelve el lunes, también desde el domingo', () => {
    expect(isoDate(startOfWeek(at('2026-10-08')))).toBe('2026-10-05')
    expect(isoDate(startOfWeek(at('2026-10-11')))).toBe('2026-10-05')
    expect(isoDate(startOfWeek(at('2026-10-05')))).toBe('2026-10-05')
  })

  it('sameDay ignora la hora', () => {
    expect(sameDay(at('2026-10-08', '00:01'), at('2026-10-08', '23:59'))).toBe(true)
    expect(sameDay(at('2026-10-08'), at('2026-10-09'))).toBe(false)
  })

  it('formatos en español', () => {
    expect(shortDate('2026-10-09', '23:59')).toBe('Vie 9 oct · 23:59')
    expect(shortDate('2026-10-09')).toBe('Vie 9 oct')
    expect(longDate('2026-10-12')).toBe('Lunes 12 de octubre')
    expect(monthTitle(at('2026-11-01'))).toBe('Noviembre 2026')
  })

  it('relative cuenta días naturales, no horas', () => {
    const now = at('2026-10-08', '23:00')
    expect(relative(now, '2026-10-08')).toBe('Es hoy')
    expect(relative(now, '2026-10-09')).toBe('Mañana')
    expect(relative(now, '2026-10-13')).toBe('Faltan 5 días')
    expect(relative(now, '2026-11-04')).toBe('Faltan 4 semanas')
    expect(relative(now, '2026-10-07')).toBe('Fue ayer')
    expect(relative(now, '2026-10-01')).toBe('Hace 7 días')
  })

  it('countdown no baja de cero', () => {
    expect(countdown(at('2026-10-08', '10:00'), at('2026-10-09', '12:30'))).toEqual({ days: 1, hours: 2, minutes: 30 })
    expect(countdown(at('2026-10-09'), at('2026-10-08'))).toEqual({ days: 0, hours: 0, minutes: 0 })
  })
})
