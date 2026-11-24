import { useMetiers } from '../lib/MetiersContext'
import { DEPARTEMENTS, TENSIONS, lienFormations, lienOffres } from '../lib/marche'
import { clean } from '../lib/text'
import { useStoredState } from '../lib/useStoredState'

/** Badge discret de tension, affiché seulement quand la donnée existe. */
export function TensionBadge({ metier }) {
  const t = TENSIONS[metier.marche_emploi?.niveau_tension]
  if (!t) return null
  return (
    <span
      className={`inline-flex items-center gap-1 self-start rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${t.classes}`}
      title={`${metier.marche_emploi.source}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {t.libelle}
    </span>
  )
}

const fmt = (n) => Number(n).toLocaleString('fr-FR')

function Bouton({ href, children, primary }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-center text-sm font-semibold shadow-sm transition-colors ${
        primary ? 'bg-teal-700 text-white hover:bg-teal-800' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
      </svg>
      <span className="sr-only">(nouvel onglet)</span>
    </a>
  )
}

/** Encart « Réalité du marché près de chez vous » de la fiche métier. */
export function MarcheLocal({ metier }) {
  const { meta } = useMetiers()
  const [dept, setDept] = useStoredState('core-explore:departement', '', (v) => (typeof v === 'string' ? v : ''))
  const me = metier.marche_emploi
  const t = TENSIONS[me?.niveau_tension]
  const nomDept = DEPARTEMENTS.find(([c]) => c === dept)?.[1]

  return (
    <section aria-labelledby="marche" className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="marche" className="text-lg font-semibold text-slate-900">
          Réalité du marché près de chez vous
        </h2>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Mon département
          <select
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          >
            <option value="">Toute la France</option>
            {DEPARTEMENTS.map(([code, nom]) => (
              <option key={code} value={code}>
                {code} – {nom}
              </option>
            ))}
          </select>
        </label>
      </div>

      {t ? (
        <div className="mt-4 space-y-2">
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Tension du marché</dt>
              <dd className="mt-1">
                <TensionBadge metier={metier} />
              </dd>
            </div>
            {me.projets_recrutement !== null && (
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">Projets de recrutement en France</dt>
                <dd className="mt-1 text-lg font-semibold text-slate-900">{fmt(me.projets_recrutement)}</dd>
              </div>
            )}
            {me.part_difficultes_recrutement !== null && (
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">Recrutements jugés difficiles</dt>
                <dd className="mt-1 text-lg font-semibold text-slate-900">{me.part_difficultes_recrutement} %</dd>
              </div>
            )}
          </dl>
          <p className="text-xs text-slate-500">
            Source : {me.source}
            {me.perimetre?.length ? ` · chiffres de la famille de métiers « ${me.perimetre.map((p) => p.replace(/^\S+\s/, '')).join(' », « ')} »` : ''}
            {meta?.marche_emploi?.methode ? '. Niveau de tension déduit de la part des recrutements difficiles.' : '.'}
            {dept ? ' Les chiffres sont nationaux ; les offres ci-dessous sont filtrées sur votre département.' : ''}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">
          Les indicateurs officiels du marché de l’emploi ne sont pas encore disponibles pour ce métier. Les liens
          ci-dessous donnent accès aux offres et statistiques à jour.
        </p>
      )}

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <Bouton href={lienOffres(metier.code_rome, dept)} primary>
          Voir les offres d’emploi{nomDept ? ` (${nomDept})` : ' actuelles'}
        </Bouton>
        {metier.officiel_rome.lien_metierscope && (
          <Bouton href={metier.officiel_rome.lien_metierscope}>Salaires &amp; statistiques détaillées</Bouton>
        )}
        <Bouton href={lienFormations(clean(metier.intitule))}>Voir les formations éligibles</Bouton>
      </div>
    </section>
  )
}
