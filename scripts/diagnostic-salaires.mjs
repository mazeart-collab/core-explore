#!/usr/bin/env node
/**
 * Diagnostic : format des tranches de salaire de l'API Marché du travail (France Travail).
 * Les salaires sont des « caractéristiques » (codeTypeCaract SALAIRE) de l'indicateur stat-offres.
 * Le script affiche une synthèse compacte, sans rien écrire dans les données.
 *
 * Usage : FRANCE_TRAVAIL_CLIENT_ID=… FRANCE_TRAVAIL_CLIENT_SECRET=… node scripts/diagnostic-salaires.mjs
 */
import { identifiants, jeton } from '../api/_lib/france-travail.js'

const API_URL =
  process.env.FRANCE_TRAVAIL_API_URL || 'https://api.francetravail.io/partenaire/stats-offres-demandes-emploi/v1'
const creds = identifiants()
if (!creds) {
  console.error('Identifiants France Travail absents.')
  process.exit(1)
}
const token = await jeton(creds)
const appel = async (methode, chemin, corps) => {
  const r = await fetch(API_URL + chemin, {
    method: methode,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
  })
  const t = await r.text()
  try {
    return { status: r.status, json: JSON.parse(t) }
  } catch {
    return { status: r.status, texte: t.slice(0, 500) }
  }
}

// SAL_3 : « Salaires en poste » → POST /indicateur/stat-salaires-en-poste (chemin confirmé le 26/11/2026).
// Nomenclature TYPESALAIRE (SAL1 moins de 35 ans, SAL2 35 ans et +, SAL3 tout âge), déciles SAL_D10 / SAL_D90.
console.log('===== Variantes (période ANNEE, seule acceptée)')
const base = { codeTypeTerritoire: 'NAT', codeTerritoire: 'FR', codeTypeActivite: 'ROME', codeTypePeriode: 'ANNEE', codeTypeNomenclature: 'TYPESALAIRE', dernierePeriode: false, sansCaracteristiques: false }
const variantes = [
  ['A. Infirmier J1506', { ...base, codeActivite: 'J1506' }],
  ['B. Maçon F1703', { ...base, codeActivite: 'F1703' }],
  ['C. Vendeur D1106', { ...base, codeActivite: 'D1106' }],
  ['D. Assistant de vie K1302', { ...base, codeActivite: 'K1302' }],
  ['E. M1405, SAL3 seul', { ...base, codeActivite: 'M1405', listeCodeNomenclature: ['SAL3'] }],
  ['F. M1405, région Île-de-France (REG 11)', { ...base, codeActivite: 'M1405', codeTypeTerritoire: 'REG', codeTerritoire: '11' }],
  ['G. J1506, département 75', { ...base, codeActivite: 'J1506', codeTypeTerritoire: 'DEP', codeTerritoire: '75' }],
  ['H. toutes activités (CUMUL)', { ...base, codeTypeActivite: 'CUMUL', codeActivite: 'CUMUL' }],
  ['I. sans activité', { codeTypeTerritoire: 'NAT', codeTerritoire: 'FR', codeTypePeriode: 'ANNEE', codeTypeNomenclature: 'TYPESALAIRE', dernierePeriode: false }],
  ['J. FAP87 J0Z (infirmiers ?)', { ...base, codeTypeActivite: 'FAP87', codeActivite: 'V0Z' }],
  ['K. famille de métiers (FAMILLE) J', { ...base, codeTypeActivite: 'FAMILLE', codeActivite: 'J' }],
  ['L. secteur (NAF) 86', { ...base, codeTypeActivite: 'SECTEUR', codeActivite: '86' }],
]
for (const [nom, corps] of variantes) {
  const r = await appel('POST', '/indicateur/stat-salaires-en-poste', corps)
  const t = r.json ? JSON.stringify(r.json) : r.texte
  const vide = r.status === 200 && !r.json?.listeValeursParPeriode
  console.log(`--- ${nom} → HTTP ${r.status}${vide ? ' (réponse sans chiffres)' : ''}`)
  if (!vide) console.log(t.slice(0, 2500))
  await new Promise((res) => setTimeout(res, 200))
}
