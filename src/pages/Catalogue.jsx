import { useDeferredValue, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import MetierCard from '../components/MetierCard'
import { DataGate, PageTitle } from '../components/ui'
import { useMetiers } from '../lib/MetiersContext'
import { createSearch } from '../lib/search'
import { FAMILLES, UNIVERS } from '../lib/taxonomies'

function SearchBar({ value, onChange }) {
  return (
    <div className="mb-8">
      <label htmlFor="recherche" className="mb-2 block text-sm font-medium text-slate-700">
        Rechercher un métier
      </label>
      <div className="relative">
        <input
          id="recherche"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex. : jardinier, comptabilité, travail avec les animaux…"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base shadow-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          autoComplete="off"
        />
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        La recherche porte sur les intitulés, les autres appellations, les définitions, les activités, les savoirs et
        les repères enrichis. Les accents et petites fautes de frappe sont tolérés.
      </p>
    </div>
  )
}

function MetierGrid({ metiers }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {metiers.map((m) => (
        <MetierCard key={m.code_rome} metier={m} />
      ))}
    </div>
  )
}

function UniversOverview({ counts, isComplete }) {
  const [hideEmpty, setHideEmpty] = useState(!isComplete)
  return (
    <>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Les univers professionnels</h2>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={hideEmpty}
            onChange={(e) => setHideEmpty(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-teal-700"
          />
          Masquer les univers sans métier
        </label>
      </div>
      <div className="space-y-10">
        {FAMILLES.map((famille) => {
          const univers = famille.univers.filter((id) => !hideEmpty || counts[id])
          if (!univers.length) return null
          return (
            <section key={famille.id} aria-labelledby={`famille-${famille.id}`}>
              <h3 id={`famille-${famille.id}`} className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {famille.libelle}
              </h3>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {univers.map((id) => {
                  const n = counts[id] || 0
                  const content = (
                    <>
                      <span className="font-medium text-slate-900">{UNIVERS[id]?.libelle ?? id}</span>
                      <span className="mt-1 block text-sm text-slate-500">
                        {n ? `${n} métier${n > 1 ? 's' : ''}` : 'Aucun métier pour le moment'}
                      </span>
                    </>
                  )
                  return (
                    <li key={id}>
                      {n ? (
                        <Link
                          to={`?univers=${id}`}
                          className="block h-full rounded-xl border border-slate-200 bg-white p-4 transition hover:border-teal-600 hover:shadow-sm"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="block h-full rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 opacity-70">
                          {content}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </>
  )
}

function CatalogueContent() {
  const { metiers, meta } = useMetiers()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''
  const universId = params.get('univers')
  const deferredQuery = useDeferredValue(query)

  const search = useMemo(() => createSearch(metiers), [metiers])
  const counts = useMemo(() => {
    const c = {}
    for (const m of metiers) for (const id of m.enrichi_ia?.secteurs || []) c[id] = (c[id] || 0) + 1
    return c
  }, [metiers])

  const setQuery = (q) => {
    const next = new URLSearchParams(params)
    if (q) next.set('q', q)
    else next.delete('q')
    setParams(next, { replace: true })
  }

  const results = useMemo(() => search(deferredQuery), [search, deferredQuery])
  const sortByName = (list) => [...list].sort((a, b) => a.intitule.localeCompare(b.intitule, 'fr'))

  let body
  if (results) {
    body = (
      <section aria-live="polite">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {results.length
            ? `${results.length} métier${results.length > 1 ? 's' : ''} pour « ${deferredQuery.trim()} »`
            : `Aucun métier trouvé pour « ${deferredQuery.trim()} »`}
        </h2>
        {!results.length && (
          <p className="text-sm text-slate-600">
            Essayez un autre mot, plus général, ou parcourez les univers ci-dessous en effaçant la recherche.
          </p>
        )}
        <MetierGrid metiers={results} />
      </section>
    )
  } else if (universId && UNIVERS[universId]) {
    const list = sortByName(metiers.filter((m) => m.enrichi_ia?.secteurs?.includes(universId)))
    body = (
      <section>
        <Link to="/univers" className="text-sm font-medium text-teal-700 hover:underline">
          ← Tous les univers
        </Link>
        <h2 className="mb-4 mt-2 text-lg font-semibold text-slate-900">
          {UNIVERS[universId].libelle}{' '}
          <span className="font-normal text-slate-500">
            ({list.length} métier{list.length > 1 ? 's' : ''})
          </span>
        </h2>
        {list.length ? (
          <MetierGrid metiers={list} />
        ) : (
          <p className="text-sm text-slate-600">Aucun métier n’est encore rattaché à cet univers.</p>
        )}
      </section>
    )
  } else {
    body = <UniversOverview counts={counts} isComplete={meta?.complet !== false} />
  }

  return (
    <>
      <SearchBar value={query} onChange={setQuery} />
      {body}
    </>
  )
}

export default function Catalogue() {
  return (
    <>
      <PageTitle title="L’univers des possibles">
        Parcourez les métiers par grands univers professionnels, ou recherchez directement un métier.
      </PageTitle>
      <DataGate>
        <CatalogueContent />
      </DataGate>
    </>
  )
}
