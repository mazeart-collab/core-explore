// Moteur multicritère de la page « Je trouve ce qui m'anime ».
// Le taux de correspondance est interne : il n'est affiché que sous forme d'étoiles.
import {
  ACTIVITES,
  CENTRES_INTERET,
  COMPETENCES,
  CRITERES_BY_ID,
  MOTIVATIONS,
  SENS,
  conditionLabel,
  familleOf,
  label,
} from './taxonomies'

export const EMPTY_CRITERIA = {
  activites: [],
  competences: {}, // { categorie: 'utiliser' | 'ne_plus' | 'developper' }
  centres_interet: [],
  sens_causes: [],
  motivations: [],
  conditions: {}, // { critere: { valeurs: [...], importance: 'indispensable' | 'souhaitable' | 'eviter' } }
}

export const COMPETENCE_ETATS = [
  { id: 'utiliser', libelle: 'Je possède et veux utiliser' },
  { id: 'ne_plus', libelle: 'Je possède mais ne veux plus utiliser' },
  { id: 'developper', libelle: 'Je veux développer' },
]

export const IMPORTANCES = [
  { id: 'indispensable', libelle: 'Indispensable' },
  { id: 'souhaitable', libelle: 'Souhaitable' },
  { id: 'eviter', libelle: 'À éviter' },
]

export function countCriteria(c) {
  return (
    c.activites.length +
    Object.keys(c.competences).length +
    c.centres_interet.length +
    c.sens_causes.length +
    c.motivations.length +
    Object.values(c.conditions).filter((x) => x.valeurs?.length).length
  )
}

/** Complète un objet partiel (localStorage, API) avec les clés attendues. */
export function normalizeCriteria(raw) {
  const c = { ...EMPTY_CRITERIA, ...(raw || {}) }
  for (const k of ['activites', 'centres_interet', 'sens_causes', 'motivations']) {
    c[k] = Array.isArray(c[k]) ? c[k] : []
  }
  c.competences = c.competences && typeof c.competences === 'object' ? c.competences : {}
  c.conditions = c.conditions && typeof c.conditions === 'object' ? c.conditions : {}
  return c
}

const isKnown = (v) => v !== null && v !== undefined && v !== 'variable' && !(Array.isArray(v) && !v.length)

function conditionMatches(v, valeurs) {
  return Array.isArray(v) ? v.some((x) => valeurs.includes(x)) : valeurs.includes(v)
}

function valeursLabel(critereId, valeurs) {
  return conditionLabel(critereId, valeurs.length === 1 ? valeurs[0] : valeurs)
}

/** Les 4 piliers de l'Ikigai et les dimensions de critères qui les alimentent. */
export const PILIERS = [
  { id: 'aime', libelle: 'Ce que j’aime', detail: 'Activités et centres d’intérêt', panels: ['activites', 'centres'] },
  { id: 'talents', libelle: 'Mes talents', detail: 'Compétences', panels: ['competences'] },
  { id: 'sens', libelle: 'Ce qui a du sens', detail: 'Sens et causes', panels: ['sens'] },
  { id: 'equilibre', libelle: 'Mon équilibre pro', detail: 'Motivations et conditions de travail', panels: ['motivations', 'conditions'] },
]

/** Piliers pour lesquels l'utilisateur a choisi au moins un critère. */
export function activePiliers(c) {
  const set = new Set()
  if (c.activites.length || c.centres_interet.length) set.add('aime')
  if (Object.keys(c.competences).length) set.add('talents')
  if (c.sens_causes.length) set.add('sens')
  if (c.motivations.length || Object.values(c.conditions).some((x) => x?.valeurs?.length)) set.add('equilibre')
  return set
}

/** Niveaux d'étoiles (le pourcentage interne n'est jamais affiché). */
export const NIVEAUX = [
  { etoiles: 5, min: 0.9, libelle: 'Coups de cœur' },
  { etoiles: 4, min: 0.7, libelle: 'Très belles pistes' },
  { etoiles: 3, min: 0.5, libelle: 'Pistes à explorer' },
  { etoiles: 2, min: 0.3, libelle: 'Pistes d’ouverture' },
]

export function starsFor(rate) {
  return NIVEAUX.find((n) => rate >= n.min)?.etoiles ?? 0
}

// Barème absolu : chaque critère positif coché compte individuellement.
// Le taux = points gagnés / somme des poids de tous les critères positifs cochés,
// sans aucune normalisation par rapport aux autres métiers.
const LIST_DIMENSIONS = [
  { key: 'activites', map: ACTIVITES, dimension: 'Activités que vous aimez', pilier: 'aime' },
  { key: 'centres_interet', map: CENTRES_INTERET, dimension: "Centres d'intérêt", pilier: 'aime' },
  { key: 'sens_causes', map: SENS, dimension: 'Ce qui donne du sens', pilier: 'sens' },
  { key: 'motivations', map: MOTIVATIONS, dimension: 'Motivations', pilier: 'equilibre' },
]
const POIDS_TAG = 1 // activité, centre d'intérêt, sens, motivation, compétence à utiliser ou développer
const POIDS_CONDITION = { indispensable: 3, souhaitable: 1 }
const PENALITE = 3 // par infraction (« Ne veux plus utiliser » ou « À éviter »)
const MAX_ETOILES_SI_INFRACTION = 3
const MAX_ETOILES_SI_INDISPENSABLE_MANQUE = 4

/**
 * Évalue un métier par rapport aux critères.
 * Renvoie { rate (0–1, interne), stars, reasons: [{dimension, items}], gaps: [texte], piliers: Set }.
 */
export function evaluate(metier, criteria) {
  const e = metier.enrichi_ia || {}
  const reasons = []
  const gaps = []
  const piliers = new Set()
  let maxPossiblePoints = 0
  let earnedPoints = 0
  let infractions = 0
  let indispensableManque = false

  for (const d of LIST_DIMENSIONS) {
    const mine = criteria[d.key]
    if (!mine.length) continue
    const set = new Set(e[d.key] || [])
    const items = mine.filter((id) => set.has(id)).map((id) => label(d.map, id))
    maxPossiblePoints += mine.length * POIDS_TAG
    earnedPoints += items.length * POIDS_TAG
    if (items.length) {
      reasons.push({ dimension: d.dimension, items })
      piliers.add(d.pilier)
    }
  }

  const comps = new Set(e.competences_categories || [])
  const utiliser = []
  const developper = []
  const nePlus = []
  for (const [id, etat] of Object.entries(criteria.competences)) {
    if (etat !== 'ne_plus') maxPossiblePoints += POIDS_TAG
    if (!comps.has(id)) continue
    if (etat === 'utiliser') utiliser.push(label(COMPETENCES, id))
    else if (etat === 'developper') developper.push(label(COMPETENCES, id))
    else if (etat === 'ne_plus') nePlus.push(label(COMPETENCES, id))
  }
  earnedPoints += (utiliser.length + developper.length) * POIDS_TAG
  if (utiliser.length) reasons.push({ dimension: 'Compétences que vous voulez utiliser', items: utiliser })
  if (developper.length) reasons.push({ dimension: 'Compétences que vous pourriez développer', items: developper })
  if (utiliser.length || developper.length) piliers.add('talents')
  if (nePlus.length) {
    infractions += nePlus.length
    gaps.push(`Fait appel à des compétences que vous ne souhaitez plus utiliser : ${nePlus.join(', ')}.`)
  }

  const condOk = []
  const ct = e.conditions_travail || {}
  for (const [id, pref] of Object.entries(criteria.conditions)) {
    const valeurs = pref?.valeurs || []
    const critere = CRITERES_BY_ID[id]
    if (!valeurs.length || !critere) continue
    const importance = pref.importance || 'souhaitable'
    const v = ct[id] ?? null
    const known = isKnown(v)
    const match = known && conditionMatches(v, valeurs)
    const wanted = valeursLabel(id, valeurs)
    const actual = conditionLabel(id, v)
    const incertain = v === 'variable' ? 'variable selon l’employeur ou le poste' : 'information non disponible'

    if (importance === 'eviter') {
      // Critère négatif : il n'entre pas dans le maximum, mais chaque infraction coûte cher.
      if (match) {
        infractions++
        gaps.push(`${critere.libelle} : ${actual}, alors que vous souhaitez l’éviter.`)
      } else if (!known) gaps.push(`${critere.libelle} : ${incertain}, à vérifier (vous souhaitez éviter « ${wanted} »).`)
      continue
    }

    const poids = POIDS_CONDITION[importance] ?? 1
    maxPossiblePoints += poids
    if (match) {
      earnedPoints += poids
      condOk.push(`${critere.libelle} : ${actual}`)
    } else if (known) {
      if (importance === 'indispensable') indispensableManque = true
      gaps.push(
        `${critere.libelle} : vous ${importance === 'indispensable' ? 'exigez' : 'préférez'} « ${wanted} », ce métier est plutôt « ${actual} ».`,
      )
    } else {
      // Information variable ou inconnue : moitié des points, à vérifier.
      earnedPoints += poids / 2
      gaps.push(`${critere.libelle} : ${incertain}, à vérifier.`)
    }
  }
  if (condOk.length) {
    reasons.push({ dimension: 'Conditions de travail', items: condOk })
    piliers.add('equilibre')
  }

  earnedPoints -= infractions * PENALITE
  const rate = maxPossiblePoints ? Math.max(0, earnedPoints) / maxPossiblePoints : 0
  let stars = starsFor(rate)
  if (infractions) stars = Math.min(stars, MAX_ETOILES_SI_INFRACTION)
  if (indispensableManque) stars = Math.min(stars, MAX_ETOILES_SI_INDISPENSABLE_MANQUE)
  return { rate, stars, reasons, gaps, piliers }
}

/**
 * Classe les métiers (au moins 2 étoiles) ; renvoie { results, hiddenCount }.
 * hiddenCount : métiers ayant un point commun mais trop peu proches pour être affichés.
 */
export function rank(metiers, criteria) {
  if (!countCriteria(criteria)) return { results: [], hiddenCount: 0 }
  let hiddenCount = 0
  const results = []
  for (const metier of metiers) {
    const ev = evaluate(metier, criteria)
    if (!ev.reasons.length) continue
    else if (ev.stars < 2) hiddenCount++
    else results.push({ metier, ...ev })
  }
  results.sort((a, b) => b.stars - a.stars || b.rate - a.rate || a.metier.intitule.localeCompare(b.metier.intitule, 'fr'))
  return { results, hiddenCount }
}

const familleDe = (m) => familleOf(m.enrichi_ia?.secteurs?.[0]) || 'autre'

/**
 * « Surprenez-moi » : des métiers variés, un par famille d'univers,
 * en privilégiant les familles absentes des premiers résultats.
 */
export function surprise(metiers, criteria, topResults, count = 6, random = Math.random) {
  const shuffled = [...metiers].sort(() => random() - 0.5)
  const topCodes = new Set(topResults.slice(0, 10).map((r) => r.metier.code_rome))
  const topFamilles = new Set(topResults.slice(0, 10).map((r) => familleDe(r.metier)))

  const candidates = shuffled
    .filter((m) => !topCodes.has(m.code_rome))
    .map((m) => ({ metier: m, ...evaluate(m, criteria) }))
    // Familles moins évidentes d'abord, puis métiers ayant au moins un point commun.
    .sort(
      (a, b) =>
        Number(topFamilles.has(familleDe(a.metier))) - Number(topFamilles.has(familleDe(b.metier))) ||
        Number(b.reasons.length > 0) - Number(a.reasons.length > 0),
    )

  const picked = []
  const familles = new Set()
  for (const c of candidates) {
    const f = familleDe(c.metier)
    if (familles.has(f)) continue
    familles.add(f)
    picked.push(c)
    if (picked.length >= count) return picked
  }
  // Pas assez de familles différentes : on complète.
  for (const c of candidates) {
    if (picked.length >= count) break
    if (!picked.includes(c)) picked.push(c)
  }
  return picked
}
