#!/usr/bin/env node
/**
 * Ajoute une tranche de salaire à chaque métier de public/data/metiers.json, d'après les salaires
 * affichés dans les offres d'emploi France Travail du moment (API « Offres d'emploi v2 »). Aucune IA.
 *
 * Usage :
 *   FRANCE_TRAVAIL_CLIENT_ID=… FRANCE_TRAVAIL_CLIENT_SECRET=… \
 *   node scripts/enrichir-salaires.mjs [--limite=20] [--codes=A1101,M1805] [--dry-run]
 *
 * Seul marche_emploi.salaire est écrit. Avec --limite ou --codes, les autres métiers gardent leur tranche.
 */
import fs from 'node:fs'
import { identifiants, jeton } from '../api/_lib/france-travail.js'
import { OFFRES_MIN, SCOPE_OFFRES, SOURCE_SALAIRES, salaireMetier } from '../api/_lib/salaires-offres.js'

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
// Un appel par métier ; on reste prudent sur le débit de l'API Offres d'emploi.
const PAR_SECONDE = Number(args.rythme) || 3

const log = (...a) => console.log(...a)
const fail = (msg) => {
  console.error(`\n❌ ${msg}`)
  process.exit(1)
}
const attendre = (ms) => new Promise((res) => setTimeout(res, ms))

async function main() {
  const creds = identifiants()
  if (!creds) fail('Secrets FRANCE_TRAVAIL_CLIENT_ID et FRANCE_TRAVAIL_CLIENT_SECRET absents.')
  await jeton(creds, SCOPE_OFFRES).catch((e) =>
    fail(
      `${e.message}\n\nL'application francetravail.io doit aussi avoir accès à l'API « Offres d'emploi v2 » : ` +
        'sur francetravail.io, ouvrez votre application, puis ajoutez cette API (gratuite).',
    ),
  )
  log('Connexion à l’API Offres d’emploi réussie.')

  const data = JSON.parse(fs.readFileSync(OUT, 'utf8'))
  let cibles = data.metiers
  if (CODES.length) cibles = cibles.filter((m) => CODES.includes(m.code_rome))
  if (LIMITE) cibles = cibles.slice(0, LIMITE)
  log(`${cibles.length} métiers à interroger (sur ${data.metiers.length}).`)

  let avec = 0
  let sans = 0
  let erreurs = 0
  const debut = Date.now()
  for (let i = 0; i < cibles.length; i += PAR_SECONDE) {
    const lot = cibles.slice(i, i + PAR_SECONDE)
    const t0 = Date.now()
    await Promise.all(
      lot.map(async (m) => {
        try {
          const s = await salaireMetier(creds, m.code_rome)
          m.marche_emploi = { ...(m.marche_emploi || {}), salaire: s }
          if (s) avec++
          else sans++
        } catch (e) {
          erreurs++
          console.warn(`⚠️  ${m.code_rome} : ${e.message}`)
        }
      }),
    )
    const fait = i + lot.length
    if (erreurs > 25 && erreurs > fait / 2) fail('Trop d’erreurs : l’API Offres d’emploi semble indisponible.')
    if (fait % 150 < PAR_SECONDE || fait === cibles.length) {
      log(`  ${fait}/${cibles.length} métiers (${Math.round((Date.now() - debut) / 1000)} s)`)
    }
    await attendre(Math.max(0, 1000 - (Date.now() - t0)))
  }

  for (const m of cibles.filter((m) => m.marche_emploi?.salaire).slice(0, 5)) {
    const s = m.marche_emploi.salaire
    log(`Exemple : ${m.code_rome} ${m.intitule} → ${s.min} à ${s.max} € brut/mois (${s.nb_offres} offres)`)
  }
  log(`\nRésultat : ${avec} métiers avec une tranche · ${sans} sans assez d’offres chiffrées (moins de ${OFFRES_MIN}) · erreurs ${erreurs}`)
  if (!avec) fail('Aucune tranche de salaire calculée : rien n’est enregistré.')

  data.meta.salaires = {
    source: SOURCE_SALAIRES,
    url_source: 'https://francetravail.io/data/api/offres-emploi',
    date_mise_a_jour: new Date().toISOString(),
    methode:
      'Salaires affichés dans les offres France Travail du moment (150 plus récentes par métier, hors temps partiel), ' +
      'ramenés en brut mensuel. La tranche va du 1er au 3e quartile : la moitié des offres se situe entre les deux.',
  }
  if (args['dry-run']) return log('--dry-run : aucun fichier modifié.')
  const tmp = `${OUT}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, OUT)
  log(`${OUT} mis à jour.`)
}

main().catch((e) => fail(e.stack || e.message))
