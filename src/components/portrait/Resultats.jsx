import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMetiers } from '../../lib/MetiersContext'
import { useSelection } from '../../lib/SelectionContext'
import { tensionRang } from '../../lib/marche'
import { etoiles, rechercher } from '../../lib/portrait/moteur'
import { FAMILLES } from '../../lib/taxonomies'
import { clean } from '../../lib/text'
import { useStoredState } from '../../lib/useStoredState'
import { Stars } from '../ikigai'
import MetierCard from '../MetierCard'
import { buttonPrimary, buttonSecondary } from '../ui'
import { Icone } from './theme'

const PAGE = 12
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`

function Explications({ r }) {
  const points = [...r.incompatibilites.map((t) => ({ t, ton: 'incompatible' })), ...r.vigilance.map((t) => ({ t, ton: 'vigilance' })), ...r.aVerifier.map((t) => ({ t }))]
  const vigilanceMetier = (r.metier.enrichi_ia?.points_vigilance || []).map(clean)
  return (
    <div className="space-y-3 text-sm">
      {r.raisons.length > 0 && (
        <div className="rounded-lg bg-teal-50/60 p-3">
          <p className="mb-1 font-semibold text-teal-900">Ce qui relie ce métier à votre portrait</p>
          <ul className="space-y-1 text-slate-700">
            {r.raisons.map((x) => (
              <li key={x.dimension}>
                <span className="font-medium">{x.dimension} : </span>
                {x.items.join(' ; ')}
              </li>
            ))}
          </ul>
        </div>
      )}
      {(points.length > 0 || vigilanceMetier.length > 0) && (
        <details className="group rounded-lg bg-amber-50/70 p-3" open={r.incompatibilites.length > 0 || r.vigilance.length > 0}>
          <summary className="cursor-pointer list-none font-semibold text-amber-900">
            <span className="inline-flex items-center gap-1">
              Points à vérifier ({points.length + vigilanceMetier.length})
              <Icone nom="chevron" size={16} className="transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
            {points.map((p, i) => (
              <li key={i} className={p.ton === 'incompatible' ? 'font-medium text-rose-800' : p.ton === 'vigilance' ? 'text-rose-800' : ''}>
                {p.t}
              </li>
            ))}
            {vigilanceMetier.map((p, i) => (
              <li key={`m${i}`}>{p}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function Badges({ r }) {
  const indispensable = r.aVerifier.some((t) => t.includes('indispensable'))
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
      <Stars count={etoiles(r)} />
      {r.incompatibilites.length > 0 && <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-rose-800">Ne respecte pas une condition indispensable</span>}
      {indispensable && <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-sky-800">Condition indispensable à vérifier</span>}
      {r.vigilance.length > 0 && <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-rose-700 ring-1 ring-rose-200">Point de vigilance</span>}
    </div>
  )
}

function Carte({ r }) {
  return (
    <MetierCard metier={r.metier} aside={<Badges r={r} />}>
      <Explications r={r} />
    </MetierCard>
  )
}

function Groupe({ id, titre, description, liste, icone, ton, vide }) {
  const [n, setN] = useState(PAGE)
  if (!liste.length && !vide) return null
  return (
    <section aria-labelledby={`g-${id}`} className={`rounded-2xl border p-4 sm:p-5 ${ton}`}>
      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-teal-800 shadow-sm">
          <Icone nom={icone} size={20} />
        </span>
        <div>
          <h3 id={`g-${id}`} className="text-lg font-semibold text-slate-900">
            {titre} <span className="font-normal text-slate-500">({liste.length})</span>
          </h3>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
      </div>
      {liste.length ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            {liste.slice(0, n).map((r) => (
              <Carte key={r.metier.code_rome} r={r} />
            ))}
          </div>
          {liste.length > n && (
            <div className="mt-4 text-center">
              <button type="button" className={buttonSecondary} onClick={() => setN(n + PAGE)}>
                Voir plus ({liste.length - n} restante{liste.length - n > 1 ? 's' : ''})
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-600">{vide}</p>
      )}
    </section>
  )
}

/** Pistes professionnelles : trois groupes, filtre par secteur, mode élargi, liste complète. */
export default function Resultats({ portrait, onSynthese }) {
  const { metiers } = useMetiers()
  const { ecartes } = useSelection()
  const [elargi, setElargi] = useState(false)
  const [famille, setFamille] = useState(null)
  const [tout, setTout] = useState(false)
  const [recrutent, setRecrutent] = useStoredState('core-explore:privilegier-recrutement', false, Boolean)
  const hasMarche = useMemo(() => metiers.some((m) => m.marche_emploi && m.marche_emploi.niveau_tension !== 'inconnue'), [metiers])

  const actifs = useMemo(() => metiers.filter((m) => !ecartes[m.code_rome]), [metiers, ecartes])
  const nbEcartes = metiers.length - actifs.length
  const res = useMemo(() => rechercher(actifs, portrait, { elargi }), [actifs, portrait, elargi])

  const filtre = (l) => {
    let out = famille ? l.filter((r) => r.famille === famille) : l
    if (recrutent && hasMarche) out = [...out].sort((a, b) => tensionRang(a.metier) - tensionRang(b.metier) || b.score - a.score)
    return out
  }
  const comptes = useMemo(() => {
    const c = {}
    for (const r of res.tous) c[r.famille] = (c[r.famille] || 0) + 1
    return c
  }, [res])
  // Avec un filtre, les pistes pertinentes ne sont plus limitées par la règle de diversité.
  const pertinentes = famille ? filtre(res.tous.filter((r) => r.score >= 0.55 && !r.exclu)).slice(0, 12) : filtre(res.pertinentes)
  const vus = new Set(pertinentes.map((r) => r.metier.code_rome))
  const decouvertes = famille ? [] : filtre(res.decouvertes)
  decouvertes.forEach((r) => vus.add(r.metier.code_rome))
  const aExplorer = filtre(famille ? res.tous.filter((r) => r.score >= 0.35) : res.aExplorer).filter((r) => !vus.has(r.metier.code_rome))

  const k = `${famille}-${elargi}-${recrutent}`

  return (
    <section aria-labelledby="titre-resultats" className="space-y-5" aria-live="polite">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="titre-resultats" className="text-xl font-semibold text-slate-900">
            Mes pistes professionnelles
          </h2>
          <p className="max-w-2xl text-sm text-slate-600">
            {res.tous.length
              ? `${plural(res.tous.length, 'métier')} ont au moins un point commun avec votre portrait. Ce ne sont pas des verdicts : chaque piste explique ses correspondances et ce qu’il reste à vérifier.`
              : 'Aucun métier ne correspond encore à votre portrait. Ajoutez des critères ou assouplissez une condition indispensable.'}
          </p>
        </div>
        <div className="no-print flex flex-col gap-2 sm:flex-row">
          <button type="button" className={buttonSecondary} onClick={onSynthese}>
            <Icone nom="portrait" size={16} className="mr-1.5" />
            Modifier mon portrait
          </button>
          <button type="button" className={buttonSecondary} onClick={() => window.print()}>
            <Icone nom="imprimer" size={16} className="mr-1.5" />
            Imprimer
          </button>
        </div>
      </div>

      <div className="no-print space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Filtrer par secteur</p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
            <button
              type="button"
              aria-pressed={!famille}
              onClick={() => setFamille(null)}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-sm font-medium ${!famille ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 text-slate-700 hover:border-teal-500'}`}
            >
              Tous les secteurs
            </button>
            {FAMILLES.filter((f) => comptes[f.id]).map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={famille === f.id}
                onClick={() => setFamille(famille === f.id ? null : f.id)}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-sm font-medium ${famille === f.id ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 text-slate-700 hover:border-teal-500'}`}
              >
                {f.libelle} <span className="tabular-nums opacity-70">({comptes[f.id]})</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:gap-6">
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={elargi} onChange={(e) => setElargi(e.target.checked)} className="mt-0.5 h-4 w-4 accent-teal-700" />
            <span>
              Élargir la recherche
              <span className="block text-xs text-slate-500">
                {elargi
                  ? 'Les métiers qui ne respectent pas une condition indispensable sont affichés, avec la mention correspondante.'
                  : res.exclus
                    ? `${plural(res.exclus, 'métier')} écarté${res.exclus > 1 ? 's' : ''} par une condition indispensable.`
                    : 'Inclure les métiers qui ne respectent pas toutes vos conditions indispensables.'}
              </span>
            </span>
          </label>
          <label className={`flex items-start gap-2 text-sm ${hasMarche ? 'text-slate-700' : 'text-slate-400'}`}>
            <input
              type="checkbox"
              checked={recrutent && hasMarche}
              disabled={!hasMarche}
              onChange={(e) => setRecrutent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-teal-700"
            />
            <span>
              Privilégier les métiers qui recrutent
              <span className="block text-xs text-slate-500">Les métiers en tension (source France Travail) passent en premier.</span>
            </span>
          </label>
        </div>
      </div>

      <Groupe
        key={`p-${k}`}
        id="pertinentes"
        icone="etoile"
        ton="border-teal-200 bg-teal-50/40"
        titre="Les pistes les plus pertinentes"
        description="Des métiers qui présentent plusieurs correspondances avec votre portrait, issus d’univers variés."
        liste={pertinentes}
        vide="Aucune piste ne réunit encore plusieurs correspondances. Consultez les pistes à explorer, ou complétez une autre dimension."
      />
      <Groupe
        key={`d-${k}`}
        id="decouvertes"
        icone="boussole"
        ton="border-amber-200 bg-amber-50/40"
        titre="Les découvertes inattendues"
        description="Des métiers d’autres secteurs, qui partagent des activités ou des savoir-faire avec vos aspirations."
        liste={decouvertes}
      />
      <Groupe
        key={`e-${k}`}
        id="explorer"
        icone="loupe"
        ton="border-slate-200 bg-slate-100/50"
        titre="Les pistes à explorer"
        description="Des correspondances intéressantes, qui demandent certaines vérifications."
        liste={aExplorer}
      />

      <div className="no-print text-center">
        <button type="button" className={buttonPrimary} onClick={() => setTout((x) => !x)}>
          {tout ? 'Masquer la liste complète' : `Afficher l’ensemble des résultats (${filtre(res.tous).length})`}
        </button>
      </div>
      {tout && (
        <Groupe
          key={`t-${k}`}
          id="tous"
          icone="pistes"
          ton="border-slate-200 bg-white"
          titre="Tous les résultats"
          description="Tous les métiers ayant au moins un point commun avec votre portrait, des plus proches aux plus éloignés."
          liste={filtre(res.tous)}
        />
      )}

      <p className="text-xs text-slate-500">
        {nbEcartes > 0 && (
          <>
            {plural(nbEcartes, 'métier')} écarté{nbEcartes > 1 ? 's' : ''} (« Pas pour moi ») masqué{nbEcartes > 1 ? 's' : ''},{' '}
            <Link to="/panier" className="font-medium text-teal-700 hover:underline">
              à retrouver dans mon panier
            </Link>
            .{' '}
          </>
        )}
        <Link to="/univers" className="font-medium text-teal-700 hover:underline">
          Revenir au catalogue général des métiers
        </Link>
      </p>
    </section>
  )
}
