// Tranche de salaire d'un métier, calculée à partir des salaires affichés dans les offres
// d'emploi publiées sur France Travail (API « Offres d'emploi v2 », gratuite, francetravail.io).
// Aucun appel à une IA. Utilisé par scripts/enrichir-salaires.mjs.

import { jeton } from './france-travail.js'

const API_URL = process.env.FRANCE_TRAVAIL_OFFRES_URL || 'https://api.francetravail.io/partenaire/offresdemploi/v2'
export const SCOPE_OFFRES = 'api_offresdemploiv2 o2dsoffre'
export const SOURCE_SALAIRES = 'France Travail – salaires affichés dans les offres d’emploi'

const HEURES_PAR_MOIS = 151.67
// En dessous de 5 offres avec un salaire chiffré, la tranche ne serait pas représentative.
export const OFFRES_MIN = 5
const attendre = (ms) => new Promise((res) => setTimeout(res, ms))
const nombre = (t) => Number(String(t).replace(/\s/g, '').replace(',', '.'))

/**
 * « Mensuel de 1800.00 Euros à 2000.00 Euros sur 12 mois » → salaire brut mensuel moyen (1900),
 * ramené sur 12 mois. Horaire × 151,67 h ; annuel ÷ 12. null si le libellé n'a pas de chiffre.
 */
export function salaireMensuel(libelle) {
  const t = String(libelle || '')
  const unite = t.match(/^\s*(Mensuel|Annuel|Horaire)/i)?.[1]?.toLowerCase()
  const montants = [...t.matchAll(/(\d[\d\s]*(?:[.,]\d+)?)\s*Euros?/gi)].map((m) => nombre(m[1])).filter((n) => n > 0)
  if (!unite || !montants.length) return null
  let v = montants.length > 1 ? (montants[0] + montants[1]) / 2 : montants[0]
  if (unite === 'annuel') v /= 12
  else if (unite === 'horaire') v *= HEURES_PAR_MOIS
  else {
    const mois = Number(t.match(/sur\s+(\d+(?:[.,]\d+)?)\s*mois/i)?.[1]?.replace(',', '.'))
    if (mois >= 12 && mois <= 15) v = (v * mois) / 12
  }
  // Valeurs aberrantes (temps très partiel, faute de saisie) : écartées.
  return v >= 1000 && v <= 20000 ? v : null
}

const quantile = (tri, q) => {
  const i = (tri.length - 1) * q
  const b = Math.floor(i)
  return tri[b] + (tri[Math.min(b + 1, tri.length - 1)] - tri[b]) * (i - b)
}
const arrondi = (v) => Math.round(v / 50) * 50

/** Les salaires d'une liste d'offres → { min, max, mediane, nb_offres } (brut mensuel) ou null. */
export function tranche(offres) {
  const valeurs = offres
    // Les offres à temps partiel afficheraient un salaire mensuel trop bas.
    .filter((o) => !/partiel/i.test(o.dureeTravailLibelleConverti || ''))
    .map((o) => salaireMensuel(o.salaire?.libelle))
    .filter((v) => v !== null)
    .sort((a, b) => a - b)
  if (valeurs.length < OFFRES_MIN) return null
  // La moitié centrale des offres : ni les 25 % les plus basses, ni les 25 % les plus hautes.
  return {
    min: arrondi(quantile(valeurs, 0.25)),
    max: arrondi(quantile(valeurs, 0.75)),
    mediane: arrondi(quantile(valeurs, 0.5)),
    nb_offres: valeurs.length,
  }
}

/** Offres actuelles d'un code ROME (150 au plus, les plus récentes). */
export async function offresMetier(creds, codeRome) {
  const url = `${API_URL}/offres/search?codeROME=${encodeURIComponent(codeRome)}&range=0-149&sort=1`
  for (let essai = 0; ; essai++) {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${await jeton(creds, SCOPE_OFFRES)}`, Accept: 'application/json' },
    })
    if (r.status === 200 || r.status === 206) return (await r.json()).resultats || []
    if (r.status === 204 || r.status === 404) return []
    const texte = await r.text().catch(() => '')
    if ((r.status === 429 || r.status >= 500) && essai < 4) {
      await attendre(Number(r.headers.get('retry-after')) * 1000 || 1500 * 2 ** essai)
      continue
    }
    throw new Error(`France Travail offres (${codeRome}) : HTTP ${r.status} ${texte.slice(0, 200)}`)
  }
}

/** Bloc « salaire » d'un métier, au format de marche_emploi.salaire. */
export async function salaireMetier(creds, codeRome) {
  const t = tranche(await offresMetier(creds, codeRome))
  return t && { ...t, unite: 'brut_mensuel', source: SOURCE_SALAIRES, date: new Date().toISOString().slice(0, 10) }
}
