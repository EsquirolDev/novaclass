/* «Ana López Pérez» → «Ana»; sin nombre, la parte del usuario o del correo antes de la @ */
export function firstName(user) {
  return (user?.nombre || user?.name || user?.username || user?.email || '').trim().split(/[\s@]/)[0]
}
