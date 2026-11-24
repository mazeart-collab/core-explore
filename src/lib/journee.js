// Texte « Au fil de la journée », construit uniquement à partir de la fiche ROME (sans IA).
import { clean } from './text'

// Première lettre en minuscule, sauf sigles (« UX », « QHSSE »…).
// Le ROME omet souvent l'accent des majuscules initiales (« Etablissement », « Evaluer ») : on le rétablit.
export const lowerFirst = (s) =>
  s.length > 1 && s[1] === s[1].toLowerCase()
    ? (s[0].toLowerCase() + s.slice(1)).replace(/^e(tabl|valu|labor|tud|cout|duqu|quip|lectr|mettre|crire|change|largi|limin)/, 'é$1')
    : s
const de = (s) => (/^[aeiouyhâàéèêîôûœ]/i.test(s) ? `d’${s}` : `de ${s}`)
const listFr = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items.at(-1)}`)

const SOFT_SKILL = /^(faire preuve|avoir l|respecter|être |savoir |travailler en équipe)/i

/** Texte court « Au fil de la journée ». */
export function buildJournee(o) {
  const activites = (o.activites_rome || [])
    .map(clean)
    .filter((a) => a && !SOFT_SKILL.test(a))
    .slice(0, 4)
    .map((a) => de(lowerFirst(a.replace(/\.$/, ''))))
  const sentences = []
  if (activites.length) sentences.push(`Au fil de la journée, il s’agit par exemple ${listFr(activites)}.`)

  const ctx = o.contextes_travail_rome || []
  const pick = (type, n) =>
    ctx
      .filter((c) => c.type === type)
      .slice(0, n)
      .map((c) => lowerFirst(clean(c.libelle).split(' : ')[0].replace(/\s*\(.*?\)/g, '')))
  const structures = pick('Types de structures', 3)
  const conditions = [...pick('Horaires et durée du travail', 2), ...pick('Conditions de travail et risques professionnels', 2)]
  if (structures.length) sentences.push(`Le métier s’exerce notamment en ${listFr(structures)}.`.replace(' en en ', ' en '))
  if (conditions.length) sentences.push(`À prévoir : ${listFr(conditions)}.`)
  return sentences.join(' ')
}
