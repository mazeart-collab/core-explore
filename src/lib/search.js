// Recherche simple dans les métiers : insensible aux accents et à la casse,
// tolérante aux petites fautes de frappe.
// Chaque mot de la requête est cherché tel quel (début de mot ou partie de mot) ;
// s'il n'apparaît nulle part, on cherche les mots les plus proches du vocabulaire (Fuse.js).
import Fuse from 'fuse.js'
import { normalize } from './text'
import { ACTIVITES, CENTRES_INTERET, COMPETENCES, MOTIVATIONS, SENS, UNIVERS, label } from './taxonomies'

const FIELDS = [
  ['intitule', 4],
  ['appellations', 3],
  ['tags', 2],
  ['definition', 1],
  ['activites', 1],
  ['savoirs', 1],
]

function toDoc(m) {
  const o = m.officiel_rome
  const e = m.enrichi_ia || {}
  const tags = [
    ...(e.secteurs || []).map((id) => label(UNIVERS, id)),
    ...(e.activites || []).map((id) => label(ACTIVITES, id)),
    ...(e.competences_categories || []).map((id) => label(COMPETENCES, id)),
    ...(e.centres_interet || []).map((id) => label(CENTRES_INTERET, id)),
    ...(e.sens_causes || []).map((id) => label(SENS, id)),
    ...(e.motivations || []).map((id) => label(MOTIVATIONS, id)),
  ]
  const join = (list) => ' ' + (list || []).map(normalize).join(' | ') + ' '
  return {
    intitule: join([m.intitule || o.intitule]),
    appellations: join(o.appellations),
    tags: join(tags),
    definition: join([o.definition]),
    activites: join(o.activites_rome),
    savoirs: join(o.competences_rome?.savoirs),
  }
}

const tokenize = (text) => normalize(text).split(/[^a-z0-9]+/).filter((w) => w.length >= 2)

const cache = new WeakMap()

/**
 * Index de recherche construit une seule fois par jeu de données (mis en cache) ;
 * renvoie une fonction query → liste de métiers (ou null si requête vide).
 */
export function getSearch(metiers) {
  if (!cache.has(metiers)) cache.set(metiers, createSearch(metiers))
  return cache.get(metiers)
}

function createSearch(metiers) {
  const docs = metiers.map(toDoc)
  // Vocabulaire : mot → (métier → poids du meilleur champ), pour la recherche approchée.
  const vocabulary = new Map()
  docs.forEach((d, i) => {
    for (const [field, weight] of FIELDS) {
      for (const w of tokenize(d[field])) {
        if (w.length < 3) continue
        let entry = vocabulary.get(w)
        if (!entry) vocabulary.set(w, (entry = new Map()))
        if ((entry.get(i) || 0) < weight * 2) entry.set(i, weight * 2)
      }
    }
  })
  const fuzzy = new Fuse([...vocabulary.keys()], { includeScore: true, threshold: 0.25 })

  // Poids du meilleur champ contenant le texte, 0 sinon. Un début de mot compte double.
  const fieldScore = (doc, text) => {
    let best = 0
    for (const [field, weight] of FIELDS) {
      const s = doc[field]
      if (s.includes(' ' + text) || s.includes('-' + text) || s.includes("'" + text)) best = Math.max(best, weight * 2)
      else if (s.includes(text)) best = Math.max(best, weight)
    }
    return best
  }

  return function search(query) {
    const words = tokenize(query)
    if (!words.length) return null
    const scores = new Array(docs.length).fill(0)
    let alive = docs.map((_, i) => i)

    for (const word of words) {
      let hits = new Map()
      for (const i of alive) {
        const s = fieldScore(docs[i], word)
        if (s) hits.set(i, s)
      }
      if (!hits.size && word.length >= 4) {
        // Faute de frappe probable : mots proches du vocabulaire.
        const near = fuzzy
          .search(word, { limit: 8 })
          .map((r) => r.item)
          .filter((n) => Math.abs(n.length - word.length) <= 2 && n[0] === word[0])
        const isAlive = new Set(alive)
        for (const n of near) {
          for (const [i, s] of vocabulary.get(n)) {
            if (isAlive.has(i) && (hits.get(i) || 0) < s / 2) hits.set(i, s / 2)
          }
        }
      }
      alive = alive.filter((i) => hits.has(i))
      for (const i of alive) scores[i] += hits.get(i)
      if (!alive.length) break
    }
    return alive
      .sort((a, b) => scores[b] - scores[a] || metiers[a].intitule.localeCompare(metiers[b].intitule, 'fr'))
      .map((i) => metiers[i])
  }
}
