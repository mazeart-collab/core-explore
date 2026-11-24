import { useCallback, useMemo, useState } from 'react'
import CriteriaForm from '../components/CriteriaForm'
import IntentBox from '../components/IntentBox'
import MetierCard from '../components/MetierCard'
import { DataGate, PageTitle, buttonPrimary, buttonSecondary } from '../components/ui'
import { useMetiers } from '../lib/MetiersContext'
import { EMPTY_CRITERIA, countCriteria, normalizeCriteria, rank, surprise } from '../lib/matching'
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
  return (
    <MetierCard metier={result.metier}>
      <ReasonBlocks reasons={result.reasons} gaps={result.gaps} vigilance={result.metier.enrichi_ia?.points_vigilance} />
    </MetierCard>
  )
}

function ExplorerContent() {
  const { metiers } = useMetiers()
  const [criteria, setCriteria] = useStoredState(STORAGE_KEY, EMPTY_CRITERIA, normalizeCriteria)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [surprises, setSurprises] = useState(null)

  const nbCriteria = countCriteria(criteria)
  const { results, excludedCount } = useMemo(() => rank(metiers, criteria), [metiers, criteria])

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
    setVisible(PAGE_SIZE)
  }

  return (
    <div className="space-y-6">
      <IntentBox onCriteria={applyIntent} />

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
          <CriteriaForm criteria={criteria} setCriteria={setCriteria} />
        </div>

        <div className="space-y-4" aria-live="polite">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {nbCriteria
                ? results.length
                  ? `${results.length} métier${results.length > 1 ? 's' : ''} à découvrir`
                  : 'Aucun métier ne correspond encore'
                : 'Des métiers à découvrir'}
            </h2>
            <button
              type="button"
              className={buttonPrimary}
              onClick={() => setSurprises(surprise(metiers, criteria, results))}
            >
              Surprenez-moi
            </button>
          </div>

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
              Choisissez quelques critères à gauche (ou décrivez votre métier idéal ci-dessus) : les métiers
              apparaîtront ici au fur et à mesure, avec ce qui les relie à vos choix. Vous pouvez aussi vous laisser
              surprendre.
            </p>
          )}

          {nbCriteria > 0 && excludedCount > 0 && (
            <p className="text-xs text-slate-500">
              {excludedCount} métier{excludedCount > 1 ? 's' : ''} écarté{excludedCount > 1 ? 's' : ''} par vos
              critères « Indispensable » ou « À éviter ».
            </p>
          )}

          {nbCriteria > 0 && !results.length && (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              Essayez d’assouplir certains critères (par exemple passer un critère « Indispensable » en
              « Souhaitable ») ou laissez-vous surprendre.
            </p>
          )}

          <div className="grid gap-4 2xl:grid-cols-2">
            {results.slice(0, visible).map((r) => (
              <ResultCard key={r.metier.code_rome} result={r} />
            ))}
          </div>
          {results.length > visible && (
            <div className="text-center">
              <button type="button" className={buttonSecondary} onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Afficher plus de métiers
              </button>
            </div>
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
