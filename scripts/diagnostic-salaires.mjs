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

console.log('\n===== 4. Tranches de salaire des offres pour quelques métiers (France entière)')
for (const code of ['M1405', 'K1302', 'D1106', 'F1703', 'J1506']) {
  for (const origine of ['TOFF-CUMUL12MOIS', 'PE-CUMUL12MOIS']) {
    const r = await appel('POST', '/indicateur/stat-offres', {
      codeTypeTerritoire: 'NAT',
      codeTerritoire: 'FR',
      codeTypeActivite: 'ROME',
      codeActivite: code,
      codeTypePeriode: 'TRIMESTRE',
      codeTypeNomenclature: 'ORIGINEOFF',
      listeCodeNomenclature: [origine],
      dernierePeriode: true,
      sansCaracteristiques: false,
    })
    const l = r.json?.listeValeursParPeriode?.[0]
    if (!l) {
      console.log(`${code} ${origine} : HTTP ${r.status} ${r.texte || JSON.stringify(r.json).slice(0, 300)}`)
      continue
    }
    const sal = (l.listeValeurParCaract || []).filter((c) => c.codeTypeCaract === 'SALAIRE' || /SAL/.test(c.codeTypeCaract))
    console.log(`${code} ${l.libActivite} · ${origine} · ${l.libPeriode} · ${l.valeurPrincipaleNombre} offres`)
    for (const c of sal) console.log(`   ${c.codeTypeCaract} ${c.codeCaract} | ${c.libCaract} | ${JSON.stringify({ nombre: c.nombre, pourcentage: c.pourcentage, masque: c.masque, autres: Object.keys(c).filter((k) => !['codeTypeCaract', 'codeCaract', 'libCaract', 'nombre', 'pourcentage', 'masque'].includes(k)) })}`)
    await new Promise((res) => setTimeout(res, 250))
  }
}
