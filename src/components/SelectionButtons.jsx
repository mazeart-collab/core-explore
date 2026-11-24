import { useSelection } from '../lib/SelectionContext'
import { clean } from '../lib/text'

export function HeartIcon({ filled, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  )
}

export function ThumbDownIcon({ filled, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <path d="M17 14V3H7.6a2 2 0 0 0-2 1.7L4.3 12a2 2 0 0 0 2 2.3H10v4a3 3 0 0 0 3 3l4-7z" />
      <path d="M17 3h3v11h-3" />
    </svg>
  )
}

/** Boutons « À garder » / « Pas pour moi ». size="lg" affiche aussi les libellés (fiche métier). */
export default function SelectionButtons({ metier, size = 'sm' }) {
  const { isFavori, isEcarte, toggleFavori, toggleEcarte } = useSelection()
  const code = metier.code_rome
  const fav = isFavori(code)
  const out = isEcarte(code)
  const name = clean(metier.intitule)
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 print:hidden'
  const dims = size === 'lg' ? 'px-3.5 py-2 text-sm font-medium' : 'h-9 w-9'

  return (
    <div className="flex shrink-0 gap-1.5">
      <button
        type="button"
        onClick={() => toggleFavori(code)}
        aria-pressed={fav}
        aria-label={fav ? `Retirer « ${name} » de mon panier` : `Garder « ${name} » dans mon panier`}
        title={fav ? 'Retirer de mon panier' : 'À garder'}
        className={`${base} ${dims} ${fav ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-slate-200 bg-white text-slate-500 hover:border-rose-300 hover:text-rose-600'}`}
      >
        <HeartIcon filled={fav} />
        {size === 'lg' && (fav ? 'Dans mon panier' : 'À garder')}
      </button>
      <button
        type="button"
        onClick={() => toggleEcarte(code)}
        aria-pressed={out}
        aria-label={out ? `Restaurer « ${name} »` : `Écarter « ${name} » (pas pour moi)`}
        title={out ? 'Restaurer ce métier' : 'Pas pour moi'}
        className={`${base} ${dims} ${out ? 'border-slate-400 bg-slate-200 text-slate-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-800'}`}
      >
        <ThumbDownIcon filled={out} />
        {size === 'lg' && (out ? 'Écarté (restaurer)' : 'Pas pour moi')}
      </button>
    </div>
  )
}
