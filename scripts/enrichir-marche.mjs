#!/usr/bin/env node
/**
 * Enrichit public/data/metiers.json avec les indicateurs officiels du marché de l'emploi,
 * lus dans l'API « Marché du travail » de France Travail (gratuite, francetravail.io). Aucune IA.
 *
 * Usage :
 *   FRANCE_TRAVAIL_CLIENT_ID=… FRANCE_TRAVAIL_CLIENT_SECRET=… \
 *   node scripts/enrichir-marche.mjs [--limite=20] [--codes=A1101,M1805] [--out=public/data/metiers.json] [--dry-run]
 *
 * Pour chaque code ROME, trois chiffres nationaux (France entière) :
 *   - indice de tension « difficultés de recrutement » (1 à 5) → niveau_tension ;
 *   - offres d'emploi enregistrées sur 12 mois ;
 *   - demandeurs d'emploi de catégorie A.
 * Seul le bloc « marche_emploi » est écrit : officiel_rome et enrichi_ia ne sont jamais modifiés.
 * Avec --limite ou --codes, les autres métiers gardent leurs chiffres précédents.
 */
import fs from 'node:fs'
import { SOURCE, identifiants, jeton, marcheMetier } from '../api/_lib/france-travail.js'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=')
    return [k, v.length ? v.join('=') : true]
  }),
)
const OUT = args.out || 'public/data/metiers.json'
const LIMITE = Number(args.limite || process.env.LIMITE) || 0
const CODES = String(args.codes || process.env.CODES || '')
  .split(/[\s,;]+/)
  .filter(Boolean)
// Trois appels par métier ; l'application France Travail accepte 100 appels par seconde (marge gardée).
const METIERS_PAR_SECONDE = Number(args.rythme) || 25

const log = (...a) => console.log(...a)
const fail = (msg) => {
  console.error(`\n❌ ${msg}`)
  process.exit(1)
}
const attendre = (ms) => new Promise((res) => setTimeout(res, ms))

async function main() {
  if (!fs.existsSync(OUT)) fail(`${OUT} introuvable : lancez d'abord l'import et l'enrichissement.`)
  const creds = identifiants()
  if (!creds) {
    fail(
      'Identifiants France Travail absents. Ajoutez les secrets FRANCE_TRAVAIL_CLIENT_ID et ' +
        'FRANCE_TRAVAIL_CLIENT_SECRET dans les réglages du dépôt (Settings › Secrets and variables › Actions).',
    )
  }
  await jeton(creds).catch((e) => fail(e.message))
  log('Connexion à France Travail réussie.')

  const data = JSON.parse(fs.readFileSync(OUT, 'utf8'))
  let cibles = data.metiers
  if (CODES.length) cibles = cibles.filter((m) => CODES.includes(m.code_rome))
  if (LIMITE) cibles = cibles.slice(0, LIMITE)
  log(`${cibles.length} métiers à interroger (sur ${data.metiers.length}).`)

  const stats = { forte: 0, equilibree: 0, concurrentielle: 0, inconnue: 0 }
  let erreurs = 0
  const debut = Date.now()
  for (let i = 0; i < cibles.length; i += METIERS_PAR_SECONDE) {
    const lot = cibles.slice(i, i + METIERS_PAR_SECONDE)
    const t0 = Date.now()
    await Promise.all(
      lot.map(async (m) => {
        try {
          m.marche_emploi = await marcheMetier(creds, m.code_rome)
          stats[m.marche_emploi.niveau_tension]++
        } catch (e) {
          erreurs++
          console.warn(`⚠️  ${m.code_rome} : ${e.message}`)
        }
      }),
    )
    const fait = i + lot.length
    if (erreurs > 25 && erreurs > fait / 2) fail('Trop d’erreurs : l’API France Travail semble indisponible.')
    if (fait % 150 < METIERS_PAR_SECONDE || fait === cibles.length) {
      log(`  ${fait}/${cibles.length} métiers (${Math.round((Date.now() - debut) / 1000)} s)`)
    }
    await attendre(Math.max(0, 1000 - (Date.now() - t0)))
  }

  const exemple = cibles.find((m) => m.marche_emploi && m.marche_emploi.niveau_tension !== 'inconnue')
  if (exemple) log(`Exemple : ${exemple.code_rome} ${exemple.intitule} →`, JSON.stringify(exemple.marche_emploi))
  log(`\nRésultat : ${Object.entries(stats).map(([k, v]) => `${k} ${v}`).join(' · ')} · erreurs ${erreurs}`)
  if (stats.forte + stats.equilibree + stats.concurrentielle === 0) {
    fail('Aucun indice de tension reçu : vérifiez que l’application francetravail.io a bien accès à l’API « Marché du travail ».')
  }

  const annees = data.metiers.map((m) => m.marche_emploi?.annee).filter(Boolean)
  data.meta.marche_emploi = {
    source: SOURCE,
    annee: annees.length ? Math.max(...annees) : null,
    url_source: 'https://francetravail.io/data/api/marche-travail',
    date_mise_a_jour: new Date().toISOString(),
    methode:
      'Indice de tension « difficultés de recrutement » de France Travail (1 à 5, France entière) : ' +
      '4 ou 5 = recrute fortement, 3 = équilibré, 1 ou 2 = concurrentiel. ' +
      'Offres enregistrées sur 12 mois et demandeurs d’emploi de catégorie A, même source.',
  }
  if (args['dry-run']) return log('--dry-run : aucun fichier modifié.')
  const tmp = `${OUT}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, OUT)
  log(`${OUT} mis à jour.`)
}

main().catch((e) => fail(e.stack || e.message))
