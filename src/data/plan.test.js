import { describe, expect, it } from 'vitest'
import { isTaskDone, PLAN, PLAN_TASKS, planFinished } from './plan.js'

describe('plan de mejoras', () => {
  it('ids de tareas únicos', () => {
    const ids = PLAN_TASKS.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(PLAN_TASKS.length).toBe(PLAN.reduce((n, p) => n + p.tasks.length, 0))
  })

  it('lo marcado por la persona pisa lo que dice el archivo', () => {
    const t = { id: 'x', done: true }
    expect(isTaskDone(t, {})).toBe(true)
    expect(isTaskDone(t, { x: false })).toBe(false)
    expect(isTaskDone({ id: 'y' }, { y: true })).toBe(true)
  })

  it('planFinished solo con todas hechas', () => {
    const all = Object.fromEntries(PLAN_TASKS.map(t => [t.id, true]))
    expect(planFinished(all)).toBe(true)
    expect(planFinished({ ...all, [PLAN_TASKS[0].id]: false })).toBe(false)
  })
})
