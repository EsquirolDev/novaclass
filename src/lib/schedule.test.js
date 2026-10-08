import { describe, expect, it } from 'vitest'
import { parseDate } from './dates.js'
import { blocksFor, classesOf, dayEnd, nowStatus, totalHours, trim, weeklyHours } from './schedule.js'

/* Horario real de DAW 26/27 (seed.js). El 8 de octubre de 2026 es jueves. */
const at = (iso, time) => parseDate(iso, time)
const short = bs => bs.map(b => `${b.id ?? 'libre'} ${b.start}-${b.end}`)

describe('blocksFor', () => {
  it('junta franjas seguidas del mismo módulo y profe', () => {
    expect(short(blocksFor(1))).toEqual(['ed 15:00-16:50', 'lm 16:50-17:45', 'lm 18:00-18:55', 'pro 18:55-20:45', 'bd 20:45-21:40'])
  })

  it('no junta a través del patio', () => {
    const thu = short(blocksFor(4))
    expect(thu).toContain('pro 16:50-17:45')
    expect(thu).toContain('pro 18:00-18:55')
  })

  it('no junta el mismo módulo con distinto profe', () => {
    expect(short(blocksFor(3))).toEqual(['pro 15:00-15:55', 'si 15:55-17:45', 'bd 18:00-18:55', 'bd 18:55-20:45'])
  })

  it('con free: true incluye las horas libres', () => {
    expect(short(blocksFor(5, { free: true })).slice(-1)).toEqual(['libre 19:50-21:40'])
    expect(short(blocksFor(5))).not.toContain('libre 19:50-21:40')
  })

  it('el viernes: CPFW a las 16:50 e IPO de 18:55 a 19:50', () => {
    expect(short(blocksFor(5))).toEqual(['pro 15:00-16:50', 'cpfw 16:50-17:45', 'ed 18:00-18:55', 'ipo 18:55-19:50'])
  })
})

describe('horas', () => {
  it('horas semanales por módulo y total de 31', () => {
    expect({
      pro: weeklyHours('pro'),
      bd: weeklyHours('bd'),
      si: weeklyHours('si'),
      lm: weeklyHours('lm'),
      ed: weeklyHours('ed'),
      ipo: weeklyHours('ipo'),
      digi: weeklyHours('digi'),
      cpfw: weeklyHours('cpfw'),
    }).toEqual({ pro: 7, bd: 7, si: 5, lm: 4, ed: 3, ipo: 3, digi: 1, cpfw: 1 })
    expect(totalHours()).toBe(31)
  })

  it('IPO: martes de 18:55 a 20:45 y viernes de 18:55 a 19:50', () => {
    expect(short(classesOf('ipo'))).toEqual(['ipo 18:55-20:45', 'ipo 18:55-19:50'])
  })

  it('hora de salida de cada día', () => {
    expect([1, 2, 3, 4, 5].map(dayEnd)).toEqual(['21:40', '20:45', '20:45', '21:40', '19:50'])
  })

  it('trim quita el cero inicial', () => {
    expect(trim('09:05')).toBe('9:05')
    expect(trim('15:00')).toBe('15:00')
  })
})

describe('nowStatus', () => {
  it('antes de empezar dice qué toca primero', () => {
    const st = nowStatus(at('2026-10-08', '14:00'))
    expect(st.state).toBe('antes')
    expect(st.next.id).toBe('lm')
  })

  it('en clase: módulo, minutos que quedan y lo siguiente', () => {
    const st = nowStatus(at('2026-10-08', '15:30'))
    expect(st).toMatchObject({ state: 'clase', left: 80 })
    expect(st.block.id).toBe('lm')
    expect(st.next.id).toBe('pro')
  })

  it('en el patio', () => {
    expect(nowStatus(at('2026-10-08', '17:50'))).toMatchObject({ state: 'patio', left: 10 })
  })

  it('después de la última clase (aunque quede una franja libre)', () => {
    expect(nowStatus(at('2026-10-06', '21:00')).state).toBe('fin')
    expect(nowStatus(at('2026-10-09', '22:00')).state).toBe('fin')
  })

  it('fin de semana', () => {
    expect(nowStatus(at('2026-10-10', '16:00')).state).toBe('finde')
  })
})

describe('nowStatus: minutos exactos en los bordes', () => {
  it('cuenta minutos enteros en cualquier minuto del día', () => {
    for (let m = 15 * 60; m < 21 * 60 + 40; m++) {
      const st = nowStatus(at('2026-10-08', `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`))
      if (st.left !== undefined) expect(Number.isInteger(st.left) && st.left > 0).toBe(true)
    }
  })

  it('justo al empezar una clase quedan sus 55 minutos', () => {
    expect(nowStatus(at('2026-10-08', '18:00'))).toMatchObject({ state: 'clase', left: 55 })
  })
})
