// Traduction provisoire du portrait vers les critères du moteur actuel (lib/matching.js).
// Étape 1 de la refonte : l'interface change, le moteur reste celui de la V1.
// L'étape 2 remplacera cette traduction par un moteur dédié aux six dimensions.
import { EMPTY_CRITERIA } from '../matching'
import { isPerso, persoLabel, priorites } from './model'
import { CHOIX, CONTRIBUTIONS_BY_ID, CURSEURS, INTERETS_BY_ID, MOTIVATIONS_BY_ID, SAVOIRS, VERBES } from './referentiel'
import { detecterVerbes } from './pitch'

const union = (lists) => [...new Set(lists.flat())]

export function portraitToCriteria(p) {
  const c = structuredClone(EMPTY_CRITERIA)

  const verbes = p.aime.flatMap((id) => (isPerso(id) ? detecterVerbes(persoLabel(id)) : [id]))
  c.activites = union(verbes.map((id) => VERBES[id]?.taxo || []))

  // Savoir-faire → catégories de compétences : la majorité des états l'emporte, le positif en cas d'égalité.
  const votes = {}
  for (const [id, etat] of Object.entries(p.savoirs)) {
    for (const cat of SAVOIRS[id]?.taxo || []) {
      votes[cat] ||= { mobiliser: 0, developper: 0, ecarter: 0 }
      votes[cat][etat]++
    }
  }
  for (const [cat, v] of Object.entries(votes)) {
    if (v.mobiliser + v.developper >= v.ecarter) c.competences[cat] = v.mobiliser >= v.developper ? 'utiliser' : 'developper'
    else c.competences[cat] = 'ne_plus'
  }

  c.centres_interet = union(p.interets.map((id) => INTERETS_BY_ID[id]?.taxo || []))
  c.sens_causes = union(p.sens.map((id) => CONTRIBUTIONS_BY_ID[id]?.taxo || []))
  // Les motivations prioritaires passent en premier (le moteur V1 ne pondère pas encore l'ordre).
  const prio = priorites(p)
  c.motivations = union([...prio, ...p.motivations.filter((m) => !prio.includes(m))].map((id) => MOTIVATIONS_BY_ID[id]?.taxo || []))

  for (const [id, { pos, importance }] of Object.entries(p.curseurs)) {
    const cu = CURSEURS[id]
    const valeurs = cu.valeurs[pos - 1]
    const prev = c.conditions[cu.taxo]
    // Deux curseurs sur le même critère (prévisibilité et intensité) : on garde les valeurs communes.
    const merged = prev ? prev.valeurs.filter((x) => valeurs.includes(x)) : valeurs
    c.conditions[cu.taxo] = {
      valeurs: merged.length ? merged : valeurs,
      importance: importance === 'indispensable' || prev?.importance === 'indispensable' ? 'indispensable' : 'souhaitable',
    }
  }

  for (const [g, { valeurs, importance }] of Object.entries(p.choix)) {
    const groupe = CHOIX[g]
    const parCritere = {}
    for (const [o, etat] of Object.entries(valeurs)) {
      const taxo = groupe.byId[o]?.taxo
      if (!taxo) continue
      const [critere, vals] = taxo
      parCritere[critere] ||= { oui: [], eviter: [] }
      parCritere[critere][etat].push(...vals)
    }
    for (const [critere, { oui, eviter }] of Object.entries(parCritere)) {
      if (c.conditions[critere]) continue
      if (oui.length) c.conditions[critere] = { valeurs: [...new Set(oui)], importance }
      else if (eviter.length) c.conditions[critere] = { valeurs: [...new Set(eviter)], importance: 'eviter' }
    }
  }
  return c
}
