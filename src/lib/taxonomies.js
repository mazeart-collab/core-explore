// Référentiels du projet, chargés une fois et indexés par identifiant.
import taxonomies from '../../data/taxonomies.json'

export { taxonomies }

const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]))

export const FAMILLES = taxonomies.univers_professionnels.familles
export const UNIVERS = byId(taxonomies.univers_professionnels.univers)
export const ACTIVITE_CATEGORIES = taxonomies.activites.categories
export const ACTIVITES = Object.fromEntries(
  ACTIVITE_CATEGORIES.flatMap((c) => c.activites.map((a) => [a.id, { ...a, categorie: c.id }])),
)
export const COMPETENCES = byId(taxonomies.competences_categories)
export const CENTRES_INTERET = byId(taxonomies.centres_interet)
export const SENS = byId(taxonomies.sens_causes)
export const MOTIVATIONS = byId(taxonomies.motivations)
export const CRITERES = taxonomies.conditions_travail.criteres
export const CRITERES_BY_ID = byId(CRITERES)

export const label = (map, id) => map[id]?.libelle ?? id

/** Libellé d'une valeur de condition de travail (gère « variable » et les listes). */
export function conditionLabel(critereId, value) {
  if (value === null || value === undefined) return null
  if (value === 'variable') return "Variable selon l'employeur ou le poste"
  const c = CRITERES_BY_ID[critereId]
  const opt = (id) => c?.options.find((o) => o.id === id)?.libelle ?? id
  return Array.isArray(value) ? value.map(opt).join(', ') : opt(value)
}

/** Famille d'un univers. */
export const familleOf = (universId) => UNIVERS[universId]?.famille
