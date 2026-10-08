import { Fragment } from 'react'

/* Texto con `código` y **negrita** en línea; nada más. */
export function Inline({ text }) {
  const parts = String(text).split(/(`[^`]+`|\*\*[^*]+\*\*)/)
  return parts.map((p, i) => {
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i}>{p.slice(1, -1)}</code>
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
    return <Fragment key={i}>{p}</Fragment>
  })
}

const SQL = /\b(SELECT|FROM|LEFT JOIN|INNER JOIN|ON|WHERE|IS NULL|NOT EXISTS|GROUP BY|HAVING|ORDER BY)\b/

/* Bloque de código con palabras clave SQL resaltadas en el color de la asignatura */
export function CodeBlock({ code }) {
  return (
    <pre className="nc-pre">
      <code>
        {code.split('\n').map((line, i) => (
          <span key={i} style={{ display: 'block' }}>
            {line.split(SQL).map((p, j) =>
              j % 2 ? (
                <span key={j} className="k">
                  {p}
                </span>
              ) : (
                p
              ),
            )}
          </span>
        ))}
      </code>
    </pre>
  )
}

/* Párrafos separados por línea en blanco */
export function Paragraphs({ text }) {
  return String(text)
    .split(/\n{2,}/)
    .map((p, i) => (
      <p key={i}>
        <Inline text={p} />
      </p>
    ))
}
