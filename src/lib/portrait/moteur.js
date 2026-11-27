// Moteur de recherche du portrait professionnel (page « Je trouve ce qui m'anime »).
//
// Principes (brief de refonte, section 10) :
// - chaque dimension garde sa fonction et produit un score de 0 à 1 ; le nombre de critères
//   cochés dans une dimension n'augmente pas son poids (on retient les k meilleures correspondances) ;
// - pondération de départ ajustable (POIDS), recalculée sur les seules dimensions renseignées ;
// - critère souhaitable : améliore la pertinence ; indispensable : écarte un métier seulement
//   si l'incompatibilité est établie ; information absente : « à vérifier », jamais une incompatibilité ;
// - savoir-faire à écarter : vigilance s'il est secondaire, pertinence réduite s'il est central ;
// - savoir-faire à développer : piste d'ouverture (on ne juge pas l'accessibilité) ;
// - aucun pourcentage n'est affiché : le score sert uniquement au classement.
// Sources : bloc officiel_rome (savoir-faire et contextes de travail France Travail) et bloc
// enrichi_ia (étiquettes et conditions). Le moteur n'invente aucune caractéristique.
import { familleOf, taxonomies } from '../taxonomies'
import { normalize } from '../text'
import { isPerso, persoLabel, priorites, savoirLabel } from './model'
import {
  CHOIX,
  CONTRIBUTIONS_BY_ID,
  CURSEURS,
  INTERETS_BY_ID,
  MOTIVATIONS_BY_ID,
  SAVOIRS,
  VERBES,
  VERBES_ROME,
} from './referentiel'
import { detecterVerbes } from './pitch'

/** Pondération interne (hypothèse de conception à tester ; jamais affichée). */
export const POIDS = { aime: 0.3, conditions: 0.25, savoirs: 0.15, sens: 0.12, motivations: 0.1, interets: 0.08 }

/** Nombre maximal de correspondances retenues par dimension (évite la survalorisation). */
const K = { aime: 4, savoirs: 4, interets: 2, sens: 2, motivations: 3 }

/** Part des lignes ROME considérées comme le cœur du métier (savoir-faire listés en premier). */
const PART_CENTRALE = 0.4
/** Au-delà, les lignes ROME sont surtout des savoir-être : non utilisées pour les activités. */
const PART_SAVOIR_FAIRE = 0.65

const PENALITE_ECARTER_CENTRAL = 0.12
const PENALITE_EVITER = 0.1

const STOP = new Set(
  'un une des les le la de du d l a au aux en et ou pour par sur dans avec son sa ses leur leurs selon tout tous toute toutes plusieurs ce cette qui que'.split(' '),
)

// Noms trop génériques pour identifier un savoir-faire à eux seuls.
const GENERIQUES = new Set(['techn', 'metho', 'outil', 'eleme', 'opera', 'actio', 'regle', 'trava', 'besoi', 'perso', 'infor', 'resul'])

const words = (t) => normalize(t).split(/[^a-z0-9]+/).filter(Boolean)
const stem = (w) => w.slice(0, 5)
const DIMENSION_LABEL = {
  aime: 'Activités que vous aimez',
  savoirs: 'Savoir-faire',
  interets: 'Centres d’intérêt',
  sens: 'Contributions',
  motivations: 'Motivations',
  conditions: 'Conditions de travail',
}

// ---------------------------------------------------------------------------
// Index par métier (calculé une fois)
// ---------------------------------------------------------------------------

const indexCache = new WeakMap()

function indexer(m) {
  let ix = indexCache.get(m)
  if (ix) return ix
  const o = m.officiel_rome || {}
  const e = m.enrichi_ia || {}
  const lignes = (o.activites_rome || []).map((texte, i, all) => {
    const w = words(texte)
    return { texte, w, stems: new Set(w.map(stem)), norm: w.join(' '), verbe: w[0], i, centrale: i < Math.ceil(all.length * PART_CENTRALE), savoirFaire: i < Math.ceil(all.length * PART_SAVOIR_FAIRE) }
  })
  const contextes = (o.contextes_travail_rome || []).map((c) => normalize(c.libelle))
  ix = {
    lignes,
    contextes,
    tags: {
      activites: new Set(e.activites || []),
      competences: new Set(e.competences_categories || []),
      interets: new Set(e.centres_interet || []),
      interetsListe: e.centres_interet || [],
      liens: e.liens || null,
      sens: new Set(e.sens_causes || []),
      motivations: new Set(e.motivations || []),
    },
    conditions: e.conditions_travail || {},
    texte: normalize([m.intitule, o.definition, ...(o.appellations || [])].join(' ')),
    famille: familleOf(e.secteurs?.[0]) || 'autre',
    secteurs: e.secteurs || [],
  }
  indexCache.set(m, ix)
  return ix
}

const hasAny = (set, list) => list.some((x) => set.has(x))
/**
 * Force du lien entre une étiquette et un métier selon son rang dans la fiche : les étiquettes sont
 * classées de la plus à la moins caractéristique (la 1re compte plus que la 4e).
 */
const RANG = [1, 0.75, 0.5, 0.35]
/** Crédit d'un lien noté de 1 à 3 par l'IA (enrichi_ia.liens, script « noter-liens »). */
const CREDIT_NOTE = { 3: 1, 2: 0.65, 1: 0.3 }
const creditLien = (notes, taxo) => CREDIT_NOTE[Math.max(0, ...taxo.map((t) => notes?.[t] || 0))] ?? 0
const forceRang = (liste, taxo) => {
  const i = liste.findIndex((x) => taxo.includes(x))
  return i < 0 ? 0 : (RANG[i] ?? RANG[RANG.length - 1])
}
const topK = (vals, k) =>
  vals
    .sort((a, b) => b - a)
    .slice(0, k)
    .reduce((a, b) => a + b, 0) / Math.min(k, vals.length || 1)

// ---------------------------------------------------------------------------
// Préparation du portrait (motifs de recherche des savoir-faire, etc.)
// ---------------------------------------------------------------------------

/** Motif de recherche d'un savoir-faire à partir de son libellé et de ses synonymes. */
function motif(libelle, mots = []) {
  const w = words(libelle).filter((x) => !STOP.has(x))
  const noms = w.slice(1).filter((x) => x.length >= 4).map(stem).filter((x) => !GENERIQUES.has(x))
  const synonymes = mots.filter((x) => !x.includes(' ') && x.length >= 5).map(stem)
  return {
    norm: words(libelle).join(' '),
    verbe: w[0] ? stem(w[0]) : null,
    noms,
    indices: [...new Set([...(w[0] ? [stem(w[0])] : []), ...noms, ...synonymes])],
    expressions: mots.filter((x) => x.includes(' ')).map((x) => words(x).join(' ')),
  }
}

/**
 * Correspondance d'un savoir-faire avec les savoir-faire ROME d'un métier : { force, centrale, ligne }.
 * - 1   : même ligne, ou même verbe d'action et même objet (« Rédiger un compte rendu » ↔ « Rédiger des comptes rendus ») ;
 * - 0.8 : expression synonyme, ou au moins deux mots-clés en commun (« Programmer une application » ↔ « Développer des programmes et applications »).
 */
function matchSavoir(ix, mo, taxo = []) {
  // Les correspondances par mots-clés (0.8) ne valent que si le métier relève de la bonne famille de compétences.
  const familleOk = !taxo.length || hasAny(ix.tags.competences, taxo)
  let best = null
  for (const l of ix.lignes) {
    let force = 0
    if (l.norm === mo.norm) force = 1
    else if (mo.verbe && stem(l.verbe || '') === mo.verbe && mo.noms.some((n) => l.stems.has(n))) force = 1
    else if (familleOk && mo.expressions.some((x) => l.norm.includes(x))) force = 0.8
    else if (familleOk && mo.indices.filter((x) => l.stems.has(x)).length >= 2) force = 0.8
    if (force && (!best || force > best.force || (force === best.force && l.centrale && !best.centrale)))
      best = { force, centrale: l.centrale, ligne: l.texte }
  }
  return best
}

function preparer(p) {
  const verbes = [...new Set(p.aime.flatMap((id) => (isPerso(id) ? detecterVerbes(persoLabel(id)) : [id])))]
  const savoirs = Object.entries(p.savoirs).map(([id, etat]) => {
    const s = SAVOIRS[id]
    const libelle = savoirLabel(p, id)
    return { id, etat, libelle, taxo: s?.taxo || [], motif: motif(libelle, s?.mots || []) }
  })
  const prio = priorites(p)
  return { p, verbes, savoirs, prio }
}

// ---------------------------------------------------------------------------
// Conditions de travail
// ---------------------------------------------------------------------------

const OPTIONS = Object.fromEntries(taxonomies.conditions_travail.criteres.map((c) => [c.id, c.options.map((o) => o.id)]))
const isKnown = (v) => v !== null && v !== undefined && v !== 'variable' && !(Array.isArray(v) && !v.length)

// Contextes officiels ROME utilisés quand l'étiquette enrichie est absente ou variable.
const ROME_CURSEURS = {
  environnement: [{ ctx: 'en exterieur', valeur: 'exterieur' }],
  deplacements: [{ ctx: 'deplacements professionnels', valeur: 'frequents' }],
  teletravail: [{ ctx: 'possibilite de teletravail', valeur: 'partiel' }],
  physique: [{ ctx: 'port et manipulation de charges lourdes', valeur: 'intense' }],
  previsibilite: [{ ctx: 'rythme irregulier', valeur: 'pics' }],
}

/** Évalue un curseur : { credit (0–1), statut: 'ok'|'proche'|'ecart'|'incompatible'|'inconnu', valeur }. */
function evalCurseur(ix, id, pref) {
  const cu = CURSEURS[id]
  const voulu = cu.valeurs[pref.pos - 1]
  let v = ix.conditions[cu.taxo]
  let source = 'enrichi'
  if (!isKnown(v)) {
    const r = (ROME_CURSEURS[id] || []).find((x) => ix.contextes.some((c) => c.includes(x.ctx)))
    if (r) {
      v = r.valeur
      source = 'rome'
    }
  }
  if (!isKnown(v)) return { credit: 0.5, statut: 'inconnu', variable: v === 'variable' }
  const opts = OPTIONS[cu.taxo]
  const vals = Array.isArray(v) ? v : [v]
  const dist = Math.min(...vals.flatMap((x) => voulu.map((y) => Math.abs(opts.indexOf(x) - opts.indexOf(y)))))
  if (dist === 0) return { credit: 1, statut: 'ok', valeur: vals[0], source }
  if (dist === 1) return { credit: 0.4, statut: 'proche', valeur: vals[0], source }
  return { credit: 0, statut: pref.importance === 'indispensable' ? 'incompatible' : 'ecart', valeur: vals[0], source }
}

/** Une option du cadre d'emploi est-elle présente dans le métier ? true / false / null (inconnu). */
function presenceOption(ix, groupe, option) {
  const o = CHOIX[groupe].byId[option]
  if (o.rome && ix.contextes.some((c) => o.rome.some((r) => c.startsWith(normalize(r))))) return true
  if (!o.taxo) return null
  const [critere, vals] = o.taxo
  const v = ix.conditions[critere]
  if (!isKnown(v)) return null
  const list = Array.isArray(v) ? v : [v]
  // nuit_weekend regroupe nuit et week-end : sans contexte ROME, on ne peut pas trancher.
  if (critere === 'horaires' && list.includes('nuit_weekend') && (option === 'nuit' || option === 'weekend')) return null
  return list.some((x) => vals.includes(x))
}

const LIBELLES = Object.fromEntries(
  taxonomies.conditions_travail.criteres.map((c) => [c.id, Object.fromEntries(c.options.map((o) => [o.id, o.libelle]))]),
)
/** Libellé d'une valeur de condition, propre à son critère (« important » n'a pas le même sens partout). */
const optionLabel = (critere, o) => LIBELLES[critere]?.[o] || o

// ---------------------------------------------------------------------------
// Évaluation d'un métier
// ---------------------------------------------------------------------------

/**
 * Évalue un métier. Renvoie :
 * { score (interne), dims: { id: score }, raisons: [{ dimension, items }], aVerifier: [texte],
 *   vigilance: [texte], incompatibilites: [texte], exclu, couverture (dimensions en correspondance),
 *   activites (score de la dimension 1, pour les découvertes) }
 */
export function evaluer(metier, prep) {
  const ix = indexer(metier)
  const { p } = prep
  const dims = {}
  const raisons = []
  const aVerifier = []
  const vigilance = []
  const incompatibilites = []
  let penalite = 0
  const raison = (dimension, items) => items.length && raisons.push({ dimension, items })

  // 1. Activités appréciées : étiquette d'activité du métier, ou savoir-faire ROME commençant par un verbe proche.
  if (prep.verbes.length) {
    const credits = []
    const items = []
    for (const id of prep.verbes) {
      const v = VERBES[id]
      let c = hasAny(ix.tags.activites, v.taxo) ? 1 : 0
      const romeVerbes = VERBES_ROME[id] || []
      const lignes = ix.lignes.filter((l) => l.savoirFaire && romeVerbes.some((rv) => (rv.includes(' ') ? l.norm.startsWith(rv) : l.verbe === rv)))
      if (!c && lignes.length) c = lignes.length >= 2 ? 0.8 : 0.5
      credits.push(c)
      if (c) items.push(lignes.length ? `${v.libelle} (ex. : ${lignes[0].texte.charAt(0).toLowerCase() + lignes[0].texte.slice(1)})` : v.libelle)
    }
    dims.aime = topK(credits, K.aime)
    raison(DIMENSION_LABEL.aime, items)
  }

  // 2. Savoir-faire : à mobiliser / à développer (positifs), à écarter (vigilance ou pénalité).
  const positifs = prep.savoirs.filter((s) => s.etat !== 'ecarter')
  if (positifs.length) {
    const credits = []
    const mob = []
    const dev = []
    for (const s of positifs) {
      const m = matchSavoir(ix, s.motif, s.taxo)
      const c = m ? m.force : hasAny(ix.tags.competences, s.taxo) ? 0.25 : 0
      credits.push(c)
      if (m) (s.etat === 'mobiliser' ? mob : dev).push(s.libelle)
    }
    dims.savoirs = topK(credits, K.savoirs)
    raison('Savoir-faire que vous souhaitez mobiliser', mob)
    raison('Savoir-faire que vous pourriez développer ici', dev)
  }
  for (const s of prep.savoirs.filter((x) => x.etat === 'ecarter')) {
    const m = matchSavoir(ix, s.motif, s.taxo)
    if (!m) continue
    if (m.centrale && m.force === 1) {
      penalite += PENALITE_ECARTER_CENTRAL
      vigilance.push(`« ${s.libelle} » est au cœur de ce métier, alors que vous ne souhaitez plus le mobiliser.`)
    } else vigilance.push(`Ce métier peut demander ponctuellement « ${s.libelle} », que vous ne souhaitez plus mobiliser.`)
  }

  // 3. Centres d'intérêt : favorisent un univers, n'excluent jamais.
  if (p.interets.length) {
    const credits = []
    const items = []
    for (const id of p.interets) {
      let c = 0
      if (isPerso(id)) {
        const w = words(persoLabel(id)).filter((x) => x.length >= 4)
        c = w.length && w.every((x) => ix.texte.includes(stem(x))) ? 0.7 : 0
      } else if (ix.tags.liens) c = creditLien(ix.tags.liens.interets, INTERETS_BY_ID[id]?.taxo || [])
      else c = forceRang(ix.tags.interetsListe, INTERETS_BY_ID[id]?.taxo || [])
      credits.push(c)
      if (c) items.push(isPerso(id) ? persoLabel(id) : INTERETS_BY_ID[id].libelle)
    }
    dims.interets = topK(credits, K.interets)
    raison(DIMENSION_LABEL.interets, items)
  }

  // 4. Contributions : finalité du métier ; sinon, finalité possible selon l'employeur (métier transversal).
  if (p.sens.length) {
    const credits = []
    const items = []
    const selonStructure = []
    const liensSens = ix.tags.liens?.sens
    const transversal = ix.secteurs.length >= 3 && !(liensSens ? Object.keys(liensSens).length : ix.tags.sens.size)
    for (const id of p.sens) {
      const c = CONTRIBUTIONS_BY_ID[id]
      const credit = liensSens ? creditLien(liensSens, c.taxo) : hasAny(ix.tags.sens, c.taxo) ? 1 : 0
      if (credit) {
        credits.push(credit)
        items.push(c.libelle.replace(/\.$/, ''))
      } else if (transversal) {
        credits.push(0.3)
        selonStructure.push(c.libelle.replace(/\.$/, '').toLowerCase())
      } else credits.push(0)
    }
    dims.sens = topK(credits, K.sens)
    raison(DIMENSION_LABEL.sens, items)
    if (selonStructure.length)
      aVerifier.push(`Ce métier peut contribuer à « ${selonStructure.join(' », « ')} » selon la structure qui l’emploie (association, entreprise, institution…).`)
  }

  // 5. Motivations : les prioritaires comptent double ; celles qui dépendent de l'employeur sont « à approfondir ».
  if (p.motivations.length) {
    let gagne = 0
    let max = 0
    const items = []
    const contexte = []
    for (const id of p.motivations) {
      const mo = MOTIVATIONS_BY_ID[id]
      if (!mo) continue
      if (mo.contexte) {
        contexte.push(mo.libelle.toLowerCase())
        continue
      }
      const w = prep.prio.includes(id) ? 2 : 1
      max += w
      const credit = ix.tags.liens ? creditLien(ix.tags.liens.motivations, mo.taxo) : hasAny(ix.tags.motivations, mo.taxo) ? 1 : 0
      if (credit) {
        gagne += w * credit
        items.push(prep.prio.includes(id) ? `${mo.libelle} (prioritaire)` : mo.libelle)
      }
    }
    if (max) dims.motivations = Math.min(1, gagne / Math.min(max, K.motivations + prep.prio.length))
    raison(DIMENSION_LABEL.motivations, items)
    if (contexte.length)
      aVerifier.push(`${contexte.join(', ').replace(/^./, (c) => c.toUpperCase())} : dépend surtout de l’employeur et du contrat, à approfondir lors de votre enquête métier.`)
  }

  // 6. Conditions de travail.
  let gagne = 0
  let max = 0
  const condOk = []
  for (const [id, pref] of Object.entries(p.curseurs)) {
    const cu = CURSEURS[id]
    const w = pref.importance === 'indispensable' ? 2 : 1
    const r = evalCurseur(ix, id, pref)
    max += w
    gagne += w * r.credit
    if (r.statut === 'ok') condOk.push(`${cu.libelle} : ${optionLabel(cu.taxo, r.valeur).toLowerCase()}`)
    else if (r.statut === 'inconnu')
      aVerifier.push(
        `${cu.libelle} : ${r.variable ? 'variable selon l’employeur ou le poste' : 'information non disponible'}${pref.importance === 'indispensable' ? ' (condition indispensable à vérifier)' : ', à vérifier'}.`,
      )
    else if (r.statut === 'proche') aVerifier.push(`${cu.libelle} : plutôt « ${optionLabel(cu.taxo, r.valeur).toLowerCase()} », proche de votre souhait.`)
    else if (r.statut === 'ecart') aVerifier.push(`${cu.libelle} : plutôt « ${optionLabel(cu.taxo, r.valeur).toLowerCase()} », éloigné de votre souhait.`)
    else incompatibilites.push(`${cu.libelle} : plutôt « ${optionLabel(cu.taxo, r.valeur).toLowerCase()} », alors que c’est indispensable pour vous : « ${cu.phrases[pref.pos - 1]} »`)
  }
  for (const [g, pref] of Object.entries(p.choix)) {
    const groupe = CHOIX[g]
    const oui = Object.entries(pref.valeurs).filter(([, e]) => e === 'oui').map(([o]) => o)
    const eviter = Object.entries(pref.valeurs).filter(([, e]) => e === 'eviter').map(([o]) => o)
    if (oui.length) {
      const w = pref.importance === 'indispensable' ? 2 : 1
      const pres = oui.map((o) => presenceOption(ix, g, o))
      max += w
      const libelles = oui.map((o) => groupe.byId[o].libelle.toLowerCase())
      if (pres.includes(true)) {
        gagne += w
        condOk.push(`${groupe.libelle} : ${oui.filter((_, i) => pres[i]).map((o) => groupe.byId[o].libelle.toLowerCase()).join(', ')}`)
      } else if (pres.includes(null)) {
        gagne += w * 0.5
        aVerifier.push(`${groupe.libelle} (${libelles.join(', ')}) : à vérifier auprès d’un professionnel ou d’un employeur${pref.importance === 'indispensable' ? ' (condition indispensable)' : ''}.`)
      } else if (pref.importance === 'indispensable') incompatibilites.push(`${groupe.libelle} : ${libelles.join(', ')} indispensable, peu courant dans ce métier.`)
      else aVerifier.push(`${groupe.libelle} : ${libelles.join(', ')} peu courant dans ce métier.`)
    }
    for (const o of eviter) {
      const pres = presenceOption(ix, g, o)
      const lib = groupe.byId[o].libelle
      if (pres === true) {
        penalite += PENALITE_EVITER
        vigilance.push(`${lib} : fréquent dans ce métier, alors que vous souhaitez l’éviter.`)
      } else if (pres === null && groupe.byId[o].rome)
        aVerifier.push(`${lib} : vous souhaitez l’éviter, à vérifier selon l’employeur.`)
    }
  }
  if (max) dims.conditions = gagne / max
  raison(DIMENSION_LABEL.conditions, condOk)

  // Score : moyenne pondérée des dimensions renseignées (poids recalculés), moins les pénalités.
  let somme = 0
  let poids = 0
  for (const [d, s] of Object.entries(dims)) {
    somme += POIDS[d] * s
    poids += POIDS[d]
  }
  const score = poids ? Math.max(0, somme / poids - penalite) : 0
  const couverture = Object.values(dims).filter((s) => s >= 0.5).length
  return {
    score,
    dims,
    raisons,
    aVerifier,
    vigilance,
    incompatibilites,
    exclu: incompatibilites.length > 0,
    couverture,
    nbDimensions: Object.keys(dims).length,
    famille: ix.famille,
  }
}

// ---------------------------------------------------------------------------
// Classement et présentation en trois groupes
// ---------------------------------------------------------------------------

export const SEUIL_PERTINENT = 0.55
export const SEUIL_EXPLORER = 0.35

/**
 * Étoiles affichées (1 à 5) : traduction du score interne, jamais de pourcentage.
 * Une condition indispensable non respectée plafonne à 2 étoiles ; une vigilance à 4.
 */
export function etoiles(r) {
  let n = r.score >= 0.85 ? 5 : r.score >= 0.7 ? 4 : r.score >= SEUIL_PERTINENT ? 3 : r.score >= SEUIL_EXPLORER ? 2 : 1
  if (r.incompatibilites?.length) n = Math.min(n, 2)
  else if (r.vigilance?.length) n = Math.min(n, 4)
  return n
}
const TAILLE_PERTINENTES = 12
const MAX_PAR_FAMILLE = 3
const TAILLE_DECOUVERTES = 6

/**
 * Évalue et classe tous les métiers.
 * Options : { elargi: inclure les métiers ne respectant pas une condition indispensable }.
 * Renvoie { tous, pertinentes, aExplorer, decouvertes, exclus } (listes de { metier, ...évaluation }).
 */
export function rechercher(metiers, portrait, { elargi = false } = {}) {
  const prep = preparer(portrait)
  const evals = []
  let exclus = 0
  for (const metier of metiers) {
    const ev = evaluer(metier, prep)
    if (ev.exclu && !elargi) {
      exclus++
      continue
    }
    if (!ev.raisons.length || ev.score < 0.2) continue
    evals.push({ metier, ...ev })
  }
  // À score égal : plus de dimensions en correspondance, puis métiers qui recrutent (indice France Travail).
  const tension = (m) => m.marche_emploi?.indice_tension ?? 0
  evals.sort(
    (a, b) =>
      b.score - a.score || b.couverture - a.couverture || tension(b.metier) - tension(a.metier) || a.metier.intitule.localeCompare(b.metier.intitule, 'fr'),
  )

  // Plusieurs dimensions renseignées : une piste « pertinente » doit correspondre sur au moins deux d'entre elles.
  const couvertureMin = (r) => Math.min(2, r.nbDimensions)
  const candidates = evals.filter((r) => r.score >= SEUIL_PERTINENT && r.couverture >= couvertureMin(r) && !r.exclu)

  // Diversité : au plus MAX_PAR_FAMILLE métiers d'une même famille d'univers parmi les plus pertinents.
  const parFamille = {}
  const pertinentes = []
  const reportees = []
  for (const r of candidates) {
    if (pertinentes.length >= TAILLE_PERTINENTES) {
      reportees.push(r)
      continue
    }
    if ((parFamille[r.famille] || 0) >= MAX_PAR_FAMILLE) {
      reportees.push(r)
      continue
    }
    parFamille[r.famille] = (parFamille[r.famille] || 0) + 1
    pertinentes.push(r)
  }
  const dejaVus = new Set(pertinentes.map((r) => r.metier.code_rome))

  // Découvertes inattendues : autres familles, avec des activités ou savoir-faire en commun.
  const famillesTop = new Set(pertinentes.map((r) => r.famille))
  const decouvertes = []
  const famillesDec = new Set()
  for (const r of evals) {
    if (decouvertes.length >= TAILLE_DECOUVERTES) break
    if (dejaVus.has(r.metier.code_rome) || famillesTop.has(r.famille) || famillesDec.has(r.famille)) continue
    const lienActivite = (r.dims.aime ?? 0) >= 0.5 || (r.dims.savoirs ?? 0) >= 0.5 || (r.dims.interets ?? 0) >= 0.5
    if (!lienActivite || r.score < SEUIL_EXPLORER) continue
    famillesDec.add(r.famille)
    decouvertes.push(r)
    dejaVus.add(r.metier.code_rome)
  }

  // Pistes à explorer : correspondances intéressantes qui demandent des vérifications.
  const aExplorer = [...reportees, ...evals.filter((r) => r.score >= SEUIL_EXPLORER && !candidates.includes(r))]
    .filter((r) => !dejaVus.has(r.metier.code_rome))
    .sort((a, b) => b.score - a.score)

  return { tous: evals, pertinentes, aExplorer, decouvertes, exclus }
}
