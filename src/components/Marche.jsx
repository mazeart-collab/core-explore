import { useEffect, useState } from 'react'
import { DEPARTEMENTS, TENSIONS, lienFormations, lienOffres } from '../lib/marche'
import { useStoredState } from '../lib/useStoredState'

/** Badge discret de tension, affiché seulement quand la donnée existe. */
export function TensionBadge({ metier, niveau }) {
  const me = metier?.marche_emploi
  const t = TENSIONS[niveau ?? me?.niveau_tension]
  if (!t) return null
  return (
    <span
      className={`inline-flex items-center gap-1 self-start rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${t.classes}`}
      title={me?.source ? `Source : ${me.source}` : undefined}
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

/** Chiffres du département choisi, demandés à /api/marche (mis en cache côté serveur). */
function useMarcheDepartement(codeRome, dept) {
  const [etat, setEtat] = useState({ cle: '', statut: 'vide', data: null })
  const cle = dept ? `${codeRome}|${dept}` : ''
  useEffect(() => {
    if (!cle) return
    const ctrl = new AbortController()
    fetch(`/api/marche?rome=${encodeURIComponent(codeRome)}&dep=${encodeURIComponent(dept)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => setEtat({ cle, statut: 'ok', data }))
      .catch((e) => {
        if (e.name !== 'AbortError') setEtat({ cle, statut: 'erreur', data: null })
      })
    return () => ctrl.abort()
  }, [cle, codeRome, dept])
  return etat.cle === cle ? etat : { statut: cle ? 'chargement' : 'vide', data: null }
}

const aDesChiffres = (m) =>
  m && (TENSIONS[m.niveau_tension] || m.offres_12_mois !== null || m.demandeurs_emploi !== null)

function Chiffre({ titre, children, detail }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <dt className="text-xs text-slate-500">{titre}</dt>
      <dd className="mt-1 text-lg font-semibold text-slate-900">{children}</dd>
      {detail && <dd className="mt-0.5 text-xs text-slate-500">{detail}</dd>}
    </div>
  )
}

/** Encart « Réalité du marché près de chez vous » de la fiche métier. */
export function MarcheLocal({ metier }) {
  const [dept, setDept] = useStoredState('core-explore:departement', '', (v) => (typeof v === 'string' ? v : ''))
  const nomDept = DEPARTEMENTS.find(([c]) => c === dept)?.[1]
  const local = useMarcheDepartement(metier.code_rome, nomDept ? dept : '')
  const national = metier.marche_emploi
  const localOk = local.statut === 'ok' && aDesChiffres(local.data)
  const m = localOk ? local.data : national
  const zone = localOk ? nomDept : 'France entière'
  const t = TENSIONS[m?.niveau_tension]

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

      {local.statut === 'chargement' && (
        <p className="mt-4 text-sm text-slate-500" role="status">
          Chargement des chiffres pour {nomDept}…
        </p>
      )}

      {aDesChiffres(m) ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-slate-700">{zone}</p>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Difficultés de recrutement</dt>
              <dd className="mt-1">
                {t ? <TensionBadge metier={metier} niveau={m.niveau_tension} /> : <span className="text-sm text-slate-500">Non mesurées</span>}
              </dd>
              {m.periode?.tension && <dd className="mt-1 text-xs text-slate-500">{m.periode.tension.replace(/^ANNEE\b/i, "Année")}</dd>}
            </div>
            {m.offres_12_mois !== null && (
              <Chiffre titre="Offres d’emploi sur 12 mois" detail={m.periode?.offres && `jusqu’au ${m.periode.offres}`}>
                {fmt(m.offres_12_mois)}
              </Chiffre>
            )}
            {m.demandeurs_emploi !== null && (
              <Chiffre titre="Personnes qui recherchent ce métier" detail={m.periode?.demandeurs}>
                {fmt(m.demandeurs_emploi)}
              </Chiffre>
            )}
          </dl>
          {m.demandeurs_emploi !== null && (
            <p className="text-sm text-slate-600">
              Ce chiffre compte les demandeurs d’emploi inscrits à France Travail qui recherchent ce métier et qui n’ont
              pas du tout travaillé au cours du mois (on parle de « catégorie A »). Le comparer au nombre d’offres donne
              une idée de la concurrence pour un poste.
            </p>
          )}
          <p className="text-xs text-slate-500">
            Source : {m.source}
            {m.annee ? ` (${m.annee})` : ''}.
            {dept && !localOk && local.statut !== 'chargement'
              ? ` Chiffres de ${nomDept} indisponibles pour le moment : ce sont les chiffres nationaux.`
              : ''}
          </p>
        </div>
      ) : (
        local.statut !== 'chargement' && (
          <p className="mt-4 text-sm text-slate-600">
            Les indicateurs officiels du marché de l’emploi ne sont pas encore disponibles pour ce métier. Les liens
            ci-dessous donnent accès aux offres et statistiques à jour.
          </p>
        )
      )}

      {metier.officiel_rome.lien_metierscope && (
        <div className="mt-5 rounded-lg bg-amber-50 p-4 ring-1 ring-amber-200">
          <p className="text-sm font-semibold text-slate-900">Et le salaire ?</p>
          <p className="mt-1 text-sm text-slate-700">
            Les salaires de ce métier sont à retrouver sur sa fiche officielle France Travail (MétierScope), rubrique
            « Statistiques ».{' '}
            <a
              href={metier.officiel_rome.lien_metierscope}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-teal-700 underline hover:text-teal-800"
            >
              Voir les salaires sur la fiche officielle<span className="sr-only"> (nouvel onglet)</span>
            </a>
          </p>
        </div>
      )}

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <Bouton href={lienOffres(metier.code_rome, dept)} primary>
          Voir les offres d’emploi{nomDept ? ` (${nomDept})` : ' actuelles'}
        </Bouton>
        {metier.officiel_rome.lien_metierscope && (
          <Bouton href={metier.officiel_rome.lien_metierscope}>Salaires &amp; statistiques détaillées</Bouton>
        )}
        <Bouton href={lienFormations(metier.code_rome)}>Voir les formations pour ce métier</Bouton>
      </div>
    </section>
  )
}
