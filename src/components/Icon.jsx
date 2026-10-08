import { cx } from '../lib/cx.js'

/* Iconos de trazo propios: 24 px, trazo 2, extremos redondeados, heredan currentColor. */
const P = {
  home: ['M4 10.5 12 4l8 6.5V20h-5.5v-6h-5v6H4z'],
  calendar: ['M4.5 6h15v14h-15z', 'M4.5 10.5h15', 'M8.5 3.5v5', 'M15.5 3.5v5'],
  book: ['M5 5a1.5 1.5 0 0 1 1.5-1.5H18v14H6.5A1.5 1.5 0 0 0 5 19z', 'M5 19a1.5 1.5 0 0 0 1.5 1.5H18', 'M9 8h5'],
  help: ['M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17z', 'M9.6 9.7a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1.1.8-1.1 1.6v.3', 'M12 16.9v.1'],
  notes: ['M6 3.5h8l4 4v13H6z', 'M14 3.5v4h4', 'M9 12h6', 'M9 15.5h6'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  plus: ['M12 5v14', 'M5 12h14'],
  upload: ['M12 15V4.5', 'M7.5 9 12 4.5 16.5 9', 'M5 15v4.5h14V15'],
  download: ['M12 4.5V15', 'M7.5 10.5 12 15l4.5-4.5', 'M5 19.5h14'],
  clock: ['M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17z', 'M12 7.5V12l3 2'],
  pdf: ['M6 3.5h8l4 4v13H6z', 'M14 3.5v4h4', 'M9 16.5h6'],
  link: ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
  note: ['M15 4.5l4.5 4.5L9 19.5H4.5V15z', 'M12.5 7l4.5 4.5'],
  'chevron-right': ['M9.5 6l6 6-6 6'],
  'chevron-left': ['M14.5 6l-6 6 6 6'],
  'chevron-down': ['M6 9.5l6 6 6-6'],
  search: ['M10.5 4a6.5 6.5 0 1 1 0 13a6.5 6.5 0 1 1 0-13z', 'M15.5 15.5 20 20'],
  bell: ['M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z', 'M10 20.5h4'],
  up: ['M6 14.5l6-6 6 6'],
  down: ['M6 9.5l6 6 6-6'],
  message: ['M4.5 5.5h15V16h-9l-4.5 3.5V16H4.5z'],
  flag: ['M5.5 20.5V4.5', 'M5.5 5h11.5l-2.5 4 2.5 4H5.5'],
  alert: ['M12 3.8 21.2 19.5H2.8z', 'M12 10v4.2', 'M12 16.9v.1'],
  offline: [
    'M3.5 3.5l17 17',
    'M8.6 16.4a4.8 4.8 0 0 1 6.8 0',
    'M5.2 12.9a9.6 9.6 0 0 1 4.6-2.5',
    'M18.8 12.9a9.6 9.6 0 0 0-2.4-1.7',
    'M2 9.6a14.4 14.4 0 0 1 4.5-2.9',
    'M22 9.6A14.4 14.4 0 0 0 10.6 5.6',
    'M12 19.6v.1',
  ],
  edit: ['M14.5 5.5l4 4L9 19H5v-4z', 'M12.5 7.5l4 4'],
  trash: ['M5 7h14', 'M10 7V4.5h4V7', 'M7 7l1 13h8l1-13', 'M10.5 11v5.5', 'M13.5 11v5.5'],
  filter: ['M4 5.5h16l-6 7.5v5.5l-4 1.5v-7z'],
  inbox: ['M4 13.5 6.5 5h11l2.5 8.5V19H4z', 'M4 13.5h4.5l1 2h5l1-2H20'],
  x: ['M6 6l12 12', 'M18 6 6 18'],
  user: ['M12 4a4 4 0 1 1 0 8a4 4 0 1 1 0-8z', 'M4.5 20.5a7.5 7.5 0 0 1 15 0'],
  month: ['M4 4.5h16v15H4z', 'M4 9.5h16', 'M4 14.5h16', 'M9.3 4.5v15', 'M14.7 4.5v15'],
  week: ['M4 4.5h16v15H4z', 'M9.3 4.5v15', 'M14.7 4.5v15'],
  pin: ['M12 20.5s6-5.6 6-10.5a6 6 0 0 0-12 0c0 4.9 6 10.5 6 10.5z', 'M12 8a2 2 0 1 1 0 4a2 2 0 1 1 0-4z'],
  'arrow-right': ['M5 12h14', 'M13 6l6 6-6 6'],
  more: ['M6 12h.01', 'M12 12h.01', 'M18 12h.01'],
  folder: ['M3.5 6.5a1 1 0 0 1 1-1H9l2 2.5h8.5a1 1 0 0 1 1 1V18.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z'],
  sun: [
    'M12 8a4 4 0 1 1 0 8a4 4 0 1 1 0-8z',
    'M12 2.5v2',
    'M12 19.5v2',
    'M2.5 12h2',
    'M19.5 12h2',
    'M5.3 5.3l1.4 1.4',
    'M17.3 17.3l1.4 1.4',
    'M5.3 18.7l1.4-1.4',
    'M17.3 6.7l1.4-1.4',
  ],
  moon: ['M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z'],
}

export function Icon({ name, size = 20, strokeWidth = 2, label, className }) {
  const paths = P[name] || P.more
  return (
    <svg
      className={cx('na-icon', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      focusable="false"
    >
      {label ? <title>{label}</title> : null}
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}

Icon.names = Object.keys(P)
