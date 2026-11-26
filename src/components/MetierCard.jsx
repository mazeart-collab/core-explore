import { Link } from 'react-router'
import { reperes } from '../lib/essentiel'
import { rarete } from '../lib/matching'
import { useMetiers } from '../lib/MetiersContext'
import { ACTIVITES, UNIVERS, label } from '../lib/taxonomies'
import { clean } from '../lib/text'
import { useSelection } from '../lib/SelectionContext'
import { TensionBadge } from './Marche'
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

const ICONES = {
  niveau: 'M22 10 12 5 2 10l10 5 10-5zM6 12v5c3 2 9 2 12 0v-5',
  lieu: 'M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  teletravail: 'M3 11 12 4l9 7M5 10v10h14V10',
  horaires: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
}

/** Repères essentiels d'un métier (accès, lieu, télétravail, horaires, recrutement). */
export function Reperes({ metier }) {
  const list = reperes(metier)
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-slate-600">
      {list.map((r) => (
        <li key={r.id} className="inline-flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400" aria-hidden="true">
            <path d={ICONES[r.id]} />
          </svg>
          {r.id === 'niveau' ? <span><span className="sr-only">Niveau d’accès : </span>{r.libelle}</span> : r.libelle}
        </li>
      ))}
      <li>
        <TensionBadge metier={metier} />
      </li>
    </ul>
  )
}

/** Les 3 activités les plus caractéristiques du métier (les plus rares parmi tous les métiers). */
export function ActivitesPhares({ metier }) {
  const { metiers } = useMetiers()
  const ids = metier.enrichi_ia?.activites || []
  if (!ids.length) return null
  const poids = rarete(metiers)
  const top = [...ids].sort((a, b) => poids('activites', b) - poids('activites', a)).slice(0, 3)
  return (
    <p className="text-sm text-slate-700">
      <span className="font-medium text-slate-900">Au quotidien : </span>
      {top.map((id) => label(ACTIVITES, id)).join(' · ')}
    </p>
  )
}

/**
 * Carte compacte d'un métier, avec lien vers sa fiche.
 * Sans `children`, elle montre les activités phares ; avec, elle laisse la place au contenu fourni.
 */
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
      <Reperes metier={metier} />
      {children ?? <ActivitesPhares metier={metier} />}
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
