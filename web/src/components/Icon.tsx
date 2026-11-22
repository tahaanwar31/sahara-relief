// Small outline icons drawn by hand (no icon library, so the bundle stays tiny).
const P: Record<string, string> = {
  check: 'M5 13l4 4L19 7',
  x: 'M6 6l12 12M18 6L6 18',
  speaker: 'M11 5L6 9H3v6h3l5 4V5z M15.5 8.5a5 5 0 010 7 M18.5 5.5a9 9 0 010 13',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4z M12 17a4 4 0 100-8 4 4 0 000 8z',
  person: 'M12 12a4 4 0 100-8 4 4 0 000 8z M4 21a8 8 0 0116 0',
  people: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7z M2 20a7 7 0 0114 0 M17 11a3 3 0 100-6 M18 14a6 6 0 013 6',
  warning: 'M12 3l10 18H2z M12 10v5 M12 18v.5',
  lock: 'M6 11h12v9H6z M8 11V8a4 4 0 018 0v3',
  phone: 'M8 3h8v18H8z M11 18h2',
  bank: 'M3 10l9-6 9 6 M5 10v8 M9 10v8 M15 10v8 M19 10v8 M3 20h18',
  doc: 'M7 3h7l4 4v14H7z M14 3v4h4 M10 12h5 M10 16h5',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 15a3 3 0 100-6 3 3 0 000 6z',
  wifioff: 'M2 8c3-3 7-4 10-4 M5 12c2-2 4-3 7-3 M9 16c1-1 2-1.5 3-1.5 M12 20h.01 M3 3l18 18',
  wifi: 'M2 8c6-5 14-5 20 0 M5 12c4-3 10-3 14 0 M9 16c2-1.5 4-1.5 6 0 M12 20h.01',
  home: 'M4 11l8-7 8 7 M6 10v10h12V10',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18',
  back: 'M15 5l-7 7 7 7',
  fwd: 'M9 5l7 7-7 7',
  trash: 'M6 7h12 M9 7V4h6v3 M7 7l1 13h8l1-13',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14z M16 16l5 5',
  list: 'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
  chart: 'M4 20V4 M4 20h16 M8 16v-5 M12 16V8 M16 16v-8',
  clock: 'M12 4a8 8 0 100 16 8 8 0 000-16z M12 8v4l3 2',
  help: 'M12 3a9 9 0 100 18 9 9 0 000-18z M9.5 9a2.5 2.5 0 114 2c-.8.6-1.5 1-1.5 2.5 M12 17v.5',
  message: 'M4 5h16v11H9l-5 4z',
  upload: 'M12 16V5 M7 9l5-5 5 5 M5 19h14',
  refresh: 'M20 11a8 8 0 10-2 6 M20 5v6h-6',
  logout: 'M10 4H5v16h5 M15 8l4 4-4 4 M19 12H9',
  sliders: 'M5 5v14 M12 5v14 M19 5v14 M3 9h4 M10 15h4 M17 8h4',
  scale: 'M12 4v16 M6 20h12 M5 8h14 M5 8l-3 7h6z M19 8l-3 7h6z',
  plus: 'M12 5v14 M5 12h14',
  pause: 'M8 5v14 M16 5v14',
  edit: 'M4 20l4-1 11-11-3-3L5 16z',
  copy: 'M9 9h10v11H9z M5 15V4h10',
  info: 'M12 3a9 9 0 100 18 9 9 0 000-18z M12 11v6 M12 7.5v.5',
}

export type IconName = keyof typeof P

export function Icon({ name, size = 24, className = '', stroke = 2 }: { name: IconName; size?: number; className?: string; stroke?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`}
    >
      {P[name].split(' M').map((d, i) => <path key={i} d={(i ? 'M' : '') + d} />)}
    </svg>
  )
}
