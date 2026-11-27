import { describe, expect, it } from 'vitest'
import taxonomies from '../../../data/taxonomies.json'
import { analyseLocale } from './pitch'
import { AIME_FAMILLES, CHOIX_GROUPES, CONTRIBUTIONS, CURSEUR_GROUPES, INTERETS, MOTIVATIONS, SAVOIR_FAMILLES } from './referentiel'

describe('référentiel', () => {
  it('ne renvoie que vers des étiquettes existantes de taxonomies.json', () => {
    const act = new Set(taxonomies.activites.categories.flatMap((c) => c.activites.map((a) => a.id)))
    const comp = new Set(taxonomies.competences_categories.map((c) => c.id))
    const ci = new Set(taxonomies.centres_interet.map((c) => c.id))
    const sens = new Set(taxonomies.sens_causes.map((c) => c.id))
    const mot = new Set(taxonomies.motivations.map((c) => c.id))
    const crit = Object.fromEntries(taxonomies.conditions_travail.criteres.map((c) => [c.id, new Set(c.options.map((o) => o.id))]))
    for (const f of AIME_FAMILLES) for (const v of f.verbes) for (const t of v.taxo) expect(act.has(t), `${v.id} → ${t}`).toBe(true)
    for (const f of SAVOIR_FAMILLES) for (const s of f.savoirs) for (const t of s.taxo) expect(comp.has(t), `${s.id} → ${t}`).toBe(true)
    for (const x of INTERETS) for (const t of x.taxo) expect(ci.has(t), `${x.id} → ${t}`).toBe(true)
    for (const x of CONTRIBUTIONS) for (const t of x.taxo) expect(sens.has(t), `${x.id} → ${t}`).toBe(true)
    for (const x of MOTIVATIONS) for (const t of x.taxo) expect(mot.has(t), `${x.id} → ${t}`).toBe(true)
    for (const g of CURSEUR_GROUPES)
      for (const c of g.curseurs) {
        expect(crit[c.taxo], c.id).toBeTruthy()
        expect(c.valeurs).toHaveLength(5)
        expect(c.phrases).toHaveLength(5)
        for (const vals of c.valeurs) for (const v of vals) expect(crit[c.taxo].has(v), `${c.id} → ${v}`).toBe(true)
      }
    for (const g of CHOIX_GROUPES)
      for (const o of g.options) if (o.taxo) for (const v of o.taxo[1]) expect(crit[o.taxo[0]].has(v), `${g.id}.${o.id} → ${v}`).toBe(true)
  })

  it('a des identifiants uniques', () => {
    const ids = SAVOIR_FAMILLES.flatMap((f) => f.savoirs.map((s) => s.id))
    expect(new Set(ids).size).toBe(ids.length)
    const verbes = AIME_FAMILLES.flatMap((f) => f.verbes.map((s) => s.id))
    expect(new Set(verbes).size).toBe(verbes.length)
  })
})

describe('analyse locale du pitch', () => {
  it('extrait les critères de l’exemple du brief', () => {
    const r = analyseLocale(
      'J’aimerais concevoir des projets, organiser les différentes étapes, négocier avec des fournisseurs, fabriquer des choses et garder une dimension concrète. Je ne veux pas passer toutes mes journées devant un ordinateur.',
    )
    expect(r.aime).toEqual(expect.arrayContaining(['concevoir', 'organiser', 'negocier', 'fabriquer']))
    expect(r.savoirs).toEqual(expect.arrayContaining(['construire_un_planning', 'rechercher_des_fournisseurs']))
    expect(r.curseurs.manuel.pos).toBeGreaterThanOrEqual(4)
    expect(r.curseurs.ecrans.pos).toBeLessThanOrEqual(2)
    console.log(JSON.stringify(r))
  })

  it('gère les négations', () => {
    const r = analyseLocale('Je ne veux pas travailler la nuit ni le week-end, et je veux être dehors.')
    expect(r.choix.horaires.valeurs.nuit).toBe('eviter')
    expect(r.curseurs.environnement.pos).toBe(5)
  })
})
