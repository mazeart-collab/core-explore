import { CHOIX_GROUPES, CURSEUR_GROUPES, IMPORTANCES } from '../../lib/portrait/referentiel'
import { Icone } from './theme'

export function Importance({ value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-full border border-slate-300 bg-white p-0.5">
      {IMPORTANCES.map((i) => (
        <button
          key={i.id}
          type="button"
          aria-pressed={value === i.id}
          onClick={() => onChange(i.id)}
          className={[
            'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
            value === i.id ? (i.id === 'indispensable' ? 'bg-sky-700 text-white' : 'bg-sky-100 text-sky-800') : 'text-slate-600 hover:text-slate-900',
          ].join(' ')}
        >
          {i.libelle}
        </button>
      ))}
    </div>
  )
}

function Curseur({ c, pref, onChange }) {
  const set = pref?.pos != null
  const pos = set ? pref.pos : 3
  const choisir = (p) => onChange({ pos: p, importance: pref?.importance || 'souhaitable' })
  return (
    <div className="border-b border-slate-100 py-4 last:border-b-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p id={`cu-${c.id}`} className="font-medium text-slate-900">
          {c.libelle}
        </p>
        {set && (
          <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900">
            <Icone nom="croix" size={12} strokeWidth={3} />
            Sans préférence
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="w-20 shrink-0 text-right text-xs font-semibold text-slate-600 sm:w-28 sm:text-sm">{c.gauche}</span>
        <div className="relative flex-1">
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={pos}
            aria-labelledby={`cu-${c.id}`}
            aria-valuetext={set ? c.phrases[pos - 1] : 'Sans préférence'}
            onChange={(e) => choisir(Number(e.target.value))}
            onClick={(e) => !set && choisir(Number(e.currentTarget.value))}
            className="curseur w-full"
            style={{ '--thumb': set ? 'var(--color-sky-600)' : 'var(--color-slate-300)' }}
          />
          <div className="flex justify-between px-[9px]" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((p) => (
              <button
                key={p}
                type="button"
                tabIndex={-1}
                onClick={() => choisir(p)}
                className={`h-2 w-2 rounded-full ${set && p === pos ? 'bg-sky-600' : 'bg-slate-300'}`}
              />
            ))}
          </div>
        </div>
        <span className="w-20 shrink-0 text-xs font-semibold text-slate-600 sm:w-28 sm:text-sm">{c.droite}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className={`text-sm ${set ? 'font-medium text-sky-800' : 'italic text-slate-400'}`} aria-live="polite">
          {set ? c.phrases[pos - 1] : 'Sans préférence : déplacez le curseur pour indiquer la vôtre.'}
        </p>
        {set && <Importance label={`Importance : ${c.libelle}`} value={pref.importance} onChange={(importance) => onChange({ ...pref, importance })} />}
      </div>
    </div>
  )
}

function ChoixGroupe({ g, pref, onChange }) {
  const valeurs = pref?.valeurs || {}
  const cycle = (id) => {
    const cur = valeurs[id]
    const next = !cur ? 'oui' : cur === 'oui' && g.exclusion ? 'eviter' : null
    const v = { ...valeurs }
    if (next) v[id] = next
    else delete v[id]
    onChange(Object.keys(v).length ? { valeurs: v, importance: pref?.importance || 'souhaitable' } : null)
  }
  const aOui = Object.values(valeurs).includes('oui')
  return (
    <div className="border-b border-slate-100 py-4 last:border-b-0">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium text-slate-900">{g.libelle}</p>
        {g.exclusion && <p className="text-xs text-slate-500">1 clic : je souhaite · 2 clics : à éviter · 3 clics : annuler</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {g.options.map((o) => {
          const etat = valeurs[o.id]
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => cycle(o.id)}
              aria-label={`${o.libelle} : ${etat === 'oui' ? 'je souhaite' : etat === 'eviter' ? 'à éviter' : 'sans préférence'}`}
              className={[
                'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                etat === 'oui'
                  ? 'border-sky-600 bg-sky-600 text-white'
                  : etat === 'eviter'
                    ? 'border-rose-400 bg-rose-50 text-rose-800 line-through decoration-rose-400'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-sky-500',
              ].join(' ')}
            >
              {etat === 'oui' && <Icone nom="coche" size={14} strokeWidth={3} />}
              {etat === 'eviter' && <Icone nom="interdit" size={14} strokeWidth={2.5} className="no-underline" />}
              {o.libelle}
              {etat === 'eviter' && <span className="text-xs font-semibold no-underline">(à éviter)</span>}
            </button>
          )
        })}
      </div>
      {aOui && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Ce choix est :</span>
          <Importance label={`Importance : ${g.libelle}`} value={pref.importance} onChange={(importance) => onChange({ ...pref, importance })} />
        </div>
      )}
    </div>
  )
}

/** Dimension 6 : curseurs à cinq positions et boutons pour le cadre d'emploi. */
export default function DimConditions({ portrait, setPortrait }) {
  const setCurseur = (id, v) =>
    setPortrait((p) => {
      const curseurs = { ...p.curseurs }
      if (v) curseurs[id] = v
      else delete curseurs[id]
      return { ...p, curseurs }
    })
  const setChoix = (id, v) =>
    setPortrait((p) => {
      const choix = { ...p.choix }
      if (v) choix[id] = v
      else delete choix[id]
      return { ...p, choix }
    })

  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-slate-700">
        Tous les curseurs sont neutres au départ. La position centrale ne veut pas dire « sans préférence » : elle exprime
        un équilibre. Pour retirer un critère, utilisez « Sans préférence ».
      </p>
      <div className="grid gap-5 xl:grid-cols-2">
        {CURSEUR_GROUPES.map((g, i) => (
          <section key={g.id} className="rounded-2xl border border-slate-200 bg-white px-4 sm:px-6">
            <h3 className="pt-4 text-sm font-bold uppercase tracking-wide text-sky-800">
              Groupe {i + 1} · {g.libelle}
            </h3>
            {g.note && <p className="mt-1 text-xs text-slate-500">{g.note}</p>}
            {g.curseurs.map((c) => (
              <Curseur key={c.id} c={c} pref={portrait.curseurs[c.id]} onChange={(v) => setCurseur(c.id, v)} />
            ))}
          </section>
        ))}
        <section className="rounded-2xl border border-slate-200 bg-white px-4 sm:px-6">
          <h3 className="pt-4 text-sm font-bold uppercase tracking-wide text-sky-800">Groupe 4 · Mon cadre d’emploi</h3>
          <p className="mt-1 text-xs text-slate-500">Plusieurs choix possibles.</p>
          {CHOIX_GROUPES.map((g) => (
            <ChoixGroupe key={g.id} g={g} pref={portrait.choix[g.id]} onChange={(v) => setChoix(g.id, v)} />
          ))}
        </section>
      </div>
    </div>
  )
}
