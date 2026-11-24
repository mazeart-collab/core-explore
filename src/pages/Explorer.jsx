import { useCallback, useMemo, useState } from 'react'
import CriteriaForm from '../components/CriteriaForm'
import Guide from '../components/Guide'
import IntentBox from '../components/IntentBox'
import MetierCard from '../components/MetierCard'
import { IkigaiBadges, IkigaiDiagram, Stars } from '../components/ikigai'
import { DataGate, PageTitle, buttonPrimary, buttonSecondary } from '../components/ui'
import { Link } from 'react-router'
import { useMetiers } from '../lib/MetiersContext'
import { useSelection } from '../lib/SelectionContext'
import { tensionRang } from '../lib/marche'
import {
  EMPTY_CRITERIA,
  NIVEAUX,
  PILIERS,
  countCriteria,
  normalizeCriteria,
  rank,
  surprise,
} from '../lib/matching'
import { ACTIVITES, CENTRES_INTERET, COMPETENCES, CRITERES_BY_ID, MOTIVATIONS, SENS, conditionLabel, label } from '../lib/taxonomies'
import { clean } from '../lib/text'
import { useStoredState } from '../lib/useStoredState'

const STORAGE_KEY = 'core-explore:criteres:v1'
const PAGE_SIZE = 12

/** Fusionne les critères proposés par l'API dans les critères actuels ; renvoie le nombre d'ajouts. */
function mergeCriteria(current, incoming) {
  const next = normalizeCriteria(structuredClone(current))
  const inc = normalizeCriteria(incoming)
  let added = 0
  for (const k of ['activites', 'centres_interet', 'sens_causes', 'motivations']) {
    for (const id of inc[k]) {
      if (!next[k].includes(id)) {
        next[k].push(id)
        added++
      }
    }
  }
  for (const [id, etat] of Object.entries(inc.competences)) {
    if (next.competences[id] !== etat) added++
    next.competences[id] = etat
  }
  for (const [id, pref] of Object.entries(inc.conditions)) {
    if (!pref?.valeurs?.length) continue
    if (JSON.stringify(next.conditions[id]) !== JSON.stringify(pref)) added++
    next.conditions[id] = pref
  }
  return { next, added }
}

function ReasonBlocks({ reasons, gaps, vigilance }) {
  const points = [...(gaps || []), ...(vigilance || []).map(clean)]
  return (
    <div className="space-y-3 text-sm">
      {reasons?.length > 0 && (
        <div className="rounded-lg bg-teal-50/60 p-3">
          <p className="mb-1 font-semibold text-teal-900">Pourquoi découvrir ce métier ?</p>
          <ul className="space-y-1 text-slate-700">
            {reasons.map((r) => (
              <li key={r.dimension}>
                <span className="font-medium">{r.dimension} : </span>
                {r.items.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}
      {points.length > 0 && (
        <div className="rounded-lg bg-amber-50/70 p-3">
          <p className="mb-1 font-semibold text-amber-900">Points à approfondir</p>
          <ul className="list-disc space-y-1 pl-5 text-slate-700">
            {points.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}


function ResultCard({ result }) {
  const aside = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {result.stars >= 2 ? <Stars count={result.stars} /> : <span className="text-xs text-slate-500">Piste inattendue</span>}
      <IkigaiBadges piliers={result.piliers} />
    </div>
  )
  return (
    <MetierCard metier={result.metier} aside={aside}>
      <ReasonBlocks reasons={result.reasons} gaps={result.gaps} vigilance={result.metier.enrichi_ia?.points_vigilance} />
    </MetierCard>
  )
}

function Chevron({ open }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`ml-auto shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

/** Section repliable d'un niveau d'étoiles, affichée par pages. */
function StarGroup({ niveau, results, open, onToggle }) {
  const [visible, setVisible] = useState(PAGE_SIZE)
  const id = `groupe-${niveau.etoiles}`
  const rest = results.length - visible
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-100/50">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
          className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left"
        >
          <Stars count={niveau.etoiles} />
          <span className="font-semibold text-slate-900">
            Métiers {niveau.etoiles} étoiles ({results.length})
          </span>
          <span className="text-sm text-slate-500">{niveau.libelle}</span>
          <Chevron open={open} />
        </button>
      </h3>
      {open && (
        <div id={id} className="px-3 pb-3 sm:px-4 sm:pb-4">
          <div className="grid gap-4 2xl:grid-cols-2">
            {results.slice(0, visible).map((r) => (
              <ResultCard key={r.metier.code_rome} result={r} />
            ))}
          </div>
          {rest > 0 && (
            <div className="mt-4 text-center">
              <button type="button" className={buttonSecondary} onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Afficher plus ({rest} restant{rest > 1 ? 's' : ''})
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

/** Mots-clés choisis, regroupés par pilier de l'Ikigai (pour l'encart « Votre Ikigai »). */
function ikigaiTags(c) {
  const ETAT = { utiliser: '', developper: 'À développer : ', ne_plus: '' }
  return {
    aime: [...c.activites.map((id) => label(ACTIVITES, id)), ...c.centres_interet.map((id) => label(CENTRES_INTERET, id))].map(
      (l) => ({ label: l }),
    ),
    talents: Object.entries(c.competences).map(([id, etat]) => ({
      label: ETAT[etat] + label(COMPETENCES, id),
      negative: etat === 'ne_plus',
    })),
    sens: c.sens_causes.map((id) => ({ label: label(SENS, id) })),
    equilibre: [
      ...c.motivations.map((id) => ({ label: label(MOTIVATIONS, id) })),
      ...Object.entries(c.conditions)
        .filter(([id, p]) => p?.valeurs?.length && CRITERES_BY_ID[id])
        .map(([id, p]) => ({
          label: `${CRITERES_BY_ID[id].libelle} : ${conditionLabel(id, p.valeurs.length === 1 ? p.valeurs[0] : p.valeurs)}${p.importance === 'indispensable' ? ' (indispensable)' : ''}`,
          negative: p.importance === 'eviter',
        })),
    ],
  }
}

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`

function ExplorerContent() {
  const { metiers } = useMetiers()
  const [criteria, setCriteria] = useStoredState(STORAGE_KEY, EMPTY_CRITERIA, normalizeCriteria)
  const [surprises, setSurprises] = useState(null)
  const [openPanel, setOpenPanel] = useState('activites')
  // Groupes d'étoiles repliés par l'utilisateur (le groupe 2 étoiles l'est par défaut).
  const [closedGroups, setClosedGroups] = useState(() => new Set([2]))

  const nbCriteria = countCriteria(criteria)
  const { ecartes } = useSelection()
  // Les métiers écartés (« Pas pour moi ») sortent des résultats actifs ; ils restent dans le panier.
  const actifs = useMemo(() => metiers.filter((m) => !ecartes[m.code_rome]), [metiers, ecartes])
  const nbEcartes = metiers.length - actifs.length
  const { results, hiddenCount } = useMemo(() => rank(actifs, criteria), [actifs, criteria])
  // « Privilégier les métiers qui recrutent » : à étoiles égales, les métiers en tension passent devant.
  const [recrutent, setRecrutent] = useStoredState('core-explore:privilegier-recrutement', false, Boolean)
  const hasMarche = useMemo(() => metiers.some((m) => m.marche_emploi && m.marche_emploi.niveau_tension !== 'inconnue'), [metiers])
  const groups = useMemo(
    () =>
      NIVEAUX.map((niveau) => {
        let list = results.filter((r) => r.stars === niveau.etoiles)
        if (recrutent && hasMarche) list = [...list].sort((a, b) => tensionRang(a.metier) - tensionRang(b.metier) || b.rate - a.rate)
        return { niveau, results: list }
      }).filter((g) => g.results.length),
    [results, recrutent, hasMarche],
  )

  const pilierTags = useMemo(() => ikigaiTags(criteria), [criteria])

  // Clic sur un cercle de l'Ikigai : ouvre la section correspondante et la fait défiler à l'écran.
  const selectPilier = (id) => {
    const pilier = PILIERS.find((p) => p.id === id)
    const panelId = pilier.panels.includes(openPanel) ? openPanel : pilier.panels[0]
    setOpenPanel(panelId)
    setTimeout(() => {
      document.getElementById(`criteres-${panelId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const toggleGroup = (etoiles) =>
    setClosedGroups((s) => {
      const next = new Set(s)
      if (next.has(etoiles)) next.delete(etoiles)
      else next.add(etoiles)
      return next
    })

  const applyIntent = useCallback(
    (incoming) => {
      const { next, added } = mergeCriteria(criteria, incoming)
      setCriteria(next)
      return added
    },
    [criteria, setCriteria],
  )

  const reset = () => {
    setCriteria(EMPTY_CRITERIA)
    setSurprises(null)
  }

  return (
    <div className="space-y-6">
      <Guide />
      <IntentBox onCriteria={applyIntent} />
      <IkigaiDiagram tags={pilierTags} onSelect={selectPilier} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Mes critères</h2>
            <button
              type="button"
              onClick={reset}
              disabled={!nbCriteria}
              className="text-sm font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline disabled:opacity-40 disabled:no-underline"
            >
              Réinitialiser
            </button>
          </div>
          <p className="mb-3 text-xs text-slate-500">
            Aucun champ n’est obligatoire. Vos choix sont enregistrés automatiquement sur cet appareil.
          </p>
          <CriteriaForm criteria={criteria} setCriteria={setCriteria} openPanel={openPanel} setOpenPanel={setOpenPanel} />
        </div>

        <div className="space-y-4" aria-live="polite">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {nbCriteria
                ? results.length
                  ? `${plural(results.length, 'métier')} à découvrir`
                  : 'Aucun métier ne correspond encore'
                : 'Des métiers à découvrir'}
            </h2>
            <button
              type="button"
              className={buttonPrimary}
              onClick={() => setSurprises(surprise(actifs, criteria, results))}
            >
              Surprenez-moi
            </button>
          </div>

          <label
            className={`flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ${hasMarche ? 'text-slate-700' : 'text-slate-400'}`}
          >
            <input
              type="checkbox"
              checked={recrutent && hasMarche}
              disabled={!hasMarche}
              onChange={(e) => setRecrutent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-teal-700"
            />
            <span>
              Privilégier les métiers qui recrutent
              <span className="block text-xs text-slate-500">
                {hasMarche
                  ? 'À étoiles égales, les métiers en tension (source France Travail, enquête BMO) passent en premier.'
                  : 'Disponible dès que les indicateurs du marché de l’emploi auront été importés.'}
              </span>
            </span>
          </label>

          {surprises && (
            <section className="rounded-xl border border-dashed border-teal-300 bg-white p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">Des pistes moins évidentes</h3>
                  <p className="text-sm text-slate-500">Des métiers variés, issus d’univers différents.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSurprises(null)}
                  className="text-sm text-slate-500 hover:text-slate-800"
                >
                  Fermer
                </button>
              </div>
              {surprises.length ? (
                <div className="grid gap-4 2xl:grid-cols-2">
                  {surprises.map((r) => (
                    <ResultCard key={r.metier.code_rome} result={r} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">Pas d’autre piste pour l’instant : élargissez vos critères.</p>
              )}
            </section>
          )}

          {!nbCriteria && (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              Choisissez quelques critères (ou décrivez votre métier idéal ci-dessus) : les métiers apparaîtront ici,
              classés par étoiles, avec ce qui les relie à vos choix. Vous pouvez aussi vous laisser surprendre.
            </p>
          )}

          {nbCriteria > 0 && !results.length && (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              Essayez d’assouplir certains critères (par exemple passer un critère « Indispensable » en
              « Souhaitable ») ou laissez-vous surprendre.
            </p>
          )}

          {groups.map((g) => (
            <StarGroup
              key={g.niveau.etoiles}
              niveau={g.niveau}
              results={g.results}
              open={!closedGroups.has(g.niveau.etoiles)}
              onToggle={() => toggleGroup(g.niveau.etoiles)}
            />
          ))}

          {nbEcartes > 0 && (
            <p className="text-xs text-slate-500">
              {plural(nbEcartes, 'métier')} écarté{nbEcartes > 1 ? 's' : ''} (« Pas pour moi ») masqué
              {nbEcartes > 1 ? 's' : ''}.{' '}
              <Link to="/panier" className="font-medium text-teal-700 hover:underline">
                Les retrouver dans mon panier
              </Link>
            </p>
          )}

          {nbCriteria > 0 && hiddenCount > 0 && (
            <p className="text-xs text-slate-500">
              {hiddenCount > 0 &&
                `${plural(hiddenCount, 'autre métier')} partage${hiddenCount > 1 ? 'nt' : ''} un point commun avec vos choix, sans être assez proche${hiddenCount > 1 ? 's' : ''} pour être affiché${hiddenCount > 1 ? 's' : ''}.`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Explorer() {
  return (
    <>
      <PageTitle title="Je trouve ce qui m’anime">
        Partez de vos envies, de vos compétences et de ce qui compte pour vous. Les métiers proposés ne sont pas un
        verdict : ce sont des pistes à explorer, avec ce qui les relie à vos choix et les points à approfondir.
      </PageTitle>
      <DataGate>
        <ExplorerContent />
      </DataGate>
    </>
  )
}
