// Analyse du pitch libre, sans service externe : extraction par mots-clés, synonymes et négations.
//
// Architecture : `analyserPitch(texte, { fournisseur })` accepte un fournisseur d'analyse.
// Le fournisseur local (`analyseLocale`) est utilisé par défaut ; un fournisseur IA pourra être
// branché plus tard avec la même signature. Il devra seulement renvoyer des identifiants du
// référentiel : il structure la demande, il n'invente ni métier ni caractéristique de métier.
//
// Règle : on ne déduit jamais qu'une personne maîtrise un savoir-faire parce qu'elle aime
// l'activité correspondante. Les savoir-faire détectés sont « à confirmer », sans état.
import { normalize } from '../text'
import { AIME_FAMILLES, CONTRIBUTIONS, INTERETS, MOTIVATIONS, SAVOIR_FAMILLES } from './referentiel'

const NEGATIONS = new Set(['pas', 'ne', 'n', 'jamais', 'eviter', 'sans', 'plus', 'aucun', 'aucune', 'refuse', 'deteste', 'fuir', 'marre'])
const ATTENUATIONS = new Set(['moins', 'peu', 'limiter', 'limite', 'reduire', 'trop'])
// Mots trop ambigus pour être reconnus seuls dans un texte libre.
const AMBIGUS = new Set(['mode', 'art', 'ia', 'cr', 'jeu', 'plan', 'plans', 'lien', 'outil', 'outils', 'besoins', 'resultats', 'objectifs', 'evaluer', 'site', 'code', 'demo', 'trace', 'tracer', 'monter', 'lettre', 'tableau', 'reseau', 'contenu', 'objet', 'produit', 'espace', 'interieur', 'protection', 'controles', 'securite', 'qualite', 'culture', 'loi', 'normes', 'mesures', 'vin'])

// Marqueur de fin de phrase : une négation ne porte pas au-delà.
const FIN = 'zzfin'

/** Découpe un texte normalisé en mots (les fins de phrase deviennent un marqueur). */
const tokens = (t) => t.replace(/[.!?;:]+/g, ` ${FIN} `).split(/[^a-z0-9]+/).filter(Boolean)

/**
 * Positions (index de mot) où une forme apparaît.
 * Forme « mot » : mot exact ; « pref* » : préfixe ; « deux mots » : expression.
 */
function positions(toks, forme) {
  const out = []
  if (forme.includes(' ')) {
    const parts = forme.split(' ')
    for (let i = 0; i + parts.length <= toks.length; i++)
      if (parts.every((p, k) => (p.endsWith('*') ? toks[i + k].startsWith(p.slice(0, -1)) : toks[i + k] === p))) out.push(i)
    return out
  }
  if (forme.endsWith('*')) {
    const pref = forme.slice(0, -1)
    toks.forEach((t, i) => t.startsWith(pref) && out.push(i))
    return out
  }
  if (AMBIGUS.has(forme)) return out
  toks.forEach((t, i) => t === forme && out.push(i))
  return out
}

/** Le mot en position i est-il précédé d'une négation (dans la même proposition) ? */
function contexte(toks, i, fenetre = 8) {
  let negation = false
  let attenuation = false
  for (let k = Math.max(0, i - fenetre); k < i; k++) {
    if ([FIN, 'mais', 'et', 'ou', 'puis', 'car', 'donc'].includes(toks[k])) {
      negation = false
      attenuation = false
    }
    if (NEGATIONS.has(toks[k])) negation = true
    if (ATTENUATIONS.has(toks[k])) attenuation = true
  }
  return { negation, attenuation }
}

/** Première occurrence d'une des formes : { negation, attenuation } ou null. */
function trouve(toks, formes) {
  let res = null
  for (const f of formes)
    for (const i of positions(toks, f)) {
      const c = contexte(toks, i)
      if (!res || (res.negation && !c.negation)) res = c
    }
  return res
}

const affirme = (toks, formes) => {
  const r = trouve(toks, formes)
  return r && !r.negation ? r : null
}

/** Verbes de la dimension 1 reconnus dans un texte court (utilisé aussi pour les verbes ajoutés librement). */
export function detecterVerbes(texte) {
  const toks = tokens(normalize(texte))
  return AIME_FAMILLES.flatMap((f) => f.verbes).filter((v) => affirme(toks, [normalize(v.libelle), ...v.mots])).map((v) => v.id)
}

// Règles des conditions de travail : formes reconnues, position si affirmé, position si nié ou atténué.
const REGLES_CURSEURS = [
  { id: 'ecrans', formes: ['ecran', 'ecrans', 'ordinateur', 'ordinateurs', 'ordi', 'pc'], oui: 4, non: 2 },
  { id: 'manuel', formes: ['manuel', 'manuelle', 'manuels', 'concret', 'concrete', 'concrets', 'de mes mains', 'avec mes mains', 'fabriqu*', 'bricol*'], oui: 4, non: 1 },
  { id: 'lieu', formes: ['terrain'], oui: 4, non: 2 },
  { id: 'lieu', formes: ['bureau', 'bureaux'], oui: 2, non: 4 },
  { id: 'environnement', formes: ['dehors', 'exterieur', 'plein air', 'nature'], oui: 5, non: 1 },
  { id: 'deplacements', formes: ['deplacement*', 'deplacer', 'voyager', 'bouger', 'sillonner', 'itinerant*'], oui: 4, non: 1 },
  { id: 'teletravail', formes: ['teletravail', 'a distance', 'de chez moi', 'a la maison', 'remote'], oui: 4, non: 1 },
  { id: 'collectif', formes: ['en equipe', 'une equipe', 'collectif', 'collegues'], oui: 4, non: 2 },
  { id: 'collectif', formes: ['seul', 'seule', 'solitaire'], oui: 2, non: 4 },
  { id: 'autonomie', formes: ['autonom*'], oui: 5, non: 2 },
  { id: 'contact', formes: ['contact', 'contacts', 'les gens', 'du monde', 'le public', 'relationnel', 'humain', 'humains'], oui: 4, non: 1 },
  { id: 'management', formes: ['manager', 'encadrer', 'diriger une equipe', 'chef d equipe', 'management'], oui: 5, non: 1 },
  { id: 'diversite', formes: ['varie', 'variee', 'variees', 'varies', 'diversite', 'diversifie*'], oui: 5, non: 1 },
  { id: 'diversite', formes: ['routine', 'repetitif', 'repetitive'], oui: 1, non: 5 },
  { id: 'physique', formes: ['physique', 'sportif', 'sportive'], oui: 4, non: 1 },
  { id: 'intensite', formes: ['stress', 'pression', 'rush'], oui: 4, non: 1 },
]

const REGLES_CHOIX = [
  { groupe: 'temps', option: 'temps_partiel', formes: ['temps partiel', 'mi temps'] },
  { groupe: 'temps', option: 'temps_plein', formes: ['temps plein', 'plein temps'] },
  { groupe: 'horaires', option: 'nuit', formes: ['nuit', 'nuits', 'de nuit'] },
  { groupe: 'horaires', option: 'weekend', formes: ['week end', 'weekend', 'week ends', 'weekends', 'dimanche', 'samedi'] },
  { groupe: 'horaires', option: 'reguliers', formes: ['horaires reguliers', 'horaires fixes'] },
  { groupe: 'horaires', option: 'flexibles', formes: ['horaires flexibles', 'horaires souples', 'flexibilite'] },
  { groupe: 'horaires', option: 'decales', formes: ['horaires decales', 'decale', 'decales'] },
  { groupe: 'horaires', option: 'astreintes', formes: ['astreinte', 'astreintes'] },
  { groupe: 'statut', option: 'independant', formes: ['independant', 'independante', 'a mon compte', 'freelance', 'liberal', 'liberale'] },
  { groupe: 'statut', option: 'entrepreneur', formes: ['entrepreneur', 'entrepreneuse', 'mon entreprise', 'ma propre entreprise', 'ma boite'] },
  { groupe: 'statut', option: 'public', formes: ['fonction publique', 'fonctionnaire', 'service public'] },
  { groupe: 'structure', option: 'association', formes: ['association', 'associatif', 'associative'] },
  { groupe: 'structure', option: 'grande', formes: ['grand groupe', 'grande entreprise', 'multinationale'] },
  { groupe: 'structure', option: 'tpe', formes: ['petite structure', 'petite entreprise', 'tpe'] },
  { groupe: 'cadre', option: 'atelier', formes: ['atelier', 'usine'] },
  { groupe: 'cadre', option: 'chantier', formes: ['chantier', 'chantiers'] },
  { groupe: 'cadre', option: 'laboratoire', formes: ['laboratoire', 'labo'] },
  { groupe: 'cadre', option: 'restaurant', formes: ['restaurant', 'restauration'] },
  { groupe: 'cadre', option: 'vehicule', formes: ['volant', 'conduire'] },
]

/** Fournisseur d'analyse local (sans réseau). */
export function analyseLocale(texte) {
  const toks = tokens(normalize(texte))
  const nf = (l) => normalize(l).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

  const aime = detecterVerbes(texte)

  // Savoir-faire à confirmer : un mot-clé spécifique (6 lettres ou plus, ou une expression).
  const specifique = (m) => m.includes(' ') || m.replace('*', '').length >= 6
  const savoirs = SAVOIR_FAMILLES.flatMap((f) => f.savoirs)
    .filter((s) => affirme(toks, s.mots.filter(specifique)))
    .map((s) => s.id)

  const interets = INTERETS.filter((x) => affirme(toks, x.mots)).map((x) => x.id)
  const sens = CONTRIBUTIONS.filter((x) => affirme(toks, x.mots.filter(specifique))).map((x) => x.id)
  const motivations = MOTIVATIONS.filter((x) => affirme(toks, x.mots)).map((x) => x.id)

  const curseurs = {}
  for (const r of REGLES_CURSEURS) {
    if (curseurs[r.id]) continue
    const t = trouve(toks, r.formes.map(nf))
    if (!t) continue
    curseurs[r.id] = { pos: t.negation || t.attenuation ? r.non : r.oui, importance: 'souhaitable' }
  }

  const choix = {}
  for (const r of REGLES_CHOIX) {
    const t = trouve(toks, r.formes.map(nf))
    if (!t) continue
    choix[r.groupe] ||= { valeurs: {}, importance: 'souhaitable' }
    choix[r.groupe].valeurs[r.option] = t.negation ? 'eviter' : 'oui'
  }

  return { aime, savoirs, interets, sens, motivations, curseurs, choix }
}

/**
 * Analyse un pitch et renvoie des critères proposés (identifiants du référentiel), à faire confirmer.
 * `fournisseur` : fonction (texte) => propositions | Promise<propositions>. Par défaut : analyse locale.
 */
export async function analyserPitch(texte, { fournisseur = analyseLocale } = {}) {
  const vide = { aime: [], savoirs: [], interets: [], sens: [], motivations: [], curseurs: {}, choix: {} }
  if (!texte?.trim()) return vide
  return { ...vide, ...(await fournisseur(texte)) }
}

/** Nombre de propositions. */
export const countPropositions = (pr) =>
  pr.aime.length +
  pr.savoirs.length +
  pr.interets.length +
  pr.sens.length +
  pr.motivations.length +
  Object.keys(pr.curseurs).length +
  Object.values(pr.choix).reduce((n, c) => n + Object.keys(c.valeurs).length, 0)
