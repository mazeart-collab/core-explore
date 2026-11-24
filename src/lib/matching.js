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

/** Pour une échelle : la valeur du métier est-elle voisine d'une valeur souhaitée ? */
function conditionNear(critere, v, valeurs) {
  if (critere.type !== 'echelle' || Array.isArray(v)) return false
  const order = critere.options.map((o) => o.id)
  const i = order.indexOf(v)
  return valeurs.some((x) => Math.abs(order.indexOf(x) - i) === 1)
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
  if (rate > 0.9) return 5
  return NIVEAUX.find((n) => n.etoiles < 5 && rate >= n.min)?.etoiles ?? 0
}

// Poids de chaque dimension et nombre de correspondances suffisant pour la considérer comme pleinement remplie
// (choisir 10 activités ne doit pas empêcher un métier qui en propose 3 d'être un coup de cœur).
const LIST_DIMENSIONS = [
  { key: 'activites', map: ACTIVITES, dimension: 'Activités que vous aimez', weight: 3, cap: 3, pilier: 'aime' },
  { key: 'centres_interet', map: CENTRES_INTERET, dimension: "Centres d'intérêt", weight: 1.5, cap: 2, pilier: 'aime' },
  { key: 'sens_causes', map: SENS, dimension: 'Ce qui donne du sens', weight: 2, cap: 2, pilier: 'sens' },
  { key: 'motivations', map: MOTIVATIONS, dimension: 'Motivations', weight: 1.5, cap: 3, pilier: 'equilibre' },
]
const COMPETENCES_WEIGHT = 2
const COMPETENCES_CAP = 2
const CONDITION_WEIGHTS = { indispensable: 3, souhaitable: 1, eviter: 1.5 }
const PENALITE_EVITER = 0.15
const PENALITE_NE_PLUS = 0.1

/**
 * Évalue un métier par rapport aux critères.
 * Renvoie { rate (0–1, interne), stars, reasons: [{dimension, items}], gaps: [texte], piliers: Set, excluded }.
 */
export function evaluate(metier, criteria) {
  const e = metier.enrichi_ia || {}
  const reasons = []
  const gaps = []
  const piliers = new Set()
  let total = 0
  let obtained = 0
  let penalty = 0
  let excluded = false

  for (const d of LIST_DIMENSIONS) {
    const mine = criteria[d.key]
    if (!mine.length) continue
    const set = new Set(e[d.key] || [])
    const items = mine.filter((id) => set.has(id)).map((id) => label(d.map, id))
    total += d.weight
    obtained += d.weight * Math.min(1, items.length / Math.min(mine.length, d.cap))
    if (items.length) {
      reasons.push({ dimension: d.dimension, items })
      piliers.add(d.pilier)
    }
  }

  const comps = new Set(e.competences_categories || [])
  const utiliser = []
  const developper = []
  const nePlus = []
  let positives = 0
  for (const [id, etat] of Object.entries(criteria.competences)) {
    if (etat !== 'ne_plus') positives++
    if (!comps.has(id)) continue
    if (etat === 'utiliser') utiliser.push(label(COMPETENCES, id))
    else if (etat === 'developper') developper.push(label(COMPETENCES, id))
    else if (etat === 'ne_plus') nePlus.push(label(COMPETENCES, id))
  }
  if (positives) {
    total += COMPETENCES_WEIGHT
    obtained += COMPETENCES_WEIGHT * Math.min(1, (utiliser.length + developper.length) / Math.min(positives, COMPETENCES_CAP))
  }
  if (utiliser.length) reasons.push({ dimension: 'Compétences que vous voulez utiliser', items: utiliser })
  if (developper.length) reasons.push({ dimension: 'Compétences que vous pourriez développer', items: developper })
  if (utiliser.length || developper.length) piliers.add('talents')
  if (nePlus.length) {
    gaps.push(`Fait appel à des compétences que vous ne souhaitez plus utiliser : ${nePlus.join(', ')}.`)
    penalty += nePlus.length * PENALITE_NE_PLUS
  }

  const condOk = []
  const ct = e.conditions_travail || {}
  for (const [id, pref] of Object.entries(criteria.conditions)) {
    const valeurs = pref?.valeurs || []
    const critere = CRITERES_BY_ID[id]
    if (!valeurs.length || !critere) continue
    const importance = pref.importance || 'souhaitable'
    const weight = CONDITION_WEIGHTS[importance] ?? 1
    const v = ct[id] ?? null
    const known = isKnown(v)
    const match = known && conditionMatches(v, valeurs)
    const wanted = valeursLabel(id, valeurs)
    const actual = conditionLabel(id, v)
    total += weight

    if (importance === 'eviter') {
      if (match) {
        penalty += PENALITE_EVITER
        gaps.push(`${critere.libelle} : ${actual}, alors que vous souhaitez l’éviter.`)
      } else if (known) {
        obtained += weight
        condOk.push(`${critere.libelle} : ${actual}`)
      } else {
        obtained += weight / 2
        if (v === 'variable') gaps.push(`${critere.libelle} : variable selon le poste, à vérifier (vous souhaitez éviter « ${wanted} »).`)
      }
    } else if (match) {
      obtained += weight
      condOk.push(`${critere.libelle} : ${actual}`)
    } else if (known) {
      // Un critère indispensable non respecté écarte le métier (non négociable).
      if (importance === 'indispensable') excluded = true
      else {
        if (conditionNear(critere, v, valeurs)) obtained += weight / 2
        gaps.push(`${critere.libelle} : vous préférez « ${wanted} », ce métier est plutôt « ${actual} ».`)
      }
    } else {
      obtained += weight / 2
      gaps.push(
        `${critere.libelle} : ${v === 'variable' ? 'variable selon l’employeur ou le poste' : 'information non disponible'}, à vérifier.`,
      )
    }
  }
  if (condOk.length) {
    reasons.push({ dimension: 'Conditions de travail', items: condOk })
    piliers.add('equilibre')
  }

  const rate = total ? Math.max(0, obtained / total - penalty) : 0
  return { rate, stars: starsFor(rate), reasons, gaps, piliers, excluded }
}

/**
 * Classe les métiers (au moins 2 étoiles) ; renvoie { results, excludedCount, hiddenCount }.
 * hiddenCount : métiers ayant un point commun mais trop peu proches pour être affichés.
 */
export function rank(metiers, criteria) {
  if (!countCriteria(criteria)) return { results: [], excludedCount: 0, hiddenCount: 0 }
  let excludedCount = 0
  let hiddenCount = 0
  const results = []
  for (const metier of metiers) {
    const ev = evaluate(metier, criteria)
    if (ev.excluded) excludedCount++
    else if (!ev.reasons.length) continue
    else if (ev.stars < 2) hiddenCount++
    else results.push({ metier, ...ev })
  }
  results.sort((a, b) => b.rate - a.rate || a.metier.intitule.localeCompare(b.metier.intitule, 'fr'))
  return { results, excludedCount, hiddenCount }
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
    .filter((r) => !r.excluded)
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
