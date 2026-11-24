import { COMPETENCE_ETATS, IMPORTANCES } from '../lib/matching'
import { taxonomies } from '../lib/taxonomies'

function Chip({ active, onClick, children, title }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      title={title}
      className={[
        'rounded-full border px-3 py-1.5 text-left text-sm transition-colors',
        active
          ? 'border-teal-700 bg-teal-700 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:border-teal-600 hover:text-teal-800',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function Segmented({ options, value, onChange, size = 'sm', label }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.id ?? 'none'}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={[
            'rounded-md border px-2.5 py-1 transition-colors',
            size === 'xs' ? 'text-xs' : 'text-sm',
            value === o.id
              ? o.tone === 'avoid'
                ? 'border-rose-700 bg-rose-700 text-white'
                : 'border-teal-700 bg-teal-700 text-white'
              : 'border-slate-300 bg-white text-slate-700 hover:border-teal-600',
          ].join(' ')}
        >
          {o.libelle}
        </button>
      ))}
    </div>
  )
}

function Panel({ panelId, title, hint, count, open, onToggle, children }) {
  const id = `panel-${panelId}`
  return (
    <section id={`criteres-${panelId}`} className="scroll-mt-20 rounded-xl border border-slate-200 bg-white">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
        >
          <span className="font-medium text-slate-900">{title}</span>
          <span className="flex items-center gap-2">
            {count > 0 && (
              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800">
                {count} choix
              </span>
            )}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>
      </h3>
      {open && (
        <div id={id} className="border-t border-slate-100 px-4 py-4">
          {hint && <p className="mb-3 text-sm text-slate-500">{hint}</p>}
          {children}
        </div>
      )}
    </section>
  )
}

const toggleIn = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

function ChipList({ items, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <Chip key={it.id} active={selected.includes(it.id)} onClick={() => onToggle(it.id)} title={it.description}>
          {it.libelle}
        </Chip>
      ))}
    </div>
  )
}

function ConditionRow({ critere, pref, onChange }) {
  const valeurs = pref?.valeurs || []
  const multiple = critere.type === 'choix_multiple'
  const importance = pref?.importance || 'souhaitable'

  const select = (id) => {
    if (id === null) return onChange(null)
    const next = multiple ? toggleIn(valeurs, id) : valeurs[0] === id ? [] : [id]
    onChange(next.length ? { valeurs: next, importance } : null)
  }

  return (
    <div className="border-b border-slate-100 py-3 last:border-b-0">
      <p className="mb-2 text-sm font-medium text-slate-800">
        {critere.libelle}
        {multiple && <span className="font-normal text-slate-500"> (plusieurs choix possibles)</span>}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Chip active={!valeurs.length} onClick={() => select(null)}>
          Sans préférence
        </Chip>
        {critere.options.map((o) => (
          <Chip key={o.id} active={valeurs.includes(o.id)} onClick={() => select(o.id)}>
            {o.libelle}
          </Chip>
        ))}
      </div>
      {valeurs.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Ce critère est :</span>
          <Segmented
            size="xs"
            label={`Importance : ${critere.libelle}`}
            options={IMPORTANCES.map((i) => ({ ...i, tone: i.id === 'eviter' ? 'avoid' : undefined }))}
            value={importance}
            onChange={(imp) => onChange({ valeurs, importance: imp })}
          />
        </div>
      )}
    </div>
  )
}

export default function CriteriaForm({ criteria, setCriteria, openPanel, setOpenPanel }) {
  const panel = (id) => ({
    panelId: id,
    open: openPanel === id,
    onToggle: () => setOpenPanel((p) => (p === id ? null : id)),
  })
  const update = (key, fn) => setCriteria((c) => ({ ...c, [key]: fn(c[key]) }))

  return (
    <div className="space-y-3">
      <Panel
        title="1. Ce que j’aime faire"
        hint="Choisissez les activités qui vous attirent, sans vous limiter à ce que vous faites déjà."
        count={criteria.activites.length}
        {...panel('activites')}
      >
        <div className="space-y-4">
          {taxonomies.activites.categories.map((cat) => (
            <div key={cat.id}>
              <h4 className="mb-2 text-sm font-semibold text-slate-600">{cat.libelle}</h4>
              <ChipList
                items={cat.activites}
                selected={criteria.activites}
                onToggle={(id) => update('activites', (l) => toggleIn(l, id))}
              />
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="2. Ce que je sais faire"
        hint="Pour chaque famille de compétences, indiquez si vous voulez l’utiliser, ne plus l’utiliser ou la développer. Cliquez à nouveau pour annuler."
        count={Object.keys(criteria.competences).length}
        {...panel('competences')}
      >
        <ul className="space-y-3">
          {taxonomies.competences_categories.map((cat) => (
            <li key={cat.id} className="border-b border-slate-100 pb-3 last:border-b-0">
              <p className="text-sm font-medium text-slate-800">{cat.libelle}</p>
              {cat.description && <p className="mb-2 text-xs text-slate-500">{cat.description}</p>}
              <Segmented
                size="xs"
                label={cat.libelle}
                options={COMPETENCE_ETATS.map((e) => ({ ...e, tone: e.id === 'ne_plus' ? 'avoid' : undefined }))}
                value={criteria.competences[cat.id]}
                onChange={(etat) =>
                  update('competences', (c) => {
                    const next = { ...c }
                    if (next[cat.id] === etat) delete next[cat.id]
                    else next[cat.id] = etat
                    return next
                  })
                }
              />
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="3. Centres d’intérêt" count={criteria.centres_interet.length} {...panel('centres')}>
        <ChipList
          items={taxonomies.centres_interet}
          selected={criteria.centres_interet}
          onToggle={(id) => update('centres_interet', (l) => toggleIn(l, id))}
        />
      </Panel>

      <Panel
        title="4. Ce qui donne du sens"
        hint="Les causes auxquelles vous aimeriez contribuer par votre travail."
        count={criteria.sens_causes.length}
        {...panel('sens')}
      >
        <ChipList
          items={taxonomies.sens_causes}
          selected={criteria.sens_causes}
          onToggle={(id) => update('sens_causes', (l) => toggleIn(l, id))}
        />
      </Panel>

      <Panel title="5. Motivations professionnelles" count={criteria.motivations.length} {...panel('motivations')}>
        <ChipList
          items={taxonomies.motivations}
          selected={criteria.motivations}
          onToggle={(id) => update('motivations', (l) => toggleIn(l, id))}
        />
      </Panel>

      <Panel
        title="6. Conditions de travail idéales"
        hint="Tout est « Sans préférence » par défaut. Une fois une valeur choisie, précisez si elle est indispensable, souhaitable ou à éviter."
        count={Object.values(criteria.conditions).filter((p) => p?.valeurs?.length).length}
        {...panel('conditions')}
      >
        {taxonomies.conditions_travail.criteres.map((critere) => (
          <ConditionRow
            key={critere.id}
            critere={critere}
            pref={criteria.conditions[critere.id]}
            onChange={(pref) =>
              update('conditions', (c) => {
                const next = { ...c }
                if (pref) next[critere.id] = pref
                else delete next[critere.id]
                return next
              })
            }
          />
        ))}
      </Panel>
    </div>
  )
}
