// Tests 1 à 8 du brief de refonte, sur la vraie base métiers (public/data/metiers.json).
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { EMPTY_PORTRAIT } from './model'
import { evaluer, rechercher } from './moteur'
import { analyseLocale } from './pitch'

const metiers = JSON.parse(readFileSync('public/data/metiers.json', 'utf8')).metiers
const portrait = (p) => ({ ...EMPTY_PORTRAIT, ...p })
const top = (r) => [...r.pertinentes, ...r.decouvertes]
const texte = (r) => [...r.aVerifier, ...r.vigilance, ...r.incompatibilites].join(' ')

describe('moteur du portrait : tests du brief', () => {
  it('Test 1 — activités seules : plusieurs univers, pas seulement le bâtiment', () => {
    const r = rechercher(metiers, portrait({ aime: ['concevoir', 'organiser', 'negocier', 'fabriquer'] }))
    const familles = new Set(top(r).map((x) => x.famille))
    expect(familles.size).toBeGreaterThanOrEqual(4)
    const btp = top(r).filter((x) => /batiment|construction/i.test(x.metier.officiel_rome.domaine_professionnel?.grand_domaine || ''))
    expect(btp.length).toBeLessThan(top(r).length / 2)
  })

  it('Test 2 — compétence à écarter : pas d’exclusion automatique des métiers qui l’utilisent occasionnellement', () => {
    const base = rechercher(metiers, portrait({ aime: ['organiser'] }))
    const avec = rechercher(metiers, portrait({ aime: ['organiser'], savoirs: { rediger_un_compte_rendu: 'ecarter' } }))
    expect(avec.tous.length).toBe(base.tous.length)
    const ponctuels = avec.tous.filter((x) => x.vigilance.some((v) => v.includes('ponctuellement')))
    expect(ponctuels.length).toBeGreaterThan(0)
    // Usage secondaire : simple point de vigilance, le score ne baisse pas.
    const ref = Object.fromEntries(base.tous.map((x) => [x.metier.code_rome, x.score]))
    for (const x of ponctuels) expect(x.score).toBeCloseTo(ref[x.metier.code_rome])
  })

  it('Test 3 — reconversion : une compétence à développer seule fait émerger des métiers', () => {
    const r = rechercher(metiers, portrait({ savoirs: { programmer_une_application: 'developper' } }))
    expect(r.tous.length).toBeGreaterThan(5)
    expect(r.tous[0].raisons.some((x) => x.dimension.includes('développer'))).toBe(true)
  })

  it('Test 4 — conditions de travail : correspondances expliquées et conditions à confirmer', () => {
    const r = rechercher(
      metiers,
      portrait({
        curseurs: {
          lieu: { pos: 5, importance: 'souhaitable' },
          ecrans: { pos: 1, importance: 'souhaitable' },
          deplacements: { pos: 4, importance: 'souhaitable' },
        },
      }),
    )
    expect(r.pertinentes.length).toBeGreaterThan(0)
    for (const x of r.pertinentes) expect(x.raisons.some((y) => y.dimension === 'Conditions de travail')).toBe(true)
    expect(r.tous.some((x) => x.aVerifier.length > 0)).toBe(true)
  })

  it('Test 5 — pitch libre : critères répartis entre les dimensions et exploitables', () => {
    const pr = analyseLocale(
      'Je voudrais aider les gens et les accompagner, travailler en équipe et dehors, dans une association. Je ne veux pas travailler la nuit. La nature et les animaux me passionnent.',
    )
    expect(pr.aime).toEqual(expect.arrayContaining(['aider', 'accompagner']))
    expect(pr.interets).toEqual(expect.arrayContaining(['nature_et_environnement', 'animaux_et_monde_vivant']))
    expect(pr.curseurs.collectif.pos).toBe(4)
    expect(pr.curseurs.environnement.pos).toBe(5)
    expect(pr.choix.horaires.valeurs.nuit).toBe('eviter')
    expect(pr.choix.structure.valeurs.association).toBe('oui')
    const r = rechercher(metiers, portrait({ aime: pr.aime, interets: pr.interets, curseurs: pr.curseurs, choix: pr.choix }))
    expect(r.pertinentes.length).toBeGreaterThan(0)
  })

  it('Test 6 — recherche partielle : une seule dimension ne pénalise pas les résultats', () => {
    const r = rechercher(metiers, portrait({ interets: ['cuisine_et_gastronomie'] }))
    expect(r.pertinentes.length).toBeGreaterThan(0)
    expect(r.tous[0].score).toBe(1)
  })

  it('Test 7 — données manquantes : « à vérifier », jamais une incompatibilité inventée', () => {
    const m = structuredClone(metiers[0])
    m.enrichi_ia.conditions_travail = { ...m.enrichi_ia.conditions_travail, teletravail: null, horaires: 'variable' }
    m.officiel_rome.contextes_travail_rome = []
    const ev = evaluer(m, {
      p: portrait({
        curseurs: { teletravail: { pos: 5, importance: 'indispensable' } },
        choix: { horaires: { valeurs: { reguliers: 'oui' }, importance: 'indispensable' } },
      }),
      verbes: [],
      savoirs: [],
      prio: [],
    })
    expect(ev.exclu).toBe(false)
    expect(texte(ev)).toContain('information non disponible')
    expect(texte(ev)).toContain('indispensable')
  })

  it('Test 8 — redondance : « Communiquer » + savoir-faire de communication ne survalorisent pas la communication', () => {
    const r = rechercher(
      metiers,
      portrait({
        aime: ['communiquer', 'reparer'],
        savoirs: {
          rediger_un_article_ou_une_newsletter: 'mobiliser',
          prendre_la_parole_devant_un_public: 'mobiliser',
          animer_une_reunion: 'mobiliser',
          creer_un_support_de_communication: 'mobiliser',
        },
        interets: ['mecanique_et_transports'],
      }),
    )
    const t = r.pertinentes
    const communication = t.filter((x) => /communication|journalis|relations publiques|presse/i.test(x.metier.intitule))
    expect(communication.length).toBeLessThan(t.length / 2)
    // Les autres aspirations (réparer, mécanique) restent représentées en tête.
    expect(t.some((x) => x.raisons.some((y) => y.items.join(' ').includes('Réparer') || y.dimension === 'Centres d’intérêt'))).toBe(true)
  })

  it('Indispensable clairement incompatible : écarté, sauf en mode élargi', () => {
    const p = portrait({ aime: ['organiser'], curseurs: { teletravail: { pos: 5, importance: 'indispensable' } } })
    const strict = rechercher(metiers, p)
    const large = rechercher(metiers, p, { elargi: true })
    expect(strict.exclus).toBeGreaterThan(0)
    expect(large.tous.length).toBeGreaterThan(strict.tous.length)
    expect(strict.tous.every((x) => !x.exclu)).toBe(true)
  })
})

describe('étoiles', () => {
  it('1 à 5 étoiles, plafonnées en cas d’incompatibilité', async () => {
    const { etoiles } = await import('./moteur')
    const r = rechercher(metiers, portrait({ aime: ['concevoir', 'organiser'] }), { elargi: true })
    const n = r.tous.map(etoiles)
    expect(Math.min(...n)).toBeGreaterThanOrEqual(1)
    expect(Math.max(...n)).toBeLessThanOrEqual(5)
    expect(new Set(r.pertinentes.map(etoiles)).size).toBeGreaterThan(0)
    expect(etoiles({ score: 0.95, incompatibilites: ['x'], vigilance: [] })).toBe(2)
    expect(etoiles({ score: 0.95, incompatibilites: [], vigilance: [] })).toBe(5)
  })
})

describe('centres d’intérêt : lien pondéré par le rang de l’étiquette', () => {
  it('« Psychologie et relations humaines » ne remonte pas une station de lavage', () => {
    const r = rechercher(metiers, portrait({ interets: ['psychologie_et_relations_humaines'] }))
    const lavage = r.tous.find((x) => /station de lavage/i.test(x.metier.intitule))
    // Absent de la liste (aucun lien noté) ou, au pire, jamais parmi les pistes pertinentes.
    expect(lavage ? r.pertinentes.includes(lavage) : false).toBe(false)
    const psy = r.tous.filter((x) => /psycholog/i.test(x.metier.intitule))
    expect(psy.length).toBeGreaterThan(0)
    expect(Math.min(...psy.map((x) => x.score))).toBeGreaterThanOrEqual(0.75)
  })
})

describe('liens notés par l’IA (enrichi_ia.liens)', () => {
  it('une note 1 pèse moins qu’une note 3 ; les métiers non notés gardent le repli par rang', () => {
    const psy = metiers.find((m) => /psycholog/i.test(m.intitule))
    const lavage = metiers.find((m) => /station de lavage/i.test(m.intitule))
    const notes = (n) => ({ interets: { psychologie_et_relations_humaines: n }, sens: {}, motivations: {} })
    const avec = (m, n) => ({ ...m, enrichi_ia: { ...m.enrichi_ia, liens: notes(n) } })
    const r = rechercher([avec(psy, 3), avec(lavage, 1)], portrait({ interets: ['psychologie_et_relations_humaines'] }), { elargi: true })
    const s = (m) => r.tous.find((x) => x.metier.code_rome === m.code_rome).score
    expect(s(psy)).toBe(1)
    expect(s(lavage)).toBeCloseTo(0.3)
    const sansLiens = { ...lavage, enrichi_ia: { ...lavage.enrichi_ia, liens: undefined } }
    const sans = rechercher([sansLiens], portrait({ interets: ['psychologie_et_relations_humaines'] }), { elargi: true })
    expect(sans.tous[0].score).toBeCloseTo(0.5)
  })
})
