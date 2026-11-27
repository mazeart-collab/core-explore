import { useState } from 'react'
import { analyseIA, analyseLocale, analyserPitch, countPropositions } from '../../lib/portrait/pitch'
import { useStoredState } from '../../lib/useStoredState'
import { CHOIX, CONTRIBUTIONS_BY_ID, CURSEURS, INTERETS_BY_ID, MOTIVATIONS_BY_ID, SAVOIRS, VERBES } from '../../lib/portrait/referentiel'
import { buttonPrimary, buttonSecondary } from '../ui'
import { Pastille } from './controls'
import { Legende } from './DimSavoirs'
import { Icone } from './theme'

const EXEMPLE =
  'J’aimerais concevoir des projets, organiser les différentes étapes, négocier avec des fournisseurs, fabriquer des choses et garder une dimension concrète. Je ne veux pas passer toutes mes journées devant un ordinateur.'

/** Clé unique d'une proposition, pour la cocher ou la décocher. */
const cles = (pr) => [
  ...pr.aime.map((id) => `aime:${id}`),
  ...pr.interets.map((id) => `interets:${id}`),
  ...pr.sens.map((id) => `sens:${id}`),
  ...pr.motivations.map((id) => `motivations:${id}`),
  ...Object.keys(pr.curseurs).map((id) => `curseurs:${id}`),
  ...Object.entries(pr.choix).flatMap(([g, c]) => Object.keys(c.valeurs).map((o) => `choix:${g}:${o}`)),
]

/** Ajoute au portrait les propositions retenues. */
function fusionner(p, pr, retenues, etatsSavoirs) {
  const next = structuredClone(p)
  const add = (key, id) => retenues.has(`${key}:${id}`) && !next[key].includes(id) && next[key].push(id)
  pr.aime.forEach((id) => add('aime', id))
  pr.interets.forEach((id) => add('interets', id))
  pr.sens.forEach((id) => add('sens', id))
  pr.motivations.forEach((id) => add('motivations', id))
  for (const [id, c] of Object.entries(pr.curseurs)) if (retenues.has(`curseurs:${id}`)) next.curseurs[id] = c
  for (const [g, c] of Object.entries(pr.choix))
    for (const [o, etat] of Object.entries(c.valeurs))
      if (retenues.has(`choix:${g}:${o}`)) {
        next.choix[g] ||= { valeurs: {}, importance: 'souhaitable' }
        next.choix[g].valeurs[o] = etat
      }
  for (const [id, etat] of Object.entries(etatsSavoirs)) if (etat) next.savoirs[id] = etat
  return next
}

function Groupe({ titre, children }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{titre}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

/** Mode 1 : « Je décris mon projet ». Les critères interprétés sont à confirmer avant d'être ajoutés. */
export default function PitchBox({ portrait, setPortrait, onDone }) {
  const [texte, setTexte] = useState(portrait.pitch || '')
  const [pr, setPr] = useState(null)
  const [retenues, setRetenues] = useState(new Set())
  const [etats, setEtats] = useState({})
  const [ajoute, setAjoute] = useState(false)
  const [chargement, setChargement] = useState(false)
  // Choix mémorisé sur l'appareil : analyse par IA (texte envoyé) ou sur l'appareil uniquement.
  const [sansIA, setSansIA] = useStoredState('core-explore:pitch-sans-ia', false, Boolean)

  async function analyser(e) {
    e.preventDefault()
    setChargement(true)
    const res = await analyserPitch(texte, { fournisseur: sansIA ? analyseLocale : analyseIA })
    setChargement(false)
    setPr(res)
    setRetenues(new Set(cles(res)))
    setEtats({})
    setAjoute(false)
    setPortrait((p) => ({ ...p, pitch: texte }))
  }

  const toggle = (k) =>
    setRetenues((s) => {
      const n = new Set(s)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })

  const valider = () => {
    setPortrait((p) => fusionner(p, pr, retenues, etats))
    setAjoute(true)
  }

  const nb = pr ? countPropositions(pr) : 0
  const chip = (key, libelle, couleur) => (
    <Pastille key={key} couleur={couleur} actif={retenues.has(key)} onClick={() => toggle(key)}>
      {libelle}
    </Pastille>
  )

  return (
    <div className="space-y-4">
      <form onSubmit={analyser} className="space-y-3">
        <label htmlFor="pitch" className="block font-medium text-slate-900">
          Décrivez librement ce que vous recherchez dans votre future vie professionnelle
        </label>
        <textarea
          id="pitch"
          rows={5}
          maxLength={2000}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder={`Par exemple : « ${EXEMPLE} »`}
          className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
        />
        <div className="rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-600">
          {sansIA ? (
            <p>Votre texte est analysé sur votre appareil, sans être envoyé à aucun service extérieur. L’analyse est plus sommaire.</p>
          ) : (
            <p>
              Pour être mieux compris, votre texte est envoyé à un service d’intelligence artificielle (Claude, d’Anthropic), qui le traduit
              en critères. Il n’est pas conservé par CORE Explore. Évitez d’y indiquer des informations personnelles ou sensibles (nom,
              santé, coordonnées…).
            </p>
          )}
          <label className="mt-1.5 flex items-center gap-2 font-medium text-slate-700">
            <input type="checkbox" checked={sansIA} onChange={(e) => setSansIA(e.target.checked)} className="h-4 w-4 accent-teal-700" />
            Analyser sur mon appareil uniquement, sans intelligence artificielle
          </label>
        </div>
        <div className="flex justify-end">
          <button type="submit" className={buttonPrimary} disabled={!texte.trim() || chargement}>
            {chargement ? 'Analyse en cours…' : 'Analyser ma description'}
          </button>
        </div>
      </form>

      {pr && (
        <div className="rounded-2xl border border-teal-200 bg-white p-4 sm:p-5" aria-live="polite">
          {!nb ? (
            <p className="text-sm text-slate-600">
              Aucun critère n’a été reconnu. Essayez des verbes d’action (concevoir, aider, réparer…) et des conditions
              concrètes (terrain, équipe, écrans…), ou construisez votre portrait dimension par dimension.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900">Voici ce que nous avons compris</h3>
                {pr.resume && <p className="mt-1 text-sm italic text-slate-700">« {pr.resume} »</p>}
                {pr.source === 'locale' && !sansIA && (
                  <p className="mt-1 text-xs text-slate-500">
                    L’analyse par intelligence artificielle n’est pas disponible pour le moment : votre texte a été analysé sur votre appareil.
                  </p>
                )}
                <p className="text-sm text-slate-600">
                  Décochez ce qui ne vous correspond pas. Rien n’est ajouté à votre portrait sans votre accord.
                </p>
              </div>
              {pr.aime.length > 0 && <Groupe titre="Activités">{pr.aime.map((id) => chip(`aime:${id}`, VERBES[id].libelle, 'rose'))}</Groupe>}
              {pr.savoirs.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Savoir-faire ou missions à confirmer</p>
                  <p className="mb-2 text-xs text-slate-500">
                    Aimer une activité ne veut pas dire la maîtriser : indiquez vous-même la place de chaque savoir-faire, ou
                    laissez-le vide.
                  </p>
                  <Legende className="mb-2" />
                  <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                    {pr.savoirs.map((id) => (
                      <li key={id} className="flex items-center gap-3 px-3 py-2">
                        <span className="flex-1 text-sm text-slate-800">{SAVOIRS[id].libelle}</span>
                        <span className="flex gap-1">
                          {[
                            ['mobiliser', '✓', 'border-emerald-600 bg-emerald-600 text-white'],
                            ['ecarter', '×', 'border-rose-500 bg-rose-500 text-white'],
                            ['developper', '+', 'border-blue-600 bg-blue-600 text-white'],
                          ].map(([etat, s, on]) => (
                            <button
                              key={etat}
                              type="button"
                              aria-pressed={etats[id] === etat}
                              aria-label={`${SAVOIRS[id].libelle} : ${etat === 'mobiliser' ? 'à mobiliser' : etat === 'ecarter' ? 'à écarter' : 'à développer'}`}
                              onClick={() => setEtats((x) => ({ ...x, [id]: x[id] === etat ? null : etat }))}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border font-bold ${etats[id] === etat ? on : 'border-slate-300 text-slate-400'}`}
                            >
                              {s}
                            </button>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {pr.interets.length > 0 && (
                <Groupe titre="Centres d’intérêt">{pr.interets.map((id) => chip(`interets:${id}`, INTERETS_BY_ID[id].libelle, 'amber'))}</Groupe>
              )}
              {pr.sens.length > 0 && (
                <Groupe titre="Contributions">{pr.sens.map((id) => chip(`sens:${id}`, CONTRIBUTIONS_BY_ID[id].libelle, 'emerald'))}</Groupe>
              )}
              {pr.motivations.length > 0 && (
                <Groupe titre="Motivations">{pr.motivations.map((id) => chip(`motivations:${id}`, MOTIVATIONS_BY_ID[id].libelle, 'blue'))}</Groupe>
              )}
              {(Object.keys(pr.curseurs).length > 0 || Object.keys(pr.choix).length > 0) && (
                <Groupe titre="Conditions de travail">
                  {Object.entries(pr.curseurs).map(([id, c]) => chip(`curseurs:${id}`, CURSEURS[id].phrases[c.pos - 1], 'sky'))}
                  {Object.entries(pr.choix).flatMap(([g, c]) =>
                    Object.entries(c.valeurs).map(([o, etat]) =>
                      chip(`choix:${g}:${o}`, `${CHOIX[g].byId[o].libelle}${etat === 'eviter' ? ' : à éviter' : ''}`, 'sky'),
                    ),
                  )}
                </Groupe>
              )}
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                {ajoute ? (
                  <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800" role="status">
                    <Icone nom="coche" size={16} strokeWidth={3} />
                    Critères ajoutés à votre portrait. Vous pouvez les compléter ou les ajuster.
                  </p>
                ) : (
                  <span />
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  {ajoute ? (
                    <button type="button" className={buttonPrimary} onClick={onDone}>
                      Compléter mon portrait
                      <Icone nom="fleche" size={16} className="ml-1.5" />
                    </button>
                  ) : (
                    <button type="button" className={buttonPrimary} onClick={valider}>
                      Ajouter à mon portrait
                    </button>
                  )}
                  {!ajoute && (
                    <button type="button" className={buttonSecondary} onClick={() => setPr(null)}>
                      Annuler
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
