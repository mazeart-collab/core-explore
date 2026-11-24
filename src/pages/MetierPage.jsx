import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import JourneeType from '../components/JourneeType'
import { SecteursTags } from '../components/MetierCard'
import SelectionButtons from '../components/SelectionButtons'
import { DataGate, Tag } from '../components/ui'
import { useMetiers } from '../lib/MetiersContext'
import {
  ACTIVITES,
  CENTRES_INTERET,
  CRITERES,
  MOTIVATIONS,
  SENS,
  UNIVERS,
  conditionLabel,
  label,
} from '../lib/taxonomies'
import { clean, normalize } from '../lib/text'

function Section({ title, children }) {
  return (
    <section className="border-t border-slate-100 pt-5 first:border-t-0 first:pt-0">
      <h3 className="mb-2 font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  )
}

function Paragraphs({ text }) {
  return clean(text)
    .split(/\n+/)
    .filter(Boolean)
    .map((p, i) => (
      <p key={i} className="mt-1 text-slate-700 first:mt-0">
        {p}
      </p>
    ))
}

function ExpandableList({ items, initial = 8 }) {
  const [open, setOpen] = useState(false)
  const shown = open ? items : items.slice(0, initial)
  return (
    <>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
        {shown.map((item, i) => (
          <li key={i}>{clean(item)}</li>
        ))}
      </ul>
      {items.length > initial && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-2 text-sm font-medium text-teal-700 hover:underline"
        >
          {open ? 'Voir moins' : `Voir les ${items.length} éléments`}
        </button>
      )}
    </>
  )
}

function groupBy(list, key) {
  const groups = new Map()
  for (const item of list) {
    const k = item[key] || 'Autres'
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(item)
  }
  return [...groups.entries()]
}

function MetierScopeButton({ href }) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800"
    >
      Voir la fiche officielle sur MétierScope
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
      </svg>
      <span className="sr-only">(nouvel onglet)</span>
    </a>
  )
}

function Officiel({ o }) {
  const intitule = normalize(o.intitule)
  const appellations = (o.appellations || []).filter((a) => normalize(a) !== intitule)
  const savoirEtre = o.competences_rome?.savoir_etre_professionnels || []
  const savoirs = o.competences_rome?.savoirs || []
  const contextes = o.contextes_travail_rome || []

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Données officielles</h2>
        <Tag>ROME 4.0, France Travail</Tag>
      </div>
      {o.definition && (
        <Section title="Définition">
          <Paragraphs text={o.definition} />
        </Section>
      )}
      {appellations.length > 0 && (
        <Section title="Autres appellations">
          <ExpandableList items={appellations} initial={10} />
        </Section>
      )}
      {o.acces_metier && (
        <Section title="Accès au métier et formations">
          <Paragraphs text={o.acces_metier} />
        </Section>
      )}
      {o.activites_rome?.length > 0 && (
        <Section title="Activités">
          <ExpandableList items={o.activites_rome} />
        </Section>
      )}
      {(savoirs.length > 0 || savoirEtre.length > 0) && (
        <Section title="Compétences et savoirs">
          {savoirEtre.length > 0 && (
            <>
              <h4 className="mb-1 text-sm font-medium text-slate-600">Savoir-être professionnels</h4>
              <ExpandableList items={savoirEtre} />
            </>
          )}
          {savoirs.length > 0 && (
            <>
              <h4 className="mb-1 mt-3 text-sm font-medium text-slate-600 first:mt-0">Savoirs</h4>
              <ExpandableList items={savoirs} />
            </>
          )}
        </Section>
      )}
      {contextes.length > 0 && (
        <Section title="Contextes de travail">
          <div className="space-y-3">
            {groupBy(contextes, 'type').map(([type, items]) => (
              <div key={type}>
                <h4 className="mb-1 text-sm font-medium text-slate-600">{clean(type)}</h4>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {items.map((c, i) => (
                    <li key={i}>{clean(c.libelle)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}
      {o.centres_interet_rome?.length > 0 && (
        <Section title="Centres d’intérêt associés">
          <ExpandableList items={o.centres_interet_rome} />
        </Section>
      )}
      {o.secteurs_activite_rome?.length > 0 && (
        <Section title="Secteurs d’activité">
          <ExpandableList items={o.secteurs_activite_rome} />
        </Section>
      )}
      {(o.emploi_reglemente || o.emploi_cadre) && (
        <div className="flex flex-wrap gap-2">
          {o.emploi_reglemente && <Tag>Emploi réglementé</Tag>}
          {o.emploi_cadre && <Tag>Emploi de cadre</Tag>}
        </div>
      )}
    </div>
  )
}

function TagList({ ids, map }) {
  if (!ids?.length) return <p className="text-sm text-slate-500">Non renseigné</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => (
        <Tag key={id}>{label(map, id)}</Tag>
      ))}
    </div>
  )
}

function Enrichi({ e }) {
  if (!e) return null
  const conditions = CRITERES.map((c) => [c, e.conditions_travail?.[c.id]]).filter(([, v]) => v !== null && v !== undefined)
  return (
    <div className="space-y-5 rounded-xl border border-amber-200 bg-amber-50/40 p-5 sm:p-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Repères complémentaires</h2>
          <Tag tone="amber">Enrichi par IA</Tag>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Proposés automatiquement à partir des données officielles : ils peuvent contenir des approximations.
        </p>
      </div>
      <Section title="Univers professionnels">
        <TagList ids={e.secteurs} map={UNIVERS} />
      </Section>
      {conditions.length > 0 && (
        <Section title="Conditions de travail habituelles">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {conditions.map(([c, v]) => (
              <div key={c.id} className="flex flex-col border-b border-amber-100 pb-1.5">
                <dt className="text-slate-500">{c.libelle}</dt>
                <dd className="text-slate-800">{conditionLabel(c.id, v)}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
      {e.points_vigilance?.length > 0 && (
        <Section title="Points de vigilance">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {e.points_vigilance.map((p, i) => (
              <li key={i}>{clean(p)}</li>
            ))}
          </ul>
        </Section>
      )}
      <Section title="Activités">
        <TagList ids={e.activites} map={ACTIVITES} />
      </Section>
      <Section title="Centres d’intérêt">
        <TagList ids={e.centres_interet} map={CENTRES_INTERET} />
      </Section>
      <Section title="Ce qui peut donner du sens">
        <TagList ids={e.sens_causes} map={SENS} />
      </Section>
      <Section title="Motivations">
        <TagList ids={e.motivations} map={MOTIVATIONS} />
      </Section>
    </div>
  )
}

function MetierContent() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { byCode } = useMetiers()
  const metier = byCode[code?.toUpperCase()]

  if (!metier) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Fiche métier introuvable</h1>
        <p className="text-slate-600">
          Le métier {code} n’est pas (encore) disponible dans CORE Explore.{' '}
          <a
            href={`https://candidat.francetravail.fr/metierscope/fiche-metier/${encodeURIComponent(code)}`}
            className="font-medium text-teal-700 underline"
            target="_blank"
            rel="noreferrer"
          >
            Le consulter sur MétierScope
          </a>
        </p>
        <Link to="/univers" className="text-sm font-medium text-teal-700 hover:underline">
          ← Retour aux univers
        </Link>
      </div>
    )
  }

  const o = metier.officiel_rome
  const domaine = o.domaine_professionnel
  return (
    <article className="space-y-6">
      <button type="button" onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/univers'))} className="text-sm font-medium text-teal-700 hover:underline">
        ← Retour
      </button>
      <header className="space-y-3">
        <p className="text-sm text-slate-500">
          Code ROME {metier.code_rome}
          {domaine?.domaine ? ` · ${clean(domaine.domaine)}` : ''}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{clean(o.intitule)}</h1>
        <SecteursTags metier={metier} />
        <div className="flex flex-wrap items-center gap-3">
          <MetierScopeButton href={o.lien_metierscope} />
          <SelectionButtons metier={metier} size="lg" />
        </div>
      </header>
      <JourneeType metier={metier} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Officiel o={o} />
        <Enrichi e={metier.enrichi_ia} />
      </div>
    </article>
  )
}

export default function MetierPage() {
  return (
    <DataGate>
      <MetierContent />
    </DataGate>
  )
}
