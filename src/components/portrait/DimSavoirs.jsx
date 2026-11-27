import { useMemo, useState } from 'react'
import { useMetiers } from '../../lib/MetiersContext'
import { savoirAjouteId, savoirLabel } from '../../lib/portrait/model'
import { SAVOIR_ETATS, SAVOIR_FAMILLES, SAVOIRS } from '../../lib/portrait/referentiel'
import { clean, normalize } from '../../lib/text'
import { AjoutLibre } from './controls'
import { Icone } from './theme'

const ETAT_STYLE = {
  mobiliser: { on: 'border-emerald-600 bg-emerald-600 text-white', off: 'hover:border-emerald-500 hover:text-emerald-700' },
  ecarter: { on: 'border-rose-500 bg-rose-500 text-white', off: 'hover:border-rose-400 hover:text-rose-700' },
  developper: { on: 'border-blue-600 bg-blue-600 text-white', off: 'hover:border-blue-400 hover:text-blue-700' },
}

function EtatButtons({ libelle, etat, onChange }) {
  return (
    <div role="group" aria-label={`Place souhaitée pour « ${libelle} »`} className="flex shrink-0 gap-1.5">
      {SAVOIR_ETATS.map((e) => {
        const on = etat === e.id
        return (
          <button
            key={e.id}
            type="button"
            aria-pressed={on}
            aria-label={e.libelle}
            title={e.libelle}
            onClick={() => onChange(on ? null : e.id)}
            className={[
              'inline-flex h-9 w-9 items-center justify-center rounded-full border text-base font-bold transition-colors',
              on ? ETAT_STYLE[e.id].on : `border-slate-300 bg-white text-slate-400 ${ETAT_STYLE[e.id].off}`,
            ].join(' ')}
          >
            {e.symbole}
          </button>
        )
      })}
    </div>
  )
}

function SavoirRow({ libelle, etat, onChange, meta, onRemove }) {
  const e = SAVOIR_ETATS.find((x) => x.id === etat)
  return (
    <li className="flex items-center gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-800">{libelle}</p>
        {(e || meta) && (
          <p className="text-xs text-slate-500">
            {e && <span className="font-semibold">{e.court}</span>}
            {e && meta && ' · '}
            {meta}
          </p>
        )}
      </div>
      {onRemove && (
        <button type="button" onClick={onRemove} className="text-xs text-slate-500 underline-offset-2 hover:underline">
          Retirer
        </button>
      )}
      <EtatButtons libelle={libelle} etat={etat} onChange={onChange} />
    </li>
  )
}

export function Legende({ className = '' }) {
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-700 ${className}`} aria-label="Légende">
      {SAVOIR_ETATS.map((e) => (
        <li key={e.id} className="inline-flex items-center gap-1.5">
          <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${ETAT_STYLE[e.id].on}`}>
            {e.symbole}
          </span>
          {e.libelle}
        </li>
      ))}
    </ul>
  )
}

/** Index des savoir-faire officiels du ROME (dédoublonnés), avec le nombre de métiers qui les citent. */
function useRomeIndex() {
  const { metiers } = useMetiers()
  return useMemo(() => {
    const biblio = new Set(Object.values(SAVOIRS).map((s) => normalize(s.libelle).replace(/[^a-z0-9]+/g, ' ').trim()))
    const map = new Map()
    for (const m of metiers)
      for (const a of m.officiel_rome?.activites_rome || []) {
        const libelle = clean(a)
        const key = normalize(libelle).replace(/[^a-z0-9]+/g, ' ').trim()
        if (biblio.has(key)) continue
        const x = map.get(key)
        if (x) x.n++
        else map.set(key, { libelle, key, n: 1 })
      }
    return [...map.values()]
  }, [metiers])
}

const motsDe = (q) =>
  normalize(q)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2)

/**
 * Tous les mots de la requête se retrouvent-ils dans le texte (normalisé) ?
 * Un mot court ne reconnaît que ses variantes proches (« bois » ≠ « boissons ») ;
 * à partir de 5 lettres, il vaut aussi comme début de mot (« compta » → « comptabilité »).
 */
const correspond = (mots, texte) => {
  const words = texte.split(/[^a-z0-9]+/)
  return mots.every((m) => words.some((w) => w.startsWith(m) && (m.length >= 5 || w.length - m.length <= 2)))
}

/** Dimension 2 : bibliothèque de savoir-faire en accordéon, avec trois états par savoir-faire. */
export default function DimSavoirs({ portrait, setPortrait }) {
  const [ouvertes, setOuvertes] = useState(() => new Set())
  const [q, setQ] = useState('')
  const rome = useRomeIndex()

  const setEtat = (id, etat) =>
    setPortrait((p) => {
      const savoirs = { ...p.savoirs }
      if (etat) savoirs[id] = etat
      else delete savoirs[id]
      return { ...p, savoirs }
    })

  const ajouter = (libelle, source, etat = null) =>
    setPortrait((p) => {
      const id = savoirAjouteId(libelle, source)
      const savoirsAjoutes = { ...p.savoirsAjoutes, [id]: { libelle, source } }
      const savoirs = { ...p.savoirs }
      if (etat) savoirs[id] = etat
      return { ...p, savoirsAjoutes, savoirs }
    })

  const retirer = (id) =>
    setPortrait((p) => {
      const savoirsAjoutes = { ...p.savoirsAjoutes }
      const savoirs = { ...p.savoirs }
      delete savoirsAjoutes[id]
      delete savoirs[id]
      return { ...p, savoirsAjoutes, savoirs }
    })

  const toggleFamille = (id) =>
    setOuvertes((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const recherche = useMemo(() => {
    const mots = motsDe(q)
    if (!mots.length) return null
    const biblio = SAVOIR_FAMILLES.map((f) => {
      const familleOk = correspond(mots, normalize([f.libelle, ...f.mots].join(' ')))
      const savoirs = f.savoirs.filter((s) => familleOk || correspond(mots, normalize([s.libelle, ...s.mots].join(' '))))
      return { famille: f, savoirs }
    }).filter((x) => x.savoirs.length)
    const officiels = rome
      .filter((r) => correspond(mots, r.key))
      .sort((a, b) => b.n - a.n)
      .slice(0, 12)
    return { biblio, officiels }
  }, [q, rome])

  const ajoutes = Object.entries(portrait.savoirsAjoutes)

  return (
    <div className="space-y-5">
      <div className="sticky top-16 z-10 space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:p-4">
        <Legende />
        <div className="relative">
          <Icone nom="loupe" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un savoir-faire (ex. : bois, comptabilité, photographie, soins…)"
            aria-label="Rechercher un savoir-faire"
            className="w-full rounded-full border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
        </div>
      </div>

      {recherche ? (
        <div className="space-y-4">
          {recherche.biblio.map(({ famille, savoirs }) => (
            <div key={famille.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-2">
              <h3 className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{famille.libelle}</h3>
              <ul>
                {savoirs.map((s) => (
                  <SavoirRow key={s.id} libelle={s.libelle} etat={portrait.savoirs[s.id]} onChange={(e) => setEtat(s.id, e)} />
                ))}
              </ul>
            </div>
          ))}
          {recherche.officiels.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2">
              <h3 className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Savoir-faire spécialisés du référentiel ROME
              </h3>
              <ul>
                {recherche.officiels.map((r) => {
                  const id = savoirAjouteId(r.libelle, 'rome')
                  return (
                    <SavoirRow
                      key={r.key}
                      libelle={r.libelle}
                      meta={`Cité dans ${r.n} fiche${r.n > 1 ? 's' : ''} métier`}
                      etat={portrait.savoirs[id]}
                      onChange={(e) => (e ? ajouter(r.libelle, 'rome', e) : retirer(id))}
                    />
                  )
                })}
              </ul>
            </div>
          )}
          {!recherche.biblio.length && !recherche.officiels.length && (
            <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Aucun savoir-faire trouvé. Vous pouvez l’ajouter vous-même ci-dessous.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {SAVOIR_FAMILLES.map((f) => {
            const open = ouvertes.has(f.id)
            const n = f.savoirs.filter((s) => portrait.savoirs[s.id]).length
            return (
              <section key={f.id} className="rounded-2xl border border-slate-200 bg-white">
                <h3>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`famille-${f.id}`}
                    onClick={() => toggleFamille(f.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <span className="flex-1 font-medium text-slate-900">{f.libelle}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${n ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {n}/{f.savoirs.length}
                    </span>
                    <Icone nom="chevron" size={18} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                </h3>
                {open && (
                  <ul id={`famille-${f.id}`} className="border-t border-slate-100 px-4 pb-2">
                    {f.savoirs.map((s) => (
                      <SavoirRow key={s.id} libelle={s.libelle} etat={portrait.savoirs[s.id]} onChange={(e) => setEtat(s.id, e)} />
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/40 p-4">
        <h3 className="mb-1 text-sm font-semibold text-slate-800">Ajouter un savoir-faire</h3>
        <p className="mb-3 text-xs text-slate-500">Décrivez une action concrète, par exemple « Tailler des arbres fruitiers ».</p>
        {ajoutes.length > 0 && (
          <ul className="mb-3 rounded-xl bg-white px-3">
            {ajoutes.map(([id, s]) => (
              <SavoirRow
                key={id}
                libelle={s.libelle}
                meta={s.source === 'rome' ? 'Référentiel ROME' : 'Ajouté par vous'}
                etat={portrait.savoirs[id]}
                onChange={(e) => setEtat(id, e)}
                onRemove={() => retirer(id)}
              />
            ))}
          </ul>
        )}
        <AjoutLibre label="Ajouter un savoir-faire" placeholder="Ajouter un savoir-faire" onAdd={(t) => ajouter(t, 'perso')} />
      </div>

      <SyntheseSavoirs portrait={portrait} />
    </div>
  )
}

/** Synthèse des savoir-faire renseignés, classés selon les trois états. */
export function SyntheseSavoirs({ portrait, onRemove, compact = false }) {
  const groupes = SAVOIR_ETATS.map((e) => ({
    etat: e,
    ids: Object.entries(portrait.savoirs)
      .filter(([, x]) => x === e.id)
      .map(([id]) => id),
  })).filter((g) => g.ids.length)
  if (!groupes.length) return null
  return (
    <div className={compact ? 'space-y-3' : 'grid gap-3 sm:grid-cols-3'}>
      {groupes.map(({ etat, ids }) => (
        <div key={etat.id} className={compact ? '' : 'rounded-2xl border border-slate-200 bg-white p-4'}>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold ${ETAT_STYLE[etat.id].on}`}>
              {etat.symbole}
            </span>
            Savoir-faire {etat.court.toLowerCase()} ({ids.length})
          </p>
          <ul className="space-y-1 text-sm text-slate-700">
            {ids.map((id) => (
              <li key={id} className="flex items-start justify-between gap-2">
                <span>{savoirLabel(portrait, id)}</span>
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(id)}
                    aria-label={`Supprimer « ${savoirLabel(portrait, id)} »`}
                    className="shrink-0 text-slate-400 hover:text-slate-800"
                  >
                    <Icone nom="croix" size={14} strokeWidth={3} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
