import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMetiers } from '../../lib/MetiersContext'
import { useSelection } from '../../lib/SelectionContext'
import { tensionRang } from '../../lib/marche'
import { NIVEAUX, PAGE_RESULTATS, rank, surprise } from '../../lib/matching'
import { portraitToCriteria } from '../../lib/portrait/adapter'
import { clean } from '../../lib/text'
import { useStoredState } from '../../lib/useStoredState'
import MetierCard from '../MetierCard'
import { IkigaiBadges, Stars } from '../ikigai'
import { buttonPrimary, buttonSecondary } from '../ui'
import { Icone } from './theme'

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

function StarGroup({ niveau, results, total, open, onToggle }) {
  const id = `groupe-${niveau.etoiles}`
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
            Métiers {niveau.etoiles} étoiles ({total})
          </span>
          <span className="text-sm text-slate-500">{niveau.libelle}</span>
          <Icone nom="chevron" size={18} className={`ml-auto text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </h3>
      {open && (
        <div id={id} className="px-3 pb-3 sm:px-4 sm:pb-4">
          <div className="grid gap-4 xl:grid-cols-2">
            {results.map((r) => (
              <ResultCard key={r.metier.code_rome} result={r} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`

/**
 * Pistes professionnelles calculées à partir du portrait.
 * Étape 1 de la refonte : le portrait est traduit vers le moteur V1 (lib/portrait/adapter.js).
 */
export default function Resultats({ portrait, onSynthese }) {
  const { metiers } = useMetiers()
  const { ecartes } = useSelection()
  const criteria = useMemo(() => portraitToCriteria(portrait), [portrait])
  const actifs = useMemo(() => metiers.filter((m) => !ecartes[m.code_rome]), [metiers, ecartes])
  const nbEcartes = metiers.length - actifs.length
  const { results, hiddenCount } = useMemo(() => rank(actifs, criteria, metiers), [actifs, criteria, metiers])
  const [surprises, setSurprises] = useState(null)
  const [closed, setClosed] = useState(() => new Set())
  const [recrutent, setRecrutent] = useStoredState('core-explore:privilegier-recrutement', false, Boolean)
  const hasMarche = useMemo(() => metiers.some((m) => m.marche_emploi && m.marche_emploi.niveau_tension !== 'inconnue'), [metiers])
  const ordered = useMemo(
    () =>
      recrutent && hasMarche
        ? [...results].sort((a, b) => b.stars - a.stars || tensionRang(a.metier) - tensionRang(b.metier) || b.rate - a.rate)
        : results,
    [results, recrutent, hasMarche],
  )
  const [pages, setPages] = useState({ liste: null, n: 1 })
  const nbPages = pages.liste === results ? pages.n : 1
  const shown = ordered.slice(0, nbPages * PAGE_RESULTATS)
  const rest = ordered.length - shown.length
  const groups = NIVEAUX.map((niveau) => ({
    niveau,
    results: shown.filter((r) => r.stars === niveau.etoiles),
    total: ordered.filter((r) => r.stars === niveau.etoiles).length,
  })).filter((g) => g.results.length)

  return (
    <section aria-labelledby="titre-resultats" className="space-y-4" aria-live="polite">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="titre-resultats" className="text-xl font-semibold text-slate-900">
            {results.length ? `${plural(results.length, 'piste')} à explorer` : 'Aucune piste pour l’instant'}
          </h2>
          <p className="text-sm text-slate-600">
            Ce ne sont pas des verdicts : chaque métier indique ce qui le relie à votre portrait et ce qu’il faut vérifier.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" className={buttonSecondary} onClick={onSynthese}>
            <Icone nom="portrait" size={16} className="mr-1.5" />
            Mon portrait
          </button>
          <button type="button" className={buttonPrimary} onClick={() => setSurprises(surprise(actifs, criteria, results))}>
            Surprenez-moi
          </button>
        </div>
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
              ? 'À étoiles égales, les métiers en tension (source France Travail) passent en premier.'
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
            <button type="button" onClick={() => setSurprises(null)} className="text-sm text-slate-500 hover:text-slate-800">
              Fermer
            </button>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {surprises.map((r) => (
              <ResultCard key={r.metier.code_rome} result={r} />
            ))}
          </div>
        </section>
      )}

      {!results.length && (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Essayez d’assouplir certains critères (par exemple passer un critère « Indispensable » en « Souhaitable »), d’en
          ajouter dans d’autres dimensions, ou laissez-vous surprendre.
        </p>
      )}

      {groups.map((g) => (
        <StarGroup
          key={g.niveau.etoiles}
          niveau={g.niveau}
          results={g.results}
          total={g.total}
          open={!closed.has(g.niveau.etoiles)}
          onToggle={() =>
            setClosed((s) => {
              const n = new Set(s)
              if (n.has(g.niveau.etoiles)) n.delete(g.niveau.etoiles)
              else n.add(g.niveau.etoiles)
              return n
            })
          }
        />
      ))}

      {rest > 0 && (
        <div className="text-center">
          <button type="button" className={buttonSecondary} onClick={() => setPages({ liste: results, n: nbPages + 1 })}>
            Voir plus de métiers ({Math.min(rest, PAGE_RESULTATS)} sur {rest} restant{rest > 1 ? 's' : ''})
          </button>
        </div>
      )}

      {nbEcartes > 0 && (
        <p className="text-xs text-slate-500">
          {plural(nbEcartes, 'métier')} écarté{nbEcartes > 1 ? 's' : ''} (« Pas pour moi ») masqué{nbEcartes > 1 ? 's' : ''}.{' '}
          <Link to="/panier" className="font-medium text-teal-700 hover:underline">
            Les retrouver dans mon panier
          </Link>
        </p>
      )}
      {hiddenCount > 0 && (
        <p className="text-xs text-slate-500">
          {`${plural(hiddenCount, 'autre métier')} partage${hiddenCount > 1 ? 'nt' : ''} un point commun avec votre portrait, sans être assez proche${hiddenCount > 1 ? 's' : ''} pour être affiché${hiddenCount > 1 ? 's' : ''}.`}{' '}
          <Link to="/univers" className="font-medium text-teal-700 hover:underline">
            Revenir au catalogue général
          </Link>
        </p>
      )}
    </section>
  )
}
