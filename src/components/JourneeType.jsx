// « À quoi ressemble le quotidien ? » : construit uniquement à partir des données
// déjà présentes (officiel_rome et enrichi_ia), sans appel à une IA.
import { conditionLabel } from '../lib/taxonomies'
import { buildJournee, lowerFirst } from '../lib/journee'

const ICONS = {
  ou: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  rythme: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  qui: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.5M18 20a6 6 0 0 0-3-5.2" />
    </>
  ),
}

// Libellés plus parlants pour les valeurs « mixte », lues hors contexte.
const MIXTE = {
  bureau_terrain: 'Entre bureau et terrain',
  interieur_exterieur: 'En intérieur et en extérieur',
  individuel_collectif: 'Seul et en équipe',
}

/** Valeurs connues d'une liste de critères, sous forme de libellés. */
function facts(ct, ids) {
  return ids
    .map((id) => {
      const v = ct[id]
      if (v === null || v === undefined || v === 'variable') return null
      if (v === 'mixte' && MIXTE[id]) return MIXTE[id]
      if (id === 'teletravail') return `Télétravail : ${lowerFirst(conditionLabel(id, v))}`
      return conditionLabel(id, v)
    })
    .filter(Boolean)
}

function Glance({ icon, title, items }) {
  return (
    <div className="flex gap-3 rounded-lg bg-white/80 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {ICONS[icon]}
        </svg>
      </span>
      <div className="min-w-0">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
        {items.length ? (
          <ul className="mt-0.5 text-sm text-slate-800">
            {items.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-0.5 text-sm text-slate-500">Variable selon le poste</p>
        )}
      </div>
    </div>
  )
}

export default function JourneeType({ metier }) {
  const o = metier.officiel_rome
  const ct = metier.enrichi_ia?.conditions_travail || {}
  const texte = buildJournee(o)
  const ou = facts(ct, ['cadre', 'bureau_terrain', 'interieur_exterieur'])
  const rythme = facts(ct, ['horaires', 'rythme', 'teletravail'])
  const qui = facts(ct, ['individuel_collectif', 'relations_humaines'])
  if (!texte && !ou.length && !rythme.length && !qui.length) return null

  return (
    <section aria-labelledby="quotidien" className="rounded-xl border border-teal-100 bg-teal-50/60 p-5 sm:p-6">
      <h2 id="quotidien" className="text-lg font-semibold text-slate-900">
        À quoi ressemble le quotidien ?
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Glance icon="ou" title="Où se passe la journée" items={ou} />
        <Glance icon="rythme" title="Rythme et horaires" items={rythme} />
        <Glance icon="qui" title="Avec qui" items={qui} />
      </div>
      {texte && <p className="mt-4 leading-relaxed text-slate-700">{texte}</p>}
      <p className="mt-3 text-xs text-slate-500">
        Synthèse construite à partir de la fiche ROME et des repères enrichis : la réalité varie selon l’employeur.
      </p>
    </section>
  )
}
