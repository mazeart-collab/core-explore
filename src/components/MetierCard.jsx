import { Link } from 'react-router'
import { UNIVERS, label } from '../lib/taxonomies'
import { clean, shortDescription } from '../lib/text'
import { useSelection } from '../lib/SelectionContext'
import SelectionButtons from './SelectionButtons'
import { Tag } from './ui'

export function SecteursTags({ metier }) {
  const secteurs = metier.enrichi_ia?.secteurs || []
  if (!secteurs.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {secteurs.map((id) => (
        <Tag key={id} tone="teal">
          {label(UNIVERS, id)}
        </Tag>
      ))}
    </div>
  )
}

/** Carte compacte d'un métier, avec lien vers sa fiche. */
export default function MetierCard({ metier, aside, children }) {
  const { isEcarte } = useSelection()
  const ecarte = isEcarte(metier.code_rome)
  return (
    <article
      className={`flex flex-col gap-3 rounded-xl border bg-white p-5 transition-opacity ${ecarte ? 'border-dashed border-slate-300 opacity-55 hover:opacity-90' : 'border-slate-200'}`}
    >
      {aside}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">
          <Link to={`/metier/${metier.code_rome}`} className="hover:text-teal-700 hover:underline">
            {clean(metier.intitule)}
          </Link>
          {ecarte && <span className="ml-2 align-middle text-xs font-normal text-slate-500">(écarté)</span>}
        </h3>
        <SelectionButtons metier={metier} />
      </div>
      <SecteursTags metier={metier} />
      <p className="text-sm text-slate-600">{shortDescription(metier.officiel_rome.definition)}</p>
      {children}
      <Link
        to={`/metier/${metier.code_rome}`}
        className="mt-auto text-sm font-medium text-teal-700 hover:underline"
        aria-label={`Voir la fiche métier : ${clean(metier.intitule)}`}
      >
        Voir la fiche métier →
      </Link>
    </article>
  )
}
