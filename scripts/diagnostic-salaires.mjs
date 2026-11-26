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

// SAL_3 : « Salaires en poste par typologie salaires (moyen / débutant / expérimenté) x caractéristiques »,
// nomenclature TYPESALAIRE (SAL1 moins de 35 ans, SAL2 35 ans et +, SAL3 tout âge), déciles SAL_D10 / SAL_D90.
console.log('===== Recherche du chemin de l\'indicateur SAL_3 (salaires en poste)')
const corps = (extra = {}) => ({
  codeTypeTerritoire: 'NAT',
  codeTerritoire: 'FR',
  codeTypeActivite: 'ROME',
  codeActivite: 'M1405',
  codeTypePeriode: 'ANNEE',
  codeTypeNomenclature: 'TYPESALAIRE',
  listeCodeNomenclature: ['SAL3'],
  dernierePeriode: true,
  sansCaracteristiques: false,
  ...extra,
})
const chemins = [
  '/indicateur/salaire-rome-fap',
  '/indicateur/stat-salaire-rome-fap',
  '/indicateur/stat-salaires-en-poste',
  '/indicateur/stat-salaire-en-poste',
  '/indicateur/stat-salaires-poste',
  '/indicateur/stat-salaries',
  '/indicateur/stat-salaire',
  '/indicateur/stat-salaires',
  '/indicateur/salaires',
  '/indicateur/salaire',
  '/indicateur/stat-remunerations',
  '/indicateur/SAL_3',
  '/indicateur/sal-3',
]
for (const chemin of chemins) {
  const r = await appel('POST', chemin, corps())
  const resume = r.json ? JSON.stringify(r.json) : r.texte
  console.log(`${chemin} → HTTP ${r.status} ${r.status === 404 && /Could not find resource/.test(resume) ? '(chemin inexistant)' : resume.slice(0, 3000)}`)
  await new Promise((res) => setTimeout(res, 200))
}
console.log('')
console.log('===== 1. Liste des indicateurs')
const ind = await appel('GET', '/referentiel/indicateurs')
for (const i of ind.json?.indicateurs || []) console.log(`${i.codeIndicateur} | ${i.libelleIndicateur}`)

console.log('\n===== 2. Caractéristiques de type salaire dans le référentiel')
const car = await appel('GET', '/referentiel/caracteristiques')
for (const c of car.json?.caracteristiques || []) {
  if (/SAL/i.test(c.codeTypeCaracteristique) || /salaire|rémun/i.test(c.libelleCaracteristique))
    console.log(`${c.codeTypeCaracteristique} | ${c.codeCaracteristique} | ${c.libelleCaracteristique}`)
}

console.log('\n===== 3. Nomenclatures liées au salaire')
const nom = await appel('GET', '/referentiel/nomenclatures')
for (const n of nom.json?.nomenclatures || []) {
  if (/SAL/i.test(n.codeTypeNomenclature) || /salaire|rémun/i.test(n.libelleNomenclature))
    console.log(`${n.codeTypeNomenclature} | ${n.codeNomenclature} | ${n.libelleNomenclature}`)
}
console.log('Types de nomenclature existants :', [...new Set((nom.json?.nomenclatures || []).map((n) => n.codeTypeNomenclature))].join(', '))

