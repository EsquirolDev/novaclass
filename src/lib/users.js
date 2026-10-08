/* «Ana López Pérez» → «Ana»; sin nombre, la parte del correo antes de la @ */
export function firstName(user) {
  return (user?.name || user?.email || '').trim().split(/[\s@]/)[0]
}
