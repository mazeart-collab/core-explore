import { PILIERS } from '../lib/matching'

/** Couleurs et icônes des 4 piliers de l'Ikigai. */
const PILIER_STYLE = {
  aime: { color: '#e11d48', soft: 'bg-rose-50 text-rose-700 ring-rose-200' },
  talents: { color: '#0284c7', soft: 'bg-sky-50 text-sky-700 ring-sky-200' },
  sens: { color: '#d97706', soft: 'bg-amber-50 text-amber-700 ring-amber-200' },
  equilibre: { color: '#059669', soft: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
}

export function PilierIcon({ id, size = 16, className = '' }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': true,
  }
  if (id === 'aime')
    return (
      <svg {...common}>
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
      </svg>
    )
  if (id === 'talents')
    return (
      <svg {...common}>
        <path d="M12 3l2.1 5.4L20 10.5l-5.9 2.1L12 18l-2.1-5.4L4 10.5l5.9-2.1z" />
        <path d="M19 17v4M17 19h4" />
      </svg>
    )
  if (id === 'sens')
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M15.5 8.5l-2 5-5 2 2-5z" />
      </svg>
    )
  return (
    <svg {...common}>
      <path d="M12 4v16M8 20h8M5 7h14" />
      <path d="M5 7l-2.5 6a2.5 2.5 0 0 0 5 0zM19 7l-2.5 6a2.5 2.5 0 0 0 5 0z" />
    </svg>
  )
}

/** Mini-badges : les piliers de l'utilisateur que ce métier vient nourrir. */
export function IkigaiBadges({ piliers }) {
  return (
    <ul className="flex gap-1.5" aria-label="Piliers de votre Ikigai nourris par ce métier">
      {PILIERS.map((p) => {
        const on = piliers?.has(p.id)
        const tip = `${p.libelle} : ${on ? 'ce métier y répond' : 'pas de correspondance avec vos choix'}`
        return (
          <li key={p.id} className="group relative">
            <span
              tabIndex={0}
              aria-label={tip}
              className={[
                'flex h-7 w-7 items-center justify-center rounded-full ring-1 transition-colors',
                on ? PILIER_STYLE[p.id].soft : 'bg-slate-50 text-slate-300 ring-slate-200',
              ].join(' ')}
            >
              <PilierIcon id={p.id} size={14} />
            </span>
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-48 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow group-hover:block group-focus-within:block"
            >
              {tip}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

// Disposition classique de l'Ikigai : 4 cercles qui se chevauchent.
const CIRCLES = {
  aime: { cx: 120, cy: 78, lx: 120, ly: 40 },
  talents: { cx: 78, cy: 120, lx: 44, ly: 124 },
  sens: { cx: 162, cy: 120, lx: 196, ly: 124 },
  equilibre: { cx: 120, cy: 162, lx: 120, ly: 210 },
}
const SHORT = { aime: 'J’aime', talents: 'Talents', sens: 'Sens', equilibre: 'Équilibre' }

/** Diagramme Ikigai : chaque cercle s'illumine quand le pilier a au moins un critère ; un clic ouvre la section. */
export function IkigaiDiagram({ active, counts, onSelect }) {
  const nbActive = PILIERS.filter((p) => active.has(p.id)).length
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="font-semibold text-slate-900">Votre Ikigai</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        {nbActive === 4
          ? 'Les 4 piliers sont renseignés.'
          : `${nbActive} pilier${nbActive > 1 ? 's' : ''} sur 4 renseigné${nbActive > 1 ? 's' : ''}. Cliquez sur un cercle pour le compléter.`}
      </p>
      <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
        <svg viewBox="0 0 240 240" className="w-48 shrink-0" role="group" aria-label="Diagramme Ikigai">
          {PILIERS.map((p) => {
            const c = CIRCLES[p.id]
            const on = active.has(p.id)
            const color = PILIER_STYLE[p.id].color
            return (
              <g
                key={p.id}
                role="button"
                tabIndex={0}
                aria-label={`${p.libelle} (${p.detail}) : ${on ? `${counts[p.id]} choix` : 'aucun choix'}. Ouvrir.`}
                className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-[4]"
                onClick={() => onSelect(p.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(p.id)
                  }
                }}
              >
                <circle
                  cx={c.cx}
                  cy={c.cy}
                  r="58"
                  fill={color}
                  fillOpacity={on ? 0.28 : 0.05}
                  stroke={color}
                  strokeOpacity={on ? 0.9 : 0.35}
                  strokeWidth="2"
                  style={{ transition: 'fill-opacity 300ms, stroke-opacity 300ms' }}
                />
                <text
                  x={c.lx}
                  y={c.ly}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="600"
                  fill={on ? color : '#94a3b8'}
                  style={{ pointerEvents: 'none' }}
                >
                  {SHORT[p.id]}
                </text>
              </g>
            )
          })}
          <circle cx="120" cy="120" r={nbActive === 4 ? 9 : 5} fill={nbActive === 4 ? '#0f766e' : '#cbd5e1'} />
        </svg>
        <ul className="w-full space-y-1.5">
          {PILIERS.map((p) => {
            const on = active.has(p.id)
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-slate-50"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1 ${on ? PILIER_STYLE[p.id].soft : 'bg-slate-50 text-slate-400 ring-slate-200'}`}
                  >
                    <PilierIcon id={p.id} size={13} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-800">{p.libelle}</span>
                    <span className="block text-xs text-slate-500">{p.detail}</span>
                  </span>
                  <span className="text-xs text-slate-500">{on ? `${counts[p.id]} choix` : 'à compléter'}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/** Étoiles (le taux de correspondance n'est jamais affiché en chiffres). */
export function Stars({ count, className = '' }) {
  if (!count) return null
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} role="img" aria-label={`${count} étoiles sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"
            fill={i <= count ? '#f59e0b' : 'none'}
            stroke={i <= count ? '#f59e0b' : '#cbd5e1'}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  )
}
