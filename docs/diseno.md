# Sistema de diseño de NovaClass

Organizador de clase para 1.º de DAW: entregas, exámenes, apuntes compartidos y dudas. La idea central es **color por asignatura**: cada módulo tiene un color, una forma y un código, y los tres aparecen juntos en todas partes (tarjetas, calendario, dudas, apuntes) para orientarse de un vistazo.

## Principios

- **El color es de las asignaturas.** Nada más en la interfaz usa los colores `pro`, `bd`, `lm`, `si`, `ed` ni los de los módulos de horario `digi`, `cpfw`, `ipo`. Los avatares, los botones y los estados son neutros o usan `accent`.
- **Nunca el color solo.** Cada asignatura lleva siempre su sigilo (forma) y su código: PRO ● círculo, BD ■ cuadrado, LMSGI ▲ triángulo, SI ◆ rombo, ED ⬢ hexágono. Los módulos que solo salen en el horario (sin entregas ni apuntes) también tienen los tres: DIGI ⬟ pentágono, CPFW ★ estrella, IPO ✚ cruz. Entrega y examen se distinguen por relleno, icono y palabra, no por tono.
- **Carpetas, no bordes laterales.** Lo que pertenece a un módulo va en `Card subject`: pestaña de archivador con sigilo + código y borde superior del color.
- **Seleccionado = invertido.** Pill, pestaña y día de hoy usan fondo `ink` y texto `bg`. Es la única forma de marcar selección.
- **Herramienta diaria, no landing.** Un único bloque de color sólido por pantalla (`Hero`), el resto sobre superficies neutras.

## Voz y contenido

- Español de clase, de tú, frases cortas: «Lo siguiente», «Marcar como hecha», «Faltan 2 días», «Pregunta a la clase».
- Fechas abreviadas y concretas: `Vie 9 oct · 23:59`. Plazos relativos al lado: «Faltan 2 días», «hace 15 min».
- Nombres reales de módulo y de entrega: «Modelo E/R biblioteca», «Ejercicios bucles», «¿LEFT JOIN o INNER JOIN?».
- Sin emojis. Mayúsculas solo en rótulos `eyebrow` y códigos de módulo.

## Color

- Fondo `bg`; tarjetas `surface` con borde `line`; zonas hundidas (pista de pestañas, celdas de semana) `surface-2`.
- Texto `ink`; metadatos `ink-muted` (≥4.5:1 sobre `bg`, `surface`, `surface-2` y todos los `*-soft`, en ambos temas).
- Controles sin seleccionar: contorno `line-strong` (≥3:1 en todas las superficies).
- `accent` (menta) solo para la acción principal, enlaces, voto propio y «Resuelta». Texto sobre él: `on-accent`.
- Asignatura `<s>`: sigilo, pestaña, segmentos hechos y examen en `<s>`; texto sobre relleno sólido en `on-<s>`; chips de entrega y etiquetas en `<s>-soft` con texto `ink` o `<s>`.
- El tema principal es **Oscuro**; **Claro** es su equivalente, con los colores de asignatura oscurecidos para mantener 4.5:1 con texto blanco encima.
- Aviso: `si` (#4FC79A) y `accent` (#5FD3A6) son casi el mismo verde, como pedía el brief. Se distinguen porque SI siempre lleva rombo + «SI» y el acento nunca aparece en un chip de asignatura. Si se quiere separarlos más, mueve `si` hacia el turquesa.

## Tipografía

- Una sola familia: Bricolage Grotesque (variable, `fonts/BricolageGrotesque-Variable.woff2`, OFL).
- Titulares en 800 con tracking negativo: `display-xl` (fecha de Inicio, títulos de pantalla), `display` (próxima entrega, cabecera de asignatura), `title` (secciones y tarjetas). `numeral` solo para la cuenta atrás.
- Texto 400–600: `body` para contenido, `body-strong` para títulos de fila, `label` para metadatos, `eyebrow` para rótulos.
- Cifras tabulares (`.na-num`) en contadores, fechas del calendario y notas.

## Forma, espacio y estados

- Radios: `radius-xl` (24) tarjetas y bloque destacado; `radius-lg` (20) celdas de semana; `radius-md` (16) filas y pestaña de carpeta; `radius-sm` (12) chips y celdas del mes; `radius-pill` para todo lo que se pulsa.
- Espaciado en pasos de `space-1`…`space-7` (4 → 48). Gutter móvil `space-4`, margen de escritorio `space-6`.
- Todo objetivo táctil mide `touch-min` (44 px) o más: pills, botones, pestañas, votos, `DoneToggle`, días de la semana en móvil, enlaces de sección. Los chips del calendario amplían su zona a 44 px.
- Foco: anillo `focus` de 3 px sólido con 2 px de separación, visible en todas las superficies.
- Sin degradados. Sombra solo `shadow-pop` en paneles flotantes (detalle de evento, barra inferior móvil).

## Diseño de pantallas

- Escritorio 1280–1440 px: `TopBar` + contenido en rejilla principal + columna lateral de ~360 px.
- Móvil 390 px: barra superior compacta, `Hero` a ancho completo, `WeekStrip compact`, carril horizontal de carpetas y `BottomNav` flotante.

## Calendario en móvil

Sigue el patrón de las apps de calendario, no la pantalla de escritorio en pequeño:

- Cabecera fija con el mes y una tira de la semana, como Apple Calendar y Fantastical. Al tocar el mes se despliega el mes entero, y la tira se desliza para cambiar de semana.
- Debajo va una agenda continua por días, como la vista «Agenda» de Google Calendar. Empieza hoy y solo enseña los días con algo, más hoy y el día elegido. Al desplazarla, la tira sigue al día de arriba.
- El detalle y los filtros se abren en hojas inferiores. El horario va día a día.

## Iconografía

- Iconos de trazo propios (`Icon`, 24 px, trazo 2, extremos redondeados), heredando `currentColor`. Lista en `Icon.names`.
- Los únicos rellenos sólidos son los sigilos de asignatura. No hay logotipo: «NovaClass» se compone en `display` 800 hasta que exista una marca.

## En el código

- Variables: `src/styles/tokens.css` (Oscuro en `:root`, Claro con `data-theme="light"`). La referencia con la nota de uso de cada token y los contrastes está en `docs/tokens.json`; si cambias un valor, cámbialo en los dos.
- Componentes: funciones de React en `src/components/` con clases `na-*` en `src/styles/components.css`, que solo leen variables. Las pantallas usan clases `nc-*` en `src/styles/app.css`.
- El color de asignatura se pasa con `subjectVars(id)` (variables `--s`, `--s-soft`, `--s-on`), así un mismo componente sirve para todos los módulos.
- `SUBJECT_ORDER` son las cinco asignaturas con entregas (Dudas, Apuntes, página de asignatura). `OTHER_ORDER` son los módulos solo de horario (`digi`, `cpfw`, `ipo`); `subjectOf(id)` devuelve cualquiera de los dos (`src/data/subjects.js`).
- Los arreglos visuales se comprueban con capturas ampliadas (10x y con zoom del navegador), no a ojo: la pestaña de carpeta ya dio problemas de píxeles con posiciones decimales.

Se creó como artifact de sistema de diseño («Ciclo») el 7 de octubre de 2026 y se trajo aquí el 8 de octubre de 2026. Desde entonces el código es la fuente de verdad.
