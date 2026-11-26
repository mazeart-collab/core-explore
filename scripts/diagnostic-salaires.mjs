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
console.log('===== Variantes de requête pour stat-salaires-en-poste')
const base = { codeTypeTerritoire: 'NAT', codeTerritoire: 'FR', codeTypeActivite: 'ROME', codeActivite: 'M1405' }
const variantes = [
  ['A. tout, sans filtre de nomenclature', { ...base, codeTypeNomenclature: 'TYPESALAIRE', sansCaracteristiques: false }],
  ['B. sans période ni nomenclature', { ...base }],
  ['C. période ANNEE, toutes périodes', { ...base, codeTypePeriode: 'ANNEE', codeTypeNomenclature: 'TYPESALAIRE', dernierePeriode: false }],
  ['D. période TRIMESTRE', { ...base, codeTypePeriode: 'TRIMESTRE', codeTypeNomenclature: 'TYPESALAIRE', dernierePeriode: true }],
  ['E. Infirmier J1506', { ...base, codeActivite: 'J1506', codeTypeNomenclature: 'TYPESALAIRE' }],
  ['F. Maçon F1703', { ...base, codeActivite: 'F1703', codeTypeNomenclature: 'TYPESALAIRE' }],
  ['G. Paris (DEP 75), M1405', { ...base, codeTypeTerritoire: 'DEP', codeTerritoire: '75', codeTypeNomenclature: 'TYPESALAIRE' }],
  ['H. toutes activités (CUMUL)', { ...base, codeTypeActivite: 'CUMUL', codeActivite: 'CUMUL', codeTypeNomenclature: 'TYPESALAIRE' }],
  ['I. activité FAP', { ...base, codeTypeActivite: 'FAP', codeActivite: 'M2Z90', codeTypeNomenclature: 'TYPESALAIRE' }],
]
for (const [nom, corps] of variantes) {
  const r = await appel('POST', '/indicateur/stat-salaires-en-poste', corps)
  const t = r.json ? JSON.stringify(r.json) : r.texte
  console.log(`--- ${nom} → HTTP ${r.status}`)
  console.log(t.slice(0, 2500))
  await new Promise((res) => setTimeout(res, 200))
}
