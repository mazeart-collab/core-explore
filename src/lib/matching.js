// Moteur multicritère de la page « Je trouve ce qui m'anime ».
// Le score sert uniquement à ordonner les résultats : il n'est jamais affiché.
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

/**
 * Évalue un métier par rapport aux critères.
 * Renvoie { score, reasons: [{dimension, items}], gaps: [texte], excluded }.
 */
export function evaluate(metier, criteria) {
  const e = metier.enrichi_ia || {}
  const reasons = []
  const gaps = []
  let score = 0

  const overlap = (key, mine, map, dimension, weight) => {
    const set = new Set(e[key] || [])
    const items = mine.filter((id) => set.has(id)).map((id) => label(map, id))
    if (items.length) {
      reasons.push({ dimension, items })
      score += items.length * weight
    }
  }

  overlap('activites', criteria.activites, ACTIVITES, 'Activités que vous aimez', 3)

  const comps = new Set(e.competences_categories || [])
  const utiliser = []
  const developper = []
  const nePlus = []
  for (const [id, etat] of Object.entries(criteria.competences)) {
    if (!comps.has(id)) continue
    if (etat === 'utiliser') utiliser.push(label(COMPETENCES, id))
    else if (etat === 'developper') developper.push(label(COMPETENCES, id))
    else if (etat === 'ne_plus') nePlus.push(label(COMPETENCES, id))
  }
  if (utiliser.length) {
    reasons.push({ dimension: 'Compétences que vous voulez utiliser', items: utiliser })
    score += utiliser.length * 2
  }
  if (developper.length) {
    reasons.push({ dimension: 'Compétences que vous pourriez développer', items: developper })
    score += developper.length * 2
  }
  if (nePlus.length) {
    gaps.push(`Fait appel à des compétences que vous ne souhaitez plus utiliser : ${nePlus.join(', ')}.`)
    score -= nePlus.length * 2
  }

  overlap('centres_interet', criteria.centres_interet, CENTRES_INTERET, "Centres d'intérêt", 2)
  overlap('sens_causes', criteria.sens_causes, SENS, 'Ce qui donne du sens', 2)
  overlap('motivations', criteria.motivations, MOTIVATIONS, 'Motivations', 2)

  const condOk = []
  let excluded = false
  const ct = e.conditions_travail || {}
  for (const [id, pref] of Object.entries(criteria.conditions)) {
    const valeurs = pref?.valeurs || []
    if (!valeurs.length || !CRITERES_BY_ID[id]) continue
    const critere = CRITERES_BY_ID[id]
    const v = ct[id] ?? null
    const known = isKnown(v)
    const match = known && conditionMatches(v, valeurs)
    const wanted = valeursLabel(id, valeurs)
    const actual = conditionLabel(id, v)
    const importance = pref.importance || 'souhaitable'

    if (importance === 'eviter') {
      if (match) excluded = true
      else if (known) {
        condOk.push(`${critere.libelle} : ${actual}`)
        score += 1
      } else if (v === 'variable') gaps.push(`${critere.libelle} : variable selon le poste, à vérifier (vous souhaitez éviter « ${wanted} »).`)
    } else if (match) {
      condOk.push(`${critere.libelle} : ${actual}`)
      score += importance === 'indispensable' ? 3 : 2
    } else if (known) {
      if (importance === 'indispensable') excluded = true
      else gaps.push(`${critere.libelle} : vous préférez « ${wanted} », ce métier est plutôt « ${actual} ».`)
    } else {
      gaps.push(
        `${critere.libelle} : ${v === 'variable' ? 'variable selon l’employeur ou le poste' : 'information non disponible'}, à vérifier.`,
      )
    }
  }
  if (condOk.length) reasons.push({ dimension: 'Conditions de travail', items: condOk })

  return { score, reasons, gaps, excluded }
}

/** Classe les métiers ; renvoie { results, excludedCount }. */
export function rank(metiers, criteria) {
  if (!countCriteria(criteria)) return { results: [], excludedCount: 0 }
  let excludedCount = 0
  const results = []
  for (const metier of metiers) {
    const ev = evaluate(metier, criteria)
    if (ev.excluded) {
      excludedCount++
      continue
    }
    if (ev.reasons.length && ev.score > 0) results.push({ metier, ...ev })
  }
  results.sort((a, b) => b.score - a.score || a.metier.intitule.localeCompare(b.metier.intitule, 'fr'))
  return { results, excludedCount }
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
