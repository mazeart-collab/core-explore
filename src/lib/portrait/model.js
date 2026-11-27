// Portrait professionnel : structure des réponses et opérations de base.
// Aucun critère n'est sélectionné par défaut.
import { CHOIX, CURSEURS, DIMENSIONS, MAX_PRIORITES, SAVOIRS, slug } from './referentiel'

export const EMPTY_PORTRAIT = {
  aime: [], // identifiants de verbes ; verbes ajoutés librement : 'perso:<libellé>'
  savoirs: {}, // { id: 'mobiliser' | 'ecarter' | 'developper' }
  savoirsAjoutes: {}, // { id: { libelle, source: 'perso' | 'rome' } } (savoir-faire hors bibliothèque)
  interets: [], // identifiants ; ajouts libres : 'perso:<libellé>'
  sens: [], // identifiants de contributions
  sensLibre: '', // « Une autre cause ou contribution importante pour moi »
  motivations: [], // identifiants, dans l'ordre choisi par l'utilisateur
  classement: false, // true : les MAX_PRIORITES premières motivations sont prioritaires
  curseurs: {}, // { id: { pos: 1..5, importance: 'souhaitable' | 'indispensable' } }
  choix: {}, // { groupe: { valeurs: { option: 'oui' | 'eviter' }, importance } }
  pitch: '',
}

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x)
const arr = (x) => (Array.isArray(x) ? x.filter((v) => typeof v === 'string') : [])

/** Complète et nettoie un portrait partiel (stockage de session, import). */
export function normalizePortrait(raw) {
  const r = isObj(raw) ? raw : {}
  const p = { ...EMPTY_PORTRAIT }
  p.aime = arr(r.aime)
  p.interets = arr(r.interets)
  p.sens = arr(r.sens)
  p.motivations = arr(r.motivations)
  p.classement = Boolean(r.classement)
  p.sensLibre = typeof r.sensLibre === 'string' ? r.sensLibre : ''
  p.pitch = typeof r.pitch === 'string' ? r.pitch : ''
  p.savoirsAjoutes = isObj(r.savoirsAjoutes) ? r.savoirsAjoutes : {}
  p.savoirs = {}
  if (isObj(r.savoirs))
    for (const [id, etat] of Object.entries(r.savoirs))
      if (['mobiliser', 'ecarter', 'developper'].includes(etat) && (SAVOIRS[id] || p.savoirsAjoutes[id])) p.savoirs[id] = etat
  p.curseurs = {}
  if (isObj(r.curseurs))
    for (const [id, c] of Object.entries(r.curseurs))
      if (CURSEURS[id] && c?.pos >= 1 && c?.pos <= 5) p.curseurs[id] = { pos: Math.round(c.pos), importance: c.importance === 'indispensable' ? 'indispensable' : 'souhaitable' }
  p.choix = {}
  if (isObj(r.choix))
    for (const [g, c] of Object.entries(r.choix)) {
      if (!CHOIX[g] || !isObj(c?.valeurs)) continue
      const valeurs = Object.fromEntries(Object.entries(c.valeurs).filter(([o, e]) => CHOIX[g].byId[o] && (e === 'oui' || e === 'eviter')))
      if (Object.keys(valeurs).length) p.choix[g] = { valeurs, importance: c.importance === 'indispensable' ? 'indispensable' : 'souhaitable' }
    }
  return p
}

/** Nombre de critères renseignés dans chaque dimension. */
export function countByDimension(p) {
  return {
    aime: p.aime.length,
    savoirs: Object.keys(p.savoirs).length,
    interets: p.interets.length,
    sens: p.sens.length + (p.sensLibre.trim() ? 1 : 0),
    motivations: p.motivations.length,
    conditions:
      Object.keys(p.curseurs).length + Object.values(p.choix).reduce((n, c) => n + Object.keys(c.valeurs).length, 0),
  }
}

export const countPortrait = (p) => Object.values(countByDimension(p)).reduce((a, b) => a + b, 0)

/** Nombre de dimensions renseignées (pour l'indicateur de progression). */
export const dimensionsRenseignees = (p) => Object.values(countByDimension(p)).filter(Boolean).length

/** Vide une dimension. */
export function resetDimension(p, id) {
  const e = EMPTY_PORTRAIT
  switch (id) {
    case 'aime':
      return { ...p, aime: [] }
    case 'savoirs':
      return { ...p, savoirs: {}, savoirsAjoutes: e.savoirsAjoutes }
    case 'interets':
      return { ...p, interets: [] }
    case 'sens':
      return { ...p, sens: [], sensLibre: '' }
    case 'motivations':
      return { ...p, motivations: [], classement: false }
    case 'conditions':
      return { ...p, curseurs: {}, choix: {} }
    default:
      return p
  }
}

export const toggleIn = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

/** Identifiant d'un élément ajouté librement. */
export const persoId = (libelle) => `perso:${libelle.trim()}`
export const isPerso = (id) => id.startsWith('perso:')
export const persoLabel = (id) => id.slice('perso:'.length)

/** Identifiant d'un savoir-faire ajouté (libre ou issu du ROME). */
export const savoirAjouteId = (libelle, source) => `${source}:${slug(libelle)}`

/** Libellé d'un savoir-faire (bibliothèque ou ajout). */
export const savoirLabel = (p, id) => SAVOIRS[id]?.libelle || p.savoirsAjoutes[id]?.libelle || id

/** Motivations prioritaires (si l'utilisateur a choisi de les classer). */
export const priorites = (p) => (p.classement ? p.motivations.slice(0, MAX_PRIORITES) : [])

/** Déplace un élément d'une liste ordonnée. */
export function move(list, from, to) {
  if (to < 0 || to >= list.length || from === to) return list
  const next = [...list]
  const [x] = next.splice(from, 1)
  next.splice(to, 0, x)
  return next
}

export const DIMENSION_IDS = DIMENSIONS.map((d) => d.id)
