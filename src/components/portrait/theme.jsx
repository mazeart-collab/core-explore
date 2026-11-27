// Icônes et pastilles des dimensions du portrait.
import { THEMES } from './themes'

const PATHS = {
  etincelle: 'M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8',
  outils: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
  boussole: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5z',
  graine: 'M12 21v-8M12 13c0-4 3-7 8-7 0 4-3 7-8 7zM12 15c0-3-2.5-5.5-7-5.5 0 3 2.5 5.5 7 5.5z',
  flamme: 'M12 21c-3.9 0-7-2.9-7-6.6 0-3.1 2.2-5 3.6-7.4.4 1.9 1.4 3 2.4 3.4C11 7 12.6 4.5 15 3c-.2 3 1 4.7 2.3 6.2A7.1 7.1 0 0 1 19 14.4C19 18.1 15.9 21 12 21z',
  curseurs: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M16 16v4',
  portrait: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  plume: 'M20 4c-6 0-11 5-12 11l-3 5M8 15c4 0 8-2 10-6',
  pistes: 'M3 12h4l3-8 4 16 3-8h4',
  fleche: 'M5 12h14M13 6l6 6-6 6',
  retour: 'M19 12H5M11 6l-6 6 6 6',
  coche: 'M5 12.5l4.5 4.5L19 7.5',
  plus: 'M12 5v14M5 12h14',
  croix: 'M6 6l12 12M18 6L6 18',
  haut: 'M12 19V5M6 11l6-6 6 6',
  bas: 'M12 5v14M6 13l6 6 6-6',
  poignee: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  loupe: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  chevron: 'M6 9l6 6 6-6',
  crayon: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  reset: 'M4 4v6h6M4.5 15a8 8 0 1 0 1.9-8.3L4 10',
  etoile: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z',
  interdit: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8',
  imprimer: 'M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z',
}

export function Icone({ nom, size = 20, className = '', strokeWidth = 2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[nom] || PATHS.etincelle} />
    </svg>
  )
}

/** Pastille ronde numérotée d'une dimension. */
export function Numero({ dimension, size = 'md' }) {
  const t = THEMES[dimension.couleur]
  const s = size === 'sm' ? 'h-6 w-6 text-xs' : 'h-9 w-9 text-sm'
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${s} ${t.pastille}`}>
      {dimension.numero}
    </span>
  )
}
