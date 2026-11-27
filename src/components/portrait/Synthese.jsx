import { countPortrait, isPerso, persoLabel, priorites } from '../../lib/portrait/model'
import {
  CHOIX,
  CONTRIBUTIONS_BY_ID,
  CURSEURS,
  DIMENSIONS_BY_ID,
  INTERETS_BY_ID,
  MOTIVATIONS_BY_ID,
  SYNTHESE,
  VERBES,
} from '../../lib/portrait/referentiel'
import { buttonPrimary, buttonSecondary } from '../ui'
import { SyntheseSavoirs } from './DimSavoirs'
import { Icone, Numero } from './theme'
import { THEMES } from './themes'

function Puce({ children, couleur, onRemove, tone }) {
  const t = THEMES[couleur]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full py-1 pl-3 pr-1.5 text-sm font-medium ${tone === 'eviter' ? 'bg-rose-50 text-rose-800 ring-1 ring-rose-200' : t.doux}`}
    >
      {tone === 'eviter' && <Icone nom="interdit" size={13} />}
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Supprimer « ${typeof children === 'string' ? children : 'ce critère'} »`}
        className="no-print ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-white/70"
      >
        <Icone nom="croix" size={11} strokeWidth={3} />
      </button>
    </span>
  )
}

function Bloc({ dimension, titre, onEdit, children }) {
  const d = DIMENSIONS_BY_ID[dimension]
  return (
    <section className={`rounded-2xl border bg-white p-4 sm:p-5 ${THEMES[d.couleur].carte.split(' ')[0]}`}>
      <div className="mb-3 flex items-center gap-3">
        <Numero dimension={d} size="sm" />
        <h3 className="flex-1 font-semibold text-slate-900">{titre || d.titre}</h3>
        <button
          type="button"
          onClick={() => onEdit(dimension)}
          className="no-print inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Icone nom="crayon" size={13} />
          Modifier
        </button>
      </div>
      {children}
    </section>
  )
}

/** Petit curseur récapitulatif (5 positions). */
function MiniCurseur({ pos }) {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((p) => (
        <span key={p} className={`h-2 rounded-full ${p === pos ? 'w-5 bg-sky-600' : 'w-2 bg-slate-200'}`} />
      ))}
    </span>
  )
}

/** Étape 7 : « Mon portrait professionnel ». Seuls les critères renseignés apparaissent. */
export default function Synthese({ portrait, setPortrait, onEdit, onReset, onResultats }) {
  const n = countPortrait(portrait)
  const without = (key, id) => setPortrait((p) => ({ ...p, [key]: p[key].filter((x) => x !== id) }))
  const removeSavoir = (id) =>
    setPortrait((p) => {
      const savoirs = { ...p.savoirs }
      delete savoirs[id]
      return { ...p, savoirs }
    })
  const removeCurseur = (id) =>
    setPortrait((p) => {
      const curseurs = { ...p.curseurs }
      delete curseurs[id]
      return { ...p, curseurs }
    })
  const removeChoix = (g, o) =>
    setPortrait((p) => {
      const valeurs = { ...p.choix[g].valeurs }
      delete valeurs[o]
      const choix = { ...p.choix }
      if (Object.keys(valeurs).length) choix[g] = { ...choix[g], valeurs }
      else delete choix[g]
      return { ...p, choix }
    })

  const prio = priorites(portrait)
  const autresMotivations = portrait.motivations.filter((m) => !prio.includes(m))
  const curseurs = Object.entries(portrait.curseurs)
  const choixOui = []
  const choixEviter = []
  for (const [g, c] of Object.entries(portrait.choix))
    for (const [o, etat] of Object.entries(c.valeurs)) (etat === 'oui' ? choixOui : choixEviter).push({ g, o, importance: c.importance })

  const label = (id, map) => (isPerso(id) ? persoLabel(id) : map[id]?.libelle || id)

  return (
    <section aria-labelledby="titre-synthese" className="space-y-5">
      <header className={`rounded-2xl border p-5 sm:p-6 ${THEMES.teal.bandeau}`}>
        <div className="flex items-start gap-4">
          <span className={`hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:inline-flex ${THEMES.teal.pastille}`}>
            <Icone nom={SYNTHESE.icone} size={26} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Étape 7 · Synthèse</p>
            <h2 id="titre-synthese" className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">
              Mon portrait professionnel
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {n
                ? 'Voici ce que vous avez renseigné. Supprimez un critère d’un clic, ou modifiez une dimension. Rien n’est obligatoire.'
                : 'Votre portrait est vide pour l’instant. Commencez par la dimension de votre choix.'}
            </p>
          </div>
        </div>
      </header>

      {n > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {portrait.aime.length > 0 && (
            <Bloc dimension="aime" titre="Les activités que j’apprécie" onEdit={onEdit}>
              <div className="flex flex-wrap gap-2">
                {portrait.aime.map((id) => (
                  <Puce key={id} couleur="rose" onRemove={() => without('aime', id)}>
                    {label(id, VERBES)}
                  </Puce>
                ))}
              </div>
            </Bloc>
          )}

          {Object.keys(portrait.savoirs).length > 0 && (
            <Bloc dimension="savoirs" titre="Mes savoir-faire" onEdit={onEdit}>
              <SyntheseSavoirs portrait={portrait} onRemove={removeSavoir} compact />
            </Bloc>
          )}

          {portrait.interets.length > 0 && (
            <Bloc dimension="interets" onEdit={onEdit}>
              <div className="flex flex-wrap gap-2">
                {portrait.interets.map((id) => (
                  <Puce key={id} couleur="amber" onRemove={() => without('interets', id)}>
                    {(INTERETS_BY_ID[id]?.emoji || '✨') + ' ' + label(id, INTERETS_BY_ID)}
                  </Puce>
                ))}
              </div>
            </Bloc>
          )}

          {(portrait.sens.length > 0 || portrait.sensLibre.trim()) && (
            <Bloc dimension="sens" titre="Les contributions que je recherche" onEdit={onEdit}>
              <ul className="space-y-1.5">
                {portrait.sens.map((id) => (
                  <li key={id} className="flex items-start justify-between gap-2 text-sm text-slate-700">
                    <span className="flex gap-2">
                      <Icone nom="coche" size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                      {CONTRIBUTIONS_BY_ID[id]?.libelle}
                    </span>
                    <button type="button" onClick={() => without('sens', id)} aria-label="Supprimer" className="no-print shrink-0 text-slate-400 hover:text-slate-800">
                      <Icone nom="croix" size={14} strokeWidth={3} />
                    </button>
                  </li>
                ))}
                {portrait.sensLibre.trim() && (
                  <li className="flex items-start justify-between gap-2 text-sm italic text-slate-700">
                    <span>« {portrait.sensLibre.trim()} »</span>
                    <button
                      type="button"
                      onClick={() => setPortrait((p) => ({ ...p, sensLibre: '' }))}
                      aria-label="Supprimer"
                      className="no-print shrink-0 text-slate-400 hover:text-slate-800"
                    >
                      <Icone nom="croix" size={14} strokeWidth={3} />
                    </button>
                  </li>
                )}
              </ul>
            </Bloc>
          )}

          {portrait.motivations.length > 0 && (
            <Bloc dimension="motivations" onEdit={onEdit}>
              {prio.length > 0 && (
                <ol className="mb-3 space-y-1.5">
                  {prio.map((id, i) => (
                    <li key={id} className="flex items-center gap-2 text-sm">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{i + 1}</span>
                      <span className="flex-1 font-medium text-slate-900">
                        {MOTIVATIONS_BY_ID[id]?.icone} {MOTIVATIONS_BY_ID[id]?.libelle}
                        <span className="ml-2 text-xs font-semibold text-blue-700">Prioritaire</span>
                      </span>
                      <button type="button" onClick={() => without('motivations', id)} aria-label="Supprimer" className="no-print text-slate-400 hover:text-slate-800">
                        <Icone nom="croix" size={14} strokeWidth={3} />
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              <div className="flex flex-wrap gap-2">
                {autresMotivations.map((id) => (
                  <Puce key={id} couleur="blue" onRemove={() => without('motivations', id)}>
                    {`${MOTIVATIONS_BY_ID[id]?.icone} ${MOTIVATIONS_BY_ID[id]?.libelle}`}
                  </Puce>
                ))}
              </div>
            </Bloc>
          )}

          {(curseurs.length > 0 || choixOui.length > 0 || choixEviter.length > 0) && (
            <Bloc dimension="conditions" titre="Mes conditions de travail" onEdit={onEdit}>
              {curseurs.length > 0 && (
                <ul className="mb-3 space-y-2.5">
                  {curseurs.map(([id, c]) => {
                    const cu = CURSEURS[id]
                    return (
                      <li key={id} className="flex items-start gap-3 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-medium text-slate-900">{cu.libelle}</span>
                            <MiniCurseur pos={c.pos} />
                            {c.importance === 'indispensable' && (
                              <span className="rounded-full bg-sky-700 px-2 py-0.5 text-xs font-semibold text-white">Indispensable</span>
                            )}
                          </div>
                          <p className="text-slate-600">{cu.phrases[c.pos - 1]}</p>
                        </div>
                        <button type="button" onClick={() => removeCurseur(id)} aria-label={`Supprimer « ${cu.libelle} »`} className="no-print text-slate-400 hover:text-slate-800">
                          <Icone nom="croix" size={14} strokeWidth={3} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {choixOui.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {choixOui.map(({ g, o, importance }) => (
                    <Puce key={g + o} couleur="sky" onRemove={() => removeChoix(g, o)}>
                      {CHOIX[g].byId[o].libelle + (importance === 'indispensable' ? ' (indispensable)' : '')}
                    </Puce>
                  ))}
                </div>
              )}
              {choixEviter.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-rose-700">À éviter</p>
                  <div className="flex flex-wrap gap-2">
                    {choixEviter.map(({ g, o }) => (
                      <Puce key={g + o} couleur="rose" tone="eviter" onRemove={() => removeChoix(g, o)}>
                        {CHOIX[g].byId[o].libelle}
                      </Puce>
                    ))}
                  </div>
                </div>
              )}
            </Bloc>
          )}
        </div>
      )}

      <footer className="no-print flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" className={buttonSecondary} onClick={() => onEdit(null)}>
            <Icone nom="crayon" size={16} className="mr-1.5" />
            Modifier mon portrait
          </button>
          <button type="button" className={buttonSecondary} onClick={onReset} disabled={!n}>
            <Icone nom="reset" size={16} className="mr-1.5" />
            Réinitialiser mes critères
          </button>
          <button type="button" className={buttonSecondary} onClick={() => window.print()} disabled={!n}>
            <Icone nom="imprimer" size={16} className="mr-1.5" />
            Imprimer ou enregistrer en PDF
          </button>
        </div>
        <button type="button" className={buttonPrimary} onClick={onResultats} disabled={!n}>
          Découvrir mes pistes professionnelles
          <Icone nom="fleche" size={16} className="ml-1.5" />
        </button>
      </footer>
    </section>
  )
}
