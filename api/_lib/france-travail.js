// Client minimal de l'API « Marché du travail » de France Travail (francetravail.io, gratuite).
// Partagé par le script scripts/enrichir-marche.mjs (chiffres nationaux) et la fonction
// Vercel api/marche.js (chiffres d'un département). Aucun appel à une IA.
//
// Identifiants : FRANCE_TRAVAIL_CLIENT_ID et FRANCE_TRAVAIL_CLIENT_SECRET (application créée
// sur francetravail.io avec l'API « Marché du travail »).

const TOKEN_URL =
  process.env.FRANCE_TRAVAIL_TOKEN_URL ||
  'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire'
const API_URL =
  process.env.FRANCE_TRAVAIL_API_URL || 'https://api.francetravail.io/partenaire/stats-offres-demandes-emploi/v1'
const SCOPE = 'api_stats-offres-demandes-emploiv1 offresetdemandesemploi'

export const SOURCE = 'France Travail – API Marché du travail'

/** Les trois indicateurs utilisés, et la valeur retenue dans chacun. */
export const INDICATEURS = {
  // PERSP_2 : difficultés de recrutement, synthèse « PERSPECTIVE » de 1 (très faible) à 5 (très forte).
  tension: { path: '/indicateur/stat-perspective-employeur', nomenclature: 'TYPE_TENSION', periode: 'ANNEE', code: 'PERSPECTIVE' },
  // OFF_1 : offres enregistrées sur les 12 derniers mois, toutes origines.
  offres: { path: '/indicateur/stat-offres', nomenclature: 'ORIGINEOFF', periode: 'TRIMESTRE', code: 'TOFF-CUMUL12MOIS' },
  // DE_1 : demandeurs d'emploi de catégorie A inscrits en fin de trimestre.
  demandeurs: { path: '/indicateur/stat-demandeurs', nomenclature: 'CATCAND', periode: 'TRIMESTRE', code: 'A' },
}

export function identifiants(env = process.env) {
  // Les espaces, retours à la ligne ou guillemets collés par erreur avec la valeur sont retirés.
  const nettoie = (v) => String(v || '').trim().replace(/^["']|["']$/g, '').trim()
  const id = nettoie(env.FRANCE_TRAVAIL_CLIENT_ID)
  const secret = nettoie(env.FRANCE_TRAVAIL_CLIENT_SECRET)
  return id && secret ? { id, secret } : null
}

let cache = null

/** Jeton OAuth2 « client credentials », réutilisé jusqu'à une minute avant son expiration. */
export async function jeton({ id, secret }, scope = SCOPE) {
  if (cache && cache.id === id && cache.scope === scope && cache.expire > Date.now()) return cache.valeur
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret, scope }),
  })
  if (!r.ok) {
    const detail = (await r.text().catch(() => '')).slice(0, 300)
    const aide = /invalid_client/.test(detail)
      ? ` Identifiant ou clé secrète incorrects, ou API « Marché du travail » non ajoutée à l’application francetravail.io (identifiant : ${id.length} caractères, ${id.startsWith("PAR_") ? "commence bien" : "ne commence pas"} par « PAR_ » ; ` +
        `clé secrète : ${secret.length} caractères).`
      : ''
    throw new Error(`Authentification France Travail refusée (HTTP ${r.status}). ${detail}${aide}`)
  }
  const d = await r.json()
  if (!d.access_token) throw new Error('Authentification France Travail : pas de jeton dans la réponse.')
  cache = { id, scope, valeur: d.access_token, expire: Date.now() + Math.max(60, (d.expires_in || 1499) - 60) * 1000 }
  return cache.valeur
}

// La « non-donnée » est signalée par un 204, un 404, ou un 400/500 au message explicite.
const SANS_DONNEE = /pas pu trouver|n'est pas disponible|aucune|not found/i
const attendre = (ms) => new Promise((res) => setTimeout(res, ms))

/**
 * Appelle un indicateur pour un code ROME et un territoire.
 * Renvoie la réponse JSON, ou null quand France Travail n'a pas de chiffre.
 * Lève une erreur quand l'API est indisponible (après 3 nouvelles tentatives sur 429 / 5xx).
 */
export async function indicateur(creds, nom, codeRome, { typeTerritoire = 'NAT', territoire = 'FR' } = {}) {
  const ind = INDICATEURS[nom]
  const body = JSON.stringify({
    codeTypeTerritoire: typeTerritoire,
    codeTerritoire: territoire,
    codeTypeActivite: 'ROME',
    codeActivite: codeRome,
    codeTypePeriode: ind.periode,
    codeTypeNomenclature: ind.nomenclature,
    listeCodeNomenclature: [ind.code],
    dernierePeriode: true,
    sansCaracteristiques: true,
  })
  for (let essai = 0; ; essai++) {
    const r = await fetch(API_URL + ind.path, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await jeton(creds)}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body,
    })
    if (r.status === 200) return r.json()
    if (r.status === 204 || r.status === 404) return null
    const texte = await r.text().catch(() => '')
    if ((r.status === 400 || r.status === 500) && SANS_DONNEE.test(texte)) return null
    if (r.status === 401 && essai === 0) {
      cache = null
      continue
    }
    if ((r.status === 429 || r.status >= 500) && essai < 3) {
      await attendre(Number(r.headers.get('retry-after')) * 1000 || 1000 * 2 ** essai)
      continue
    }
    throw new Error(`France Travail ${ind.path} (${codeRome}) : HTTP ${r.status} ${texte.slice(0, 200)}`)
  }
}

/** Valeur la plus récente d'un indicateur : { valeur, periode } ou null. */
export function lire(reponse, nom) {
  const code = INDICATEURS[nom].code
  let best = null
  for (const l of reponse?.listeValeursParPeriode || []) {
    if (l.codeNomenclature !== code) continue
    const v = l.valeurPrincipaleNombre ?? l.valeurPrincipaleDecimale
    if (typeof v !== 'number' || !Number.isFinite(v)) continue
    if (best && String(best.code) >= String(l.codePeriode)) continue
    best = { code: l.codePeriode, valeur: v, periode: l.libPeriode || l.codePeriode }
  }
  return best && { valeur: best.valeur, periode: best.periode }
}

/** Indice France Travail (1 à 5) → niveau affiché dans l'application. */
export function niveauTension(indice) {
  if (!Number.isInteger(indice) || indice < 1 || indice > 5) return 'inconnue'
  if (indice >= 4) return 'forte'
  if (indice === 3) return 'equilibree'
  return 'concurrentielle'
}

/** Les trois indicateurs d'un métier sur un territoire, au format du bloc marche_emploi. */
export async function marcheMetier(creds, codeRome, territoire) {
  const [t, o, d] = await Promise.all(
    ['tension', 'offres', 'demandeurs'].map((nom) => indicateur(creds, nom, codeRome, territoire)),
  )
  const tension = lire(t, 'tension')
  const offres = lire(o, 'offres')
  const demandeurs = lire(d, 'demandeurs')
  return {
    niveau_tension: niveauTension(tension?.valeur),
    indice_tension: tension?.valeur ?? null,
    offres_12_mois: offres ? Math.round(offres.valeur) : null,
    demandeurs_emploi: demandeurs ? Math.round(demandeurs.valeur) : null,
    periode: { tension: tension?.periode ?? null, offres: offres?.periode ?? null, demandeurs: demandeurs?.periode ?? null },
    source: SOURCE,
    annee: Number(String(tension?.periode || offres?.periode || '').match(/20\d\d/)?.[0]) || null,
  }
}
