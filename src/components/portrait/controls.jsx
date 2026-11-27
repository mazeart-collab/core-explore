import { useState } from 'react'
import { DIMENSIONS, SYNTHESE } from '../../lib/portrait/referentiel'
import { buttonPrimary, buttonSecondary } from '../ui'
import { Icone, Numero } from './theme'
import { THEMES } from './themes'

/** Bouton arrondi sélectionnable : fond neutre, puis fond coloré et coche une fois choisi. */
export function Pastille({ actif, onClick, couleur = 'teal', children, title, onRemove }) {
  const t = THEMES[couleur]
  return (
    <span className="inline-flex">
      <button
        type="button"
        aria-pressed={actif}
        onClick={onClick}
        title={title}
        className={[
          'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
          actif ? t.actif : `border-slate-300 bg-white text-slate-700 ${t.survol}`,
          onRemove ? 'rounded-r-none border-r-0 pr-2' : '',
        ].join(' ')}
      >
        {actif && <Icone nom="coche" size={14} strokeWidth={3} />}
        {children}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Supprimer « ${children} »`}
          className={[
            'inline-flex items-center rounded-r-full border border-l-0 px-2 transition-colors',
            actif ? t.actif : 'border-slate-300 bg-white text-slate-500 hover:text-slate-900',
          ].join(' ')}
        >
          <Icone nom="croix" size={12} strokeWidth={3} />
        </button>
      )}
    </span>
  )
}

/** Champ « ajouter librement » (verbe, centre d'intérêt, savoir-faire…). */
export function AjoutLibre({ label, placeholder, onAdd, bouton = 'Ajouter' }) {
  const [texte, setTexte] = useState('')
  const submit = (e) => {
    e.preventDefault()
    const v = texte.trim()
    if (!v) return
    onAdd(v)
    setTexte('')
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label className="sr-only" htmlFor={`ajout-${label}`}>
        {label}
      </label>
      <input
        id={`ajout-${label}`}
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        maxLength={80}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-full border border-dashed border-slate-300 bg-white px-4 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
      />
      <button type="submit" disabled={!texte.trim()} className={`${buttonSecondary} rounded-full !py-2`}>
        <Icone nom="plus" size={16} className="mr-1" />
        {bouton}
      </button>
    </form>
  )
}

/** Fil d'étapes : accès libre aux six dimensions et à la synthèse. */
export function Etapes({ courante, counts, onGo }) {
  return (
    <nav aria-label="Étapes du portrait" className="no-print -mx-1 overflow-x-auto pb-1">
      <ol className="flex min-w-max gap-1.5 px-1">
        {[...DIMENSIONS, SYNTHESE].map((d) => {
          const t = THEMES[d.couleur]
          const on = d.id === courante
          const n = counts[d.id] || 0
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onGo(d.id)}
                aria-current={on ? 'step' : undefined}
                title={d.titre}
                className={[
                  'flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold transition-colors',
                  on ? `bg-white ring-2 ${t.anneau} border-transparent` : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-white',
                ].join(' ')}
              >
                <Numero dimension={d} size="sm" />
                <span className={on ? 'text-slate-900' : 'hidden sm:inline'}>{d.court}</span>
                {d.id !== 'synthese' && n > 0 && (
                  <span className={`rounded-full px-1.5 tabular-nums ${t.doux}`} aria-label={`${n} critères`}>
                    {n}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** Cadre commun d'une dimension : en-tête identitaire, consigne, contenu et navigation. */
export function DimensionFrame({ dimension, count, onReset, onPrev, onNext, nextLabel, children, aside }) {
  const t = THEMES[dimension.couleur]
  return (
    <section aria-labelledby={`titre-${dimension.id}`} className="space-y-5">
      <header className={`rounded-2xl border p-5 sm:p-6 ${t.bandeau}`}>
        <div className="flex items-start gap-4">
          <span className={`hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:inline-flex ${t.pastille}`}>
            <Icone nom={dimension.icone} size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-bold uppercase tracking-wider ${t.texte}`}>Dimension {dimension.numero} sur 6</p>
            <h2 id={`titre-${dimension.id}`} className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">
              {dimension.titre}
            </h2>
            <p className="mt-1 font-medium text-slate-700">{dimension.question}</p>
            <p className="mt-3 text-sm text-slate-600">{dimension.consigne}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className={`rounded-full px-3 py-1 font-semibold ${t.doux}`}>
            {count ? `${count} critère${count > 1 ? 's' : ''} renseigné${count > 1 ? 's' : ''}` : 'Aucun critère pour l’instant'}
          </span>
          <button
            type="button"
            onClick={onReset}
            disabled={!count}
            className="inline-flex items-center gap-1 font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline disabled:opacity-40 disabled:no-underline"
          >
            <Icone nom="reset" size={15} />
            Réinitialiser cette dimension
          </button>
        </div>
        {aside}
      </header>

      <div>{children}</div>

      <footer className="no-print flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" className={buttonSecondary} onClick={onPrev}>
          <Icone nom="retour" size={16} className="mr-1.5" />
          {dimension.numero === 1 ? 'Retour à l’accueil' : 'Dimension précédente'}
        </button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {!count && (
            <button type="button" className={buttonSecondary} onClick={onNext}>
              Passer cette étape
            </button>
          )}
          {count > 0 && (
            <button type="button" className={buttonPrimary} onClick={onNext}>
              {nextLabel}
              <Icone nom="fleche" size={16} className="ml-1.5" />
            </button>
          )}
        </div>
      </footer>
    </section>
  )
}
