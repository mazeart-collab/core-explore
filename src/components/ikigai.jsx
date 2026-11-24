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

// Grand diagramme Ikigai (viewBox 600×600) : 4 cercles de rayon 160 qui se chevauchent.
// Chaque cercle a une zone « libre » (hors chevauchements) où s'affichent les mots-clés choisis.
const R = 160
const CX = 300
const CY = 295
const CIRCLES = {
  aime: { cx: CX, cy: CY - 130, zone: { x: 195, y: 24, w: 210, h: 120 } },
  talents: { cx: CX - 130, cy: CY, zone: { x: 20, y: 205, w: 182, h: 180 } },
  sens: { cx: CX + 130, cy: CY, zone: { x: 398, y: 205, w: 182, h: 180 } },
  equilibre: { cx: CX, cy: CY + 130, zone: { x: 195, y: 448, w: 210, h: 120 } },
}
const INVITATIONS = {
  aime: 'Ajoutez vos activités et centres d’intérêt…',
  talents: 'Indiquez vos compétences…',
  sens: 'Choisissez ce qui donne du sens…',
  equilibre: 'Précisez motivations et conditions…',
}
const MAX_TAGS = 3

/** Mots-clés d'un pilier : 3 visibles au maximum, puis « +X autres ». */
function PilierTags({ id, tags, size = 'lg' }) {
  const shown = tags.slice(0, MAX_TAGS)
  const rest = tags.length - shown.length
  const chip = size === 'lg' ? 'text-[12px] leading-[18px] px-2' : 'text-xs px-2 py-0.5'
  if (!tags.length) return <p className={`${size === 'lg' ? 'text-[13px]' : 'text-xs'} italic text-slate-400`}>{INVITATIONS[id]}</p>
  return (
    <ul className="flex max-w-full flex-wrap justify-center gap-1">
      {shown.map((t) => (
        <li
          key={t.label}
          title={t.label}
          className={`max-w-full truncate rounded-full ring-1 ${chip} ${t.negative ? 'bg-slate-100 text-slate-500 ring-slate-200 line-through decoration-slate-400' : PILIER_STYLE[id].soft}`}
        >
          {t.label}
        </li>
      ))}
      {rest > 0 && <li className={`rounded-full bg-white font-medium text-slate-600 ring-1 ring-slate-300 ${chip}`}>+{rest} autre{rest > 1 ? 's' : ''}</li>}
    </ul>
  )
}

const activate = (fn) => ({
  role: 'button',
  tabIndex: 0,
  onClick: fn,
  onKeyDown: (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fn()
    }
  },
})

/**
 * Encart « Votre Ikigai » : les 4 piliers s'illuminent et affichent les mots-clés choisis ;
 * un clic ouvre la section de critères correspondante.
 * tags : { aime: [{label, negative?}], talents: [...], sens: [...], equilibre: [...] }
 */
export function IkigaiDiagram({ tags, onSelect }) {
  const active = (id) => tags[id]?.length > 0
  const nbActive = PILIERS.filter((p) => active(p.id)).length
  return (
    <section aria-labelledby="ikigai-titre" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 id="ikigai-titre" className="text-lg font-semibold text-slate-900">
          Votre Ikigai
        </h2>
        <p className="text-sm text-slate-500">
          {nbActive === 4
            ? 'Les 4 piliers sont renseignés : vos pistes sont au centre.'
            : `${nbActive} pilier${nbActive > 1 ? 's' : ''} sur 4 renseigné${nbActive > 1 ? 's' : ''} · cliquez sur un cercle pour le compléter`}
        </p>
      </div>

      {/* Ordinateur et tablette : grand diagramme avec les mots-clés dans les cercles */}
      <svg viewBox="0 0 600 600" className="mx-auto mt-2 hidden w-full max-w-[640px] sm:block" role="group" aria-label="Diagramme Ikigai">
        {PILIERS.map((p) => {
          const c = CIRCLES[p.id]
          const on = active(p.id)
          const color = PILIER_STYLE[p.id].color
          return (
            <circle
              key={p.id}
              cx={c.cx}
              cy={c.cy}
              r={R}
              fill={color}
              fillOpacity={on ? 0.16 : 0.04}
              stroke={color}
              strokeOpacity={on ? 0.85 : 0.3}
              strokeWidth="2"
              style={{ transition: 'fill-opacity 300ms, stroke-opacity 300ms' }}
            />
          )
        })}
        {PILIERS.map((p) => {
          const c = CIRCLES[p.id]
          const on = active(p.id)
          return (
            <g
              key={p.id}
              {...activate(() => onSelect(p.id))}
              aria-label={`${p.libelle} (${p.detail}) : ${on ? `${tags[p.id].length} choix` : 'aucun choix'}. Ouvrir la section.`}
              className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-[5]"
            >
              {/* zone cliquable : tout le cercle */}
              <circle cx={c.cx} cy={c.cy} r={R} fill="transparent" stroke={PILIER_STYLE[p.id].color} strokeOpacity="0" />
              <foreignObject x={c.zone.x} y={c.zone.y} width={c.zone.w} height={c.zone.h}>
                <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                  <p className="flex items-center gap-1.5 text-[15px] font-semibold" style={{ color: on ? PILIER_STYLE[p.id].color : '#64748b' }}>
                    <PilierIcon id={p.id} size={15} />
                    {p.libelle}
                  </p>
                  <PilierTags id={p.id} tags={tags[p.id] || []} />
                </div>
              </foreignObject>
            </g>
          )
        })}
        <circle cx={CX} cy={CY} r={nbActive === 4 ? 30 : 24} fill="white" stroke={nbActive === 4 ? '#0f766e' : '#cbd5e1'} strokeWidth="2" />
        <text x={CX} y={CY + 4} textAnchor="middle" fontSize="11" fontWeight="600" fill={nbActive === 4 ? '#0f766e' : '#94a3b8'}>
          Vos pistes
        </text>
      </svg>

      {/* Mobile : les 4 piliers en cartes, avec les mêmes mots-clés */}
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:hidden">
        {PILIERS.map((p) => {
          const on = active(p.id)
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                className="flex h-full w-full flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center"
                style={{
                  borderColor: on ? PILIER_STYLE[p.id].color : '#e2e8f0',
                  backgroundColor: on ? `${PILIER_STYLE[p.id].color}12` : 'white',
                }}
              >
                <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: on ? PILIER_STYLE[p.id].color : '#64748b' }}>
                  <PilierIcon id={p.id} size={14} />
                  {p.libelle}
                </span>
                <PilierTags id={p.id} tags={tags[p.id] || []} size="sm" />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
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
