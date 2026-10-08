import { Button } from '../components/index.js'
import { href } from '../lib/router.jsx'

export default function NoEncontrada() {
  return (
    <div className="nc-screen">
      <main className="nc-pad" style={{ paddingTop: 48 }}>
        <h1 className="na-t-display-xl">Aquí no hay nada</h1>
        <p className="na-t-subtitle na-muted" style={{ margin: '12px 0 24px' }}>Esta página no existe o la han movido.</p>
        <Button variant="primary" icon="home" href={href('/')}>Volver a Inicio</Button>
      </main>
    </div>
  )
}
