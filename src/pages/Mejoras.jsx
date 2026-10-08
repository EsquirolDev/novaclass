import { Button, Card, DoneToggle, Icon, ProgressSegments } from '../components/index.js'
import { isTaskDone, PLAN, PLAN_TASKS } from '../data/plan.js'
import { cx } from '../lib/cx.js'
import { navigate } from '../lib/router.jsx'
import { useStore } from '../state/store.jsx'
import NoEncontrada from './NoEncontrada.jsx'

/* Plan de actuación (tecla M). Al terminar todas las tareas y salir, la pantalla deja de existir. */
export default function Mejoras() {
  const { plan, planClosed, setPlanTask, closePlan } = useStore()
  const done = PLAN_TASKS.filter(t => isTaskDone(t, plan)).length
  const finished = done === PLAN_TASKS.length
  const next = PLAN_TASKS.find(t => !isTaskDone(t, plan))

  if (planClosed) return <NoEncontrada />

  function close() {
    closePlan()
    navigate('/')
  }

  return (
    <div className="nc-screen">
      <main className="nc-pad nc-plan">
        <div className="nc-top">
          <div>
            <p className="na-t-eyebrow na-muted">Plan de actuación</p>
            <h1 className="na-t-display-xl">Mejoras</h1>
            <p className="na-t-subtitle na-muted">Del frontend con datos de ejemplo a una app que use la clase. Pulsa <kbd>M</kbd> para abrir o cerrar esta pantalla.</p>
          </div>
        </div>

        <div className="nc-plan-progress">
          <ProgressSegments done={done} total={PLAN_TASKS.length} label="Plan" noun="tareas" ariaLabel="Plan de mejoras: " />
          {finished ? (
            <div className="nc-plan-end" role="status">
              <Icon name="check" size={22} strokeWidth={2.6} />
              <div>
                <p className="na-t-subtitle">Plan terminado</p>
                <p className="na-muted">Al salir de aquí esta pantalla desaparece y la tecla M deja de abrirla.</p>
              </div>
              <Button variant="primary" onClick={close}>Cerrar el plan</Button>
            </div>
          ) : (
            <p className="na-t-label na-muted">Lo siguiente: <b className="nc-plan-next">{next.title}</b></p>
          )}
        </div>

        <ol className="nc-plan-phases">
          {PLAN.map((phase, i) => {
            const n = phase.tasks.filter(t => isTaskDone(t, plan)).length
            return (
              <li key={phase.id}>
                <Card
                  title={<div className="nc-plan-head"><span className="num na-num">{i + 1}</span><div><h2 className="na-t-title">{phase.title}</h2><p className="na-muted">{phase.goal}</p></div></div>}
                  action={<span className={cx('nc-plan-count na-num', n === phase.tasks.length && 'all')}>{n}/{phase.tasks.length}</span>}
                >
                  <ul className="nc-plan-tasks">
                    {phase.tasks.map(t => {
                      const on = isTaskDone(t, plan)
                      return (
                        <li key={t.id} className={cx(on && 'is-done', next && next.id === t.id && 'is-next')}>
                          <DoneToggle done={on} title={t.title} onChange={v => setPlanTask(t.id, v)} />
                          <div>
                            <p className="t">{t.title}</p>
                            <p className="d">{t.detail}</p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </Card>
              </li>
            )
          })}
        </ol>
      </main>
    </div>
  )
}
