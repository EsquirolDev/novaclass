/*
 * Lista de personas pegada por la dirección (desde una hoja de cálculo o un documento) → filas para crear cuentas.
 * Una persona por línea, con las columnas separadas por tabulador, punto y coma o coma. Sin cabecera, el orden es
 * nombre, apellidos y NIA; con cabecera (una primera línea con «Nombre» y «Apellidos»), manda la cabecera, así vale
 * también «Apellido 1», «Apellido 2» o «Apellidos, Nombre».
 */
const split = line => {
  const sep = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ','
  return line.split(sep).map(c => c.trim().replace(/\s+/g, ' '))
}

function columnsOf(cells) {
  const norm = c => c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const cols = cells.map(c => {
    const n = norm(c)
    if (/apellido/.test(n)) return 'apellidos'
    if (/nombre/.test(n)) return 'nombre'
    if (/^(nia|id|dni|nie|identificador|id del centro|expediente)$/.test(n)) return 'nia'
    return null
  })
  return cols.includes('nombre') && cols.includes('apellidos') ? cols : null
}

export function parseList(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
  if (!lines.length) return { rows: [], header: false }
  const cols = columnsOf(split(lines[0]))
  const body = cols ? lines.slice(1) : lines
  const rows = body.map(line => {
    const cells = split(line)
    const row = { line, nombre: '', apellidos: '', nia: '', error: null }
    if (cols) {
      const ap = []
      cells.forEach((c, i) => {
        if (cols[i] === 'nombre') row.nombre = c
        else if (cols[i] === 'apellidos') ap.push(c)
        else if (cols[i] === 'nia') row.nia = c
      })
      row.apellidos = ap.filter(Boolean).join(' ')
    } else {
      ;[row.nombre = '', row.apellidos = '', row.nia = ''] = cells
    }
    if (!/[\t;,]/.test(line)) row.error = 'Separa el nombre y los apellidos con un tabulador, un punto y coma o una coma.'
    else if (!row.nombre) row.error = 'Falta el nombre.'
    else if (!row.apellidos) row.error = 'Faltan los apellidos.'
    return row
  })
  return { rows, header: !!cols }
}

/* Cuentas recién creadas → texto para pegar en una hoja de cálculo (con cabecera) */
export function toTsv(created, cursoName = () => '') {
  const lines = created.map(c => [c.name, c.username, c.password, cursoName(c.curso)].join('\t'))
  return ['Nombre\tUsuario\tContraseña temporal\tCurso', ...lines].join('\n')
}
