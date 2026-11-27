import { isPerso, persoId, persoLabel, toggleIn } from '../../lib/portrait/model'
import { INTERETS } from '../../lib/portrait/referentiel'
import { AjoutLibre } from './controls'
import { Icone } from './theme'

const FONDS = {
  rose: 'bg-rose-50',
  teal: 'bg-teal-50',
  amber: 'bg-amber-50',
  emerald: 'bg-emerald-50',
  blue: 'bg-blue-50',
  sky: 'bg-sky-50',
}

function CarteInteret({ libelle, emoji, fond, actif, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={onClick}
      className={[
        'relative flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 text-center transition',
        FONDS[fond] || 'bg-slate-50',
        actif ? 'border-amber-500 shadow-md ring-2 ring-amber-300' : 'border-transparent hover:-translate-y-0.5 hover:shadow-md',
      ].join(' ')}
    >
      {actif && (
        <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white">
          <Icone nom="coche" size={14} strokeWidth={3} />
          <span className="sr-only">Sélectionné</span>
        </span>
      )}
      <span className="text-4xl leading-none" aria-hidden="true">
        {emoji}
      </span>
      <span className="text-sm font-semibold leading-snug text-slate-800">{libelle}</span>
    </button>
  )
}

/** Dimension 3 : tableau d'inspiration en cartes illustrées. */
export default function DimInterets({ portrait, setPortrait }) {
  const toggle = (id) => setPortrait((p) => ({ ...p, interets: toggleIn(p.interets, id) }))
  const perso = portrait.interets.filter(isPerso)
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {INTERETS.map((x) => (
          <CarteInteret key={x.id} {...x} actif={portrait.interets.includes(x.id)} onClick={() => toggle(x.id)} />
        ))}
        {perso.map((id) => (
          <CarteInteret key={id} libelle={persoLabel(id)} emoji="✨" fond="amber" actif onClick={() => toggle(id)} />
        ))}
      </div>
      <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/40 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Ajouter un centre d’intérêt</h3>
        <AjoutLibre
          label="Ajouter un centre d’intérêt"
          placeholder="Par exemple : astronomie, jardinage, cinéma…"
          onAdd={(t) => setPortrait((p) => (p.interets.includes(persoId(t)) ? p : { ...p, interets: [...p.interets, persoId(t)] }))}
        />
      </div>
    </div>
  )
}
