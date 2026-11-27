import { useState } from 'react'
import { move, toggleIn } from '../../lib/portrait/model'
import { MAX_PRIORITES, MOTIVATIONS, MOTIVATIONS_BY_ID } from '../../lib/portrait/referentiel'
import { Icone } from './theme'

function CarteMotivation({ m, actif, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={onClick}
      className={[
        'relative flex h-full items-start gap-3 rounded-2xl border-2 bg-white p-4 text-left transition',
        actif ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 hover:border-blue-300',
      ].join(' ')}
    >
      <span className="text-2xl leading-none" aria-hidden="true">
        {m.icone}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-900">{m.libelle}</span>
        <span className="mt-0.5 block text-sm text-slate-600">{m.definition}</span>
      </span>
      <span
        className={[
          'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
          actif ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300',
        ].join(' ')}
        aria-hidden="true"
      >
        {actif && <Icone nom="coche" size={14} strokeWidth={3} />}
      </span>
    </button>
  )
}

/** Dimension 5 : 1. sélection en cartes, 2. classement facultatif (glisser-déposer ou flèches). */
export default function DimMotivations({ portrait, setPortrait }) {
  const [drag, setDrag] = useState(null)
  const list = portrait.motivations
  const set = (patch) => setPortrait((p) => ({ ...p, ...patch(p) }))
  const deplacer = (from, to) => set((p) => ({ motivations: move(p.motivations, from, to), classement: true }))

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-1 text-lg font-semibold text-slate-900">
          <span className="text-blue-700">Étape 1</span> · Je sélectionne mes motivations
        </h3>
        <p className="mb-4 text-sm text-slate-600">Choisissez toutes celles qui vous correspondent.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MOTIVATIONS.map((m) => (
            <CarteMotivation key={m.id} m={m} actif={list.includes(m.id)} onClick={() => set((p) => ({ motivations: toggleIn(p.motivations, m.id) }))} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 sm:p-6">
        <h3 className="mb-1 text-lg font-semibold text-slate-900">
          <span className="text-blue-700">Étape 2</span> · Je définis mes priorités <span className="text-sm font-normal text-slate-500">(facultatif)</span>
        </h3>
        {list.length < 2 ? (
          <p className="text-sm text-slate-600">Sélectionnez au moins deux motivations pour pouvoir les classer.</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-600">
              Faites glisser les cartes ou utilisez les flèches. Les {Math.min(MAX_PRIORITES, list.length)} premières deviennent vos motivations
              prioritaires.
            </p>
            <label className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={portrait.classement}
                onChange={(e) => set(() => ({ classement: e.target.checked }))}
                className="h-4 w-4 accent-blue-600"
              />
              J’identifie mes motivations prioritaires
            </label>
            <ol className="space-y-2">
              {list.map((id, i) => {
                const m = MOTIVATIONS_BY_ID[id]
                if (!m) return null
                const prio = portrait.classement && i < MAX_PRIORITES
                return (
                  <li
                    key={id}
                    draggable
                    onDragStart={() => setDrag(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (drag !== null) deplacer(drag, i)
                      setDrag(null)
                    }}
                    onDragEnd={() => setDrag(null)}
                    className={[
                      'flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5',
                      prio ? 'border-blue-400 shadow-sm' : 'border-slate-200',
                      drag === i ? 'opacity-50' : '',
                      portrait.classement && i === MAX_PRIORITES - 1 && list.length > MAX_PRIORITES ? 'mb-5' : '',
                    ].join(' ')}
                  >
                    <span className="hidden cursor-grab text-slate-300 sm:block" aria-hidden="true">
                      <Icone nom="poignee" size={18} strokeWidth={3} />
                    </span>
                    <span
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${prio ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-xl leading-none" aria-hidden="true">
                      {m.icone}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-slate-900">{m.libelle}</span>
                      {prio && <span className="text-xs font-semibold text-blue-700">Prioritaire</span>}
                    </span>
                    <span className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => deplacer(i, i - 1)}
                        disabled={i === 0}
                        aria-label={`Monter « ${m.libelle} »`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                      >
                        <Icone nom="haut" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deplacer(i, i + 1)}
                        disabled={i === list.length - 1}
                        aria-label={`Descendre « ${m.libelle} »`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                      >
                        <Icone nom="bas" size={16} />
                      </button>
                    </span>
                  </li>
                )
              })}
            </ol>
          </>
        )}
      </section>
    </div>
  )
}
