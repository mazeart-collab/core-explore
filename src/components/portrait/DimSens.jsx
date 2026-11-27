import { toggleIn } from '../../lib/portrait/model'
import { CONTRIBUTIONS } from '../../lib/portrait/referentiel'
import { Icone } from './theme'

/** Dimension 4 : phrases complètes à cocher, présentation calme et aérée. */
export default function DimSens({ portrait, setPortrait }) {
  const toggle = (id) => setPortrait((p) => ({ ...p, sens: toggleIn(p.sens, id) }))
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <fieldset className="rounded-3xl border border-emerald-100 bg-white p-4 sm:p-8">
        <legend className="sr-only">Contributions recherchées</legend>
        <ul className="space-y-2">
          {CONTRIBUTIONS.map((c) => {
            const on = portrait.sens.includes(c.id)
            return (
              <li key={c.id}>
                <label
                  className={[
                    'flex cursor-pointer items-start gap-4 rounded-2xl px-3 py-3 transition-colors sm:px-4',
                    on ? 'bg-emerald-50' : 'hover:bg-slate-50',
                  ].join(' ')}
                >
                  <input type="checkbox" checked={on} onChange={() => toggle(c.id)} className="peer sr-only" />
                  <span
                    className={[
                      'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500',
                      on ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white',
                    ].join(' ')}
                    aria-hidden="true"
                  >
                    {on && <Icone nom="coche" size={14} strokeWidth={3} />}
                  </span>
                  <span className={`text-base leading-relaxed ${on ? 'font-medium text-slate-900' : 'text-slate-700'}`}>{c.libelle}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>
      <div className="rounded-3xl border border-emerald-100 bg-white p-4 sm:p-8">
        <label htmlFor="sens-libre" className="mb-2 block font-medium text-slate-800">
          Une autre cause ou contribution importante pour moi
        </label>
        <textarea
          id="sens-libre"
          rows={2}
          maxLength={300}
          value={portrait.sensLibre}
          onChange={(e) => setPortrait((p) => ({ ...p, sensLibre: e.target.value }))}
          placeholder="Par exemple : redonner vie aux objets, aider les jeunes à trouver leur voie…"
          className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
        />
      </div>
    </div>
  )
}
