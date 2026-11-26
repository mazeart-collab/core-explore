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

// Barème par pilier de l'Ikigai, pondéré par la rareté des critères.
// - Chaque critère positif vaut un poids d'autant plus grand qu'il est rare parmi les métiers
//   (« Organisation et rigueur », présent presque partout, compte peu ; « Protéger les animaux » compte beaucoup).
// - Dans chaque dimension, on ne compte au plus que ce qu'un métier peut contenir (PLAFONDS) :
//   cocher 12 activités ne rend plus 100 % impossible.
// - Le taux final est la moyenne des piliers renseignés : chaque pilier pèse pareil.
// Le taux reste absolu : il n'est jamais comparé au meilleur métier.
const LIST_DIMENSIONS = [
  { key: 'activites', map: ACTIVITES, dimension: 'Activités que vous aimez', pilier: 'aime' },
  { key: 'centres_interet', map: CENTRES_INTERET, dimension: "Centres d'intérêt", pilier: 'aime' },
  { key: 'sens_causes', map: SENS, dimension: 'Ce qui donne du sens', pilier: 'sens' },
  { key: 'motivations', map: MOTIVATIONS, dimension: 'Motivations', pilier: 'equilibre' },
]
const RARETE_KEYS = ['activites', 'centres_interet', 'sens_causes', 'motivations', 'competences_categories']
// Nombre maximal de critères comptés par dimension (≈ ce que porte un métier).
const PLAFONDS = { activites: 5, centres_interet: 3, sens_causes: 2, motivations: 3, competences_categories: 3 }
const POIDS_CONDITION = { indispensable: 3, souhaitable: 1 }
const PENALITE = 0.15 // retirée du taux par infraction (« Ne veux plus utiliser » ou « À éviter »)
const MAX_ETOILES_SI_INFRACTION = 3
const MAX_ETOILES_SI_INDISPENSABLE_MANQUE = 4
/** Nombre minimal de piliers en commun quand l'utilisateur en a renseigné au moins autant. */
export const PILIERS_MIN = 3
/** Taille d'une page de résultats (« Voir plus » en ajoute autant). */
export const PAGE_RESULTATS = 20

const rareteCache = new WeakMap()
/** Poids de rareté (IDF) de chaque étiquette, calculé une fois par liste de métiers. */
export function rarete(metiers) {
  let r = rareteCache.get(metiers)
  if (r) return r
  const df = {}
  for (const m of metiers) {
    const e = m.enrichi_ia || {}
    for (const k of RARETE_KEYS) for (const t of e[k] || []) df[`${k}:${t}`] = (df[`${k}:${t}`] || 0) + 1
  }
  const n = metiers.length
  r = (k, t) => Math.log((n + 1) / ((df[`${k}:${t}`] || 0) + 1)) + 0.1
  rareteCache.set(metiers, r)
  return r
}

const sommeTop = (poids, k) =>
  poids
    .sort((a, b) => b - a)
    .slice(0, k)
    .reduce((a, b) => a + b, 0)

/**
 * Évalue un métier par rapport aux critères.
 * `poids` : fonction de rareté renvoyée par rarete(metiers) (sinon tous les critères pèsent 1).
 * Renvoie { rate (0–1, interne), stars, reasons: [{dimension, items}], gaps: [texte], piliers: Set,
 *           piliersActifs, focus (0–1, départage les ex æquo) }.
 */
export function evaluate(metier, criteria, poids = () => 1) {
  const e = metier.enrichi_ia || {}
  const reasons = []
  const gaps = []
  const piliers = new Set()
  const score = {} // pilier -> { gagne, max }
  const ajoute = (pilier, gagne, max) => {
    if (!max) return
    score[pilier] ||= { gagne: 0, max: 0 }
    score[pilier].gagne += gagne
    score[pilier].max += max
  }
  let rareteCommune = 0
  let rareteMetier = 0 // poids des étiquettes du métier dans les dimensions renseignées
  let infractions = 0
  let indispensableManque = false

  for (const d of LIST_DIMENSIONS) {
    const mine = criteria[d.key]
    if (!mine.length) continue
    const set = new Set(e[d.key] || [])
    for (const t of set) rareteMetier += poids(d.key, t)
    const communs = mine.filter((id) => set.has(id))
    const pCommuns = communs.map((id) => poids(d.key, id))
    rareteCommune += pCommuns.reduce((a, b) => a + b, 0)
    ajoute(d.pilier, sommeTop(pCommuns, PLAFONDS[d.key]), sommeTop(mine.map((id) => poids(d.key, id)), PLAFONDS[d.key]))
    if (communs.length) {
      reasons.push({ dimension: d.dimension, items: communs.map((id) => label(d.map, id)) })
      piliers.add(d.pilier)
    }
  }

  const comps = new Set(e.competences_categories || [])
  const positives = Object.entries(criteria.competences)
    .filter(([, etat]) => etat !== 'ne_plus')
    .map(([id]) => id)
  if (positives.length) {
    for (const t of comps) rareteMetier += poids('competences_categories', t)
    const pCommuns = positives.filter((id) => comps.has(id)).map((id) => poids('competences_categories', id))
    rareteCommune += pCommuns.reduce((a, b) => a + b, 0)
    ajoute(
      'talents',
      sommeTop(pCommuns, PLAFONDS.competences_categories),
      sommeTop(positives.map((id) => poids('competences_categories', id)), PLAFONDS.competences_categories),
    )
  }
  const utiliser = []
  const developper = []
  const nePlus = []
  for (const [id, etat] of Object.entries(criteria.competences)) {
    if (!comps.has(id)) continue
    if (etat === 'utiliser') utiliser.push(label(COMPETENCES, id))
    else if (etat === 'developper') developper.push(label(COMPETENCES, id))
    else if (etat === 'ne_plus') nePlus.push(label(COMPETENCES, id))
  }
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

    const p = POIDS_CONDITION[importance] ?? 1
    if (match) {
      ajoute('equilibre', p, p)
      condOk.push(`${critere.libelle} : ${actual}`)
    } else if (known) {
      ajoute('equilibre', 0, p)
      if (importance === 'indispensable') indispensableManque = true
      gaps.push(
        `${critere.libelle} : vous ${importance === 'indispensable' ? 'exigez' : 'préférez'} « ${wanted} », ce métier est plutôt « ${actual} ».`,
      )
    } else {
      // Information variable ou inconnue : moitié des points, à vérifier.
      ajoute('equilibre', p / 2, p)
      gaps.push(`${critere.libelle} : ${incertain}, à vérifier.`)
    }
  }
  if (condOk.length) {
    reasons.push({ dimension: 'Conditions de travail', items: condOk })
    piliers.add('equilibre')
  }

  const taux = Object.values(score).map((s) => s.gagne / s.max)
  const moyenne = taux.length ? taux.reduce((a, b) => a + b, 0) / taux.length : 0
  const rate = Math.max(0, moyenne - infractions * PENALITE)
  let stars = starsFor(rate)
  if (infractions) stars = Math.min(stars, MAX_ETOILES_SI_INFRACTION)
  if (indispensableManque) stars = Math.min(stars, MAX_ETOILES_SI_INDISPENSABLE_MANQUE)
  // Part du profil du métier couverte par vos choix : à taux égal, un métier « centré » sur vos choix passe devant.
  const focus = rareteMetier ? rareteCommune / rareteMetier : 0
  return { rate, stars, reasons, gaps, piliers, piliersActifs: taux.length, focus }
}

/** Nombre de piliers en commun exigé pour qu'un métier soit proposé. */
const piliersRequis = (piliersActifs) => (piliersActifs >= PILIERS_MIN ? PILIERS_MIN : 1)

/**
 * Classe les métiers ; renvoie { results, hiddenCount }.
 * - Seuls les métiers d'au moins 3 étoiles qui partagent au moins PILIERS_MIN piliers sont retenus.
 * - S'il y en a moins d'une page (PAGE_RESULTATS), les métiers 2 étoiles complètent la liste.
 * - À taux égal, les métiers dont le profil est le plus centré sur vos choix passent devant.
 * `reference` : liste servant à calculer la rareté des critères (par défaut, `metiers`).
 * hiddenCount : métiers ayant un point commun mais non proposés.
 */
export function rank(metiers, criteria, reference = metiers) {
  if (!countCriteria(criteria)) return { results: [], hiddenCount: 0 }
  const poids = rarete(reference)
  let avecPointCommun = 0
  const forts = []
  const ouverture = []
  for (const metier of metiers) {
    const ev = evaluate(metier, criteria, poids)
    if (!ev.reasons.length) continue
    avecPointCommun++
    if (ev.piliers.size < piliersRequis(ev.piliersActifs)) continue
    if (ev.stars >= 3) forts.push({ metier, ...ev })
    else if (ev.stars === 2) ouverture.push({ metier, ...ev })
  }
  const results = forts.length < PAGE_RESULTATS ? [...forts, ...ouverture] : forts
  results.sort(
    (a, b) =>
      b.stars - a.stars ||
      b.rate - a.rate ||
      b.focus - a.focus ||
      a.metier.intitule.localeCompare(b.metier.intitule, 'fr'),
  )
  return { results, hiddenCount: avecPointCommun - results.length }
}

const familleDe = (m) => familleOf(m.enrichi_ia?.secteurs?.[0]) || 'autre'

/**
 * « Surprenez-moi » : des métiers variés, un par famille d'univers,
 * en privilégiant les familles absentes des premiers résultats.
 */
export function surprise(metiers, criteria, topResults, count = 6, random = Math.random) {
  const poids = rarete(metiers)
  const shuffled = [...metiers].sort(() => random() - 0.5)
  const topCodes = new Set(topResults.slice(0, 10).map((r) => r.metier.code_rome))
  const topFamilles = new Set(topResults.slice(0, 10).map((r) => familleDe(r.metier)))

  const candidates = shuffled
    .filter((m) => !topCodes.has(m.code_rome))
    .map((m) => ({ metier: m, ...evaluate(m, criteria, poids) }))
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
