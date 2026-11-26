#!/usr/bin/env node
/**
 * Diagnostic : découvre le format de l'indicateur « Salaire proposé » de l'API Marché du travail
 * (France Travail), dont la documentation n'est pas lisible depuis l'environnement de développement.
 * Le script appelle plusieurs variantes de requêtes pour un code ROME et affiche les réponses brutes
 * (jamais les identifiants). Rien n'est écrit dans les données.
 *
 * Usage : FRANCE_TRAVAIL_CLIENT_ID=… FRANCE_TRAVAIL_CLIENT_SECRET=… node scripts/diagnostic-salaires.mjs [--code=M1405]
 */
import { identifiants, jeton } from '../api/_lib/france-travail.js'

const API_URL =
  process.env.FRANCE_TRAVAIL_API_URL || 'https://api.francetravail.io/partenaire/stats-offres-demandes-emploi/v1'
const code =
  process.argv.find((a) => a.startsWith('--code='))?.split('=')[1] ||
  String(process.env.CODES || '').split(/[\s,;]+/).find(Boolean) ||
  'M1405'

const creds = identifiants()
if (!creds) {
  console.error('Identifiants France Travail absents (secrets FRANCE_TRAVAIL_CLIENT_ID / FRANCE_TRAVAIL_CLIENT_SECRET).')
  process.exit(1)
}
const token = await jeton(creds)
console.log(`Connexion réussie. Code ROME testé : ${code}\n`)

const base = { codeTypeTerritoire: 'NAT', codeTerritoire: 'FR', codeTypeActivite: 'ROME', codeActivite: code }
const essais = [
  // Les indicateurs connus, avec leurs « caractéristiques » (le salaire pourrait en faire partie).
  ['POST', '/indicateur/stat-offres', { ...base, codeTypePeriode: 'TRIMESTRE', codeTypeNomenclature: 'ORIGINEOFF', listeCodeNomenclature: ['TOFF-CUMUL12MOIS'], dernierePeriode: true, sansCaracteristiques: false }],
  ['POST', '/indicateur/stat-offres', { ...base, codeTypePeriode: 'TRIMESTRE', codeTypeNomenclature: 'ORIGINEOFF', dernierePeriode: true, sansCaracteristiques: false }],
  // Référentiel des nomenclatures : le format /referentiel/nomenclature/{code} semble exister.
  ['GET', '/referentiel/nomenclature/ORIGINEOFF'],
  ['GET', '/referentiel/nomenclature/TYPE_SALAIRE'],
  ['GET', '/referentiel/nomenclature/SALAIRE'],
  ['GET', '/referentiel/nomenclature/TYPE_SAL'],
  ['GET', '/referentiel/nomenclatures'],
  ['GET', '/referentiel/indicateurs'],
  ['GET', '/referentiel/caracteristiques'],
  ['GET', '/referentiel/caracteristique/ORIGINEOFF'],
  ['GET', '/referentiel/periode/TRIMESTRE'],
  ['GET', '/referentiel/activite/ROME'],
  // Autres noms possibles de l'indicateur salaire.
  ['POST', '/indicateur/stat-salaire-propose', { ...base, dernierePeriode: true }],
  ['POST', '/indicateur/stat-salaires-offres', { ...base, dernierePeriode: true }],
  ['POST', '/indicateur/stat-remuneration', { ...base, dernierePeriode: true }],
  ['POST', '/indicateur/salaires', { ...base, dernierePeriode: true }],
  ['POST', '/indicateur/stat-salaire-offre', { ...base, dernierePeriode: true }],
]

for (const [methode, chemin, corps] of essais) {
  const r = await fetch(API_URL + chemin, {
    method: methode,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
  }).catch((e) => ({ status: 'erreur réseau', text: async () => e.message }))
  const texte = await r.text()
  console.log(`===== ${methode} ${chemin}${corps ? ' ' + JSON.stringify(corps) : ''}`)
  console.log(`HTTP ${r.status}`)
  console.log(texte.slice(0, 6000) || '(réponse vide)')
  console.log('')
  await new Promise((res) => setTimeout(res, 300))
}
