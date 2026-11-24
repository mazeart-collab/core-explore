#!/usr/bin/env node
/**
 * Script 1 : import officiel du ROME 4.0 (France Travail, Open Data).
 *
 * 1. Repère sur data.gouv.fr la ressource « Toutes les données du ROME » (CSV)
 *    du jeu de données ROME, puis la télécharge (archive ZIP de fichiers CSV).
 * 2. Parse les CSV (arborescence, appellations, textes, compétences, savoirs,
 *    contextes de travail, centres d'intérêt, secteurs).
 * 3. Écrit data/rome_base.json : une entrée par fiche métier ROME.
 *
 * Usage :
 *   npm run data:import
 *   node scripts/import-rome.js --from=chemin/vers/archive.zip   (fichier déjà téléchargé)
 *   node scripts/import-rome.js --from=chemin/vers/dossier       (CSV déjà décompressés)
 *   node scripts/import-rome.js --refresh                         (ignore le cache data/raw/)
 *   node scripts/import-rome.js --out=data/autre.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import AdmZip from 'adm-zip'
import { parse } from 'csv-parse/sync'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Jeu de données « Répertoire Opérationnel des Métiers et des Emplois (ROME) » sur data.gouv.fr
const DATAGOUV_DATASET_ID = '58da857388ee384902e505f5'
const DATAGOUV_DATASET_PAGE =
  'https://www.data.gouv.fr/datasets/repertoire-operationnel-des-metiers-et-des-emplois-rome'
const DATAGOUV_API = `https://www.data.gouv.fr/api/1/datasets/${DATAGOUV_DATASET_ID}/`
// URL de la ressource « Toutes les données du ROME » (CSV) publiée sur ce jeu de données,
// utilisée si l'API data.gouv.fr ne répond pas.
const FALLBACK_CSV_URL = 'https://api.francetravail.fr/api-nomenclatureemploi/v1/open-data/csv'

const SOURCE_LABEL = 'ROME 4.0 - France Travail'
const METIERSCOPE_URL = (code) => `https://candidat.francetravail.fr/metierscope/fiche-metier/${code}`
const CODE_ROME_RE = /^[A-N]\d{4}$/

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=')
    return [k, v.length ? v.join('=') : true]
  }),
)
const OUT_FILE = path.resolve(ROOT, args.out || 'data/rome_base.json')
const RAW_DIR = path.join(ROOT, 'data/raw')
const CACHE_ZIP = path.join(RAW_DIR, 'rome-open-data-csv.zip')

// ---------------------------------------------------------------------------
// Étape 1 : obtenir les fichiers sources
// ---------------------------------------------------------------------------
async function resolveCsvUrl() {
  try {
    const res = await fetch(DATAGOUV_API, { headers: { accept: 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const dataset = await res.json()
    const resource = (dataset.resources || []).find(
      (r) => /toutes les donn[ée]es du rome/i.test(r.title || '') && /csv/i.test(r.format || ''),
    )
    if (!resource?.url) throw new Error('ressource CSV introuvable dans le jeu de données')
    console.log(`✔ data.gouv.fr : ressource « ${resource.title} » (${resource.format}) trouvée`)
    return resource.url
  } catch (err) {
    console.warn(`⚠ Recherche data.gouv.fr impossible (${err.message}), URL connue utilisée.`)
    return FALLBACK_CSV_URL
  }
}

async function download(url, dest) {
  console.log(`↓ Téléchargement : ${url}`)
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.subarray(0, 2).toString() !== 'PK') {
    const preview = buf.subarray(0, 200).toString('utf8').replace(/\s+/g, ' ')
    throw new Error(`le fichier reçu n'est pas une archive ZIP (début : « ${preview} »)`)
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, buf)
  console.log(`✔ Archive enregistrée : ${path.relative(ROOT, dest)} (${(buf.length / 1e6).toFixed(1)} Mo)`)
  return dest
}

/** Retourne une Map nomDeFichier -> Buffer, en ouvrant les ZIP imbriqués. */
function collectFiles(source) {
  const files = new Map()
  const addZip = (buf, label) => {
    let zip
    try {
      zip = new AdmZip(buf)
    } catch (err) {
      throw new Error(`archive illisible (${label}) : ${err.message}`)
    }
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue
      const name = path.basename(entry.entryName)
      const data = entry.getData()
      if (/\.zip$/i.test(name)) addZip(data, name)
      else files.set(name, data)
    }
  }
  const walk = (p) => {
    const stat = fs.statSync(p)
    if (stat.isDirectory()) return fs.readdirSync(p).forEach((f) => walk(path.join(p, f)))
    if (/\.zip$/i.test(p)) return addZip(fs.readFileSync(p), path.basename(p))
    files.set(path.basename(p), fs.readFileSync(p))
  }
  walk(source)
  return files
}

async function getSourceFiles() {
  if (args.from) {
    const p = path.resolve(process.cwd(), args.from)
    if (!fs.existsSync(p)) throw new Error(`--from : ${p} introuvable`)
    console.log(`✔ Source locale : ${p}`)
    return { files: collectFiles(p), origin: p }
  }
  if (!args.refresh && fs.existsSync(CACHE_ZIP)) {
    console.log(`✔ Archive déjà téléchargée : ${path.relative(ROOT, CACHE_ZIP)} (--refresh pour la renouveler)`)
    return { files: collectFiles(CACHE_ZIP), origin: CACHE_ZIP }
  }
  const url = await resolveCsvUrl()
  try {
    await download(url, CACHE_ZIP)
  } catch (err) {
    throw new Error(
      `Téléchargement impossible : ${err.message}\n\n` +
        `Solution : téléchargez manuellement « Toutes les données du ROME » (format CSV) sur\n` +
        `  ${DATAGOUV_DATASET_PAGE}\n` +
        `puis relancez : node scripts/import-rome.js --from=chemin/vers/le/fichier.zip`,
    )
  }
  return { files: collectFiles(CACHE_ZIP), origin: url }
}

// ---------------------------------------------------------------------------
// Étape 2 : lecture tolérante des CSV
// ---------------------------------------------------------------------------
const normalize = (s) =>
  String(s ?? '')
    .replace(/^﻿/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

function decode(buf) {
  const utf8 = buf.toString('utf8')
  // Si l'UTF-8 est invalide (caractères de remplacement), on retombe sur latin1.
  return utf8.includes('�') ? buf.toString('latin1') : utf8
}

function detectDelimiter(text) {
  const header = text.split(/\r?\n/, 1)[0]
  const candidates = [';', ',', '\t', '|']
  return candidates.reduce((best, c) => (header.split(c).length > header.split(best).length ? c : best), ';')
}

/** Trouve un fichier CSV par son nom logique (ex. « referentiel_code_rome »), quel que soit le n° de version. */
function findTable(files, logicalName) {
  const re = new RegExp(`^(unix_)?${logicalName}(_v\\d+)?(_utf8)?\\.csv$`, 'i')
  const re2 = new RegExp(`^(unix_)?${logicalName}_v\\d+.*\\.csv$`, 'i')
  for (const name of files.keys()) if (re.test(name) || re2.test(name)) return name
  return null
}

const usedTables = []
function readTable(files, logicalName, { required = false } = {}) {
  const name = findTable(files, logicalName)
  if (!name) {
    if (required) throw new Error(`Fichier obligatoire introuvable : ${logicalName}*.csv`)
    console.warn(`⚠ Fichier absent : ${logicalName}*.csv (données ignorées)`)
    return []
  }
  const text = decode(files.get(name))
  const rows = parse(text, {
    delimiter: detectDelimiter(text),
    columns: (header) => header.map(normalize),
    bom: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  })
  usedTables.push(`${name} (${rows.length} lignes)`)
  return rows
}

/** Lit la première colonne existante parmi plusieurs noms possibles. */
const get = (row, ...keys) => {
  for (const k of keys) {
    const v = row[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}
const isTruthy = (v) => /^(1|o|oui|y|yes|true|vrai|x|principal|principale|coeur.*)$/i.test(String(v ?? '').trim())
const pushUnique = (arr, v) => {
  if (v && !arr.includes(v)) arr.push(v)
}
const groupBy = (rows, keyFn) => {
  const m = new Map()
  for (const r of rows) {
    const k = keyFn(r)
    if (!k) continue
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(r)
  }
  return m
}

// ---------------------------------------------------------------------------
// Étape 3 : construction des fiches
// ---------------------------------------------------------------------------
function build(files) {
  // --- Fiches ROME (obligatoire)
  const codes = readTable(files, 'referentiel_code_rome', { required: true })
  const fiches = new Map()
  for (const r of codes) {
    const code = get(r, 'code_rome').toUpperCase()
    if (!CODE_ROME_RE.test(code) || fiches.has(code)) continue
    fiches.set(code, {
      code_rome: code,
      intitule: get(r, 'libelle_rome', 'libelle', 'intitule'),
      code_ogr: get(r, 'code_ogr') || null,
      domaine_professionnel: null,
      appellations: [],
      definition: null,
      acces_metier: null,
      activites_rome: [],
      competences_rome: { savoir_etre_professionnels: [], savoirs: [] },
      contextes_travail_rome: [],
      centres_interet_rome: [],
      secteurs_activite_rome: [],
      emploi_reglemente: isTruthy(get(r, 'emploi_reglemente')),
      emploi_cadre: isTruthy(get(r, 'emploi_cadre')),
      transition_eco: isTruthy(get(r, 'transition_eco')),
      transition_num: isTruthy(get(r, 'transition_num')),
      lien_metierscope: METIERSCOPE_URL(code),
      source: SOURCE_LABEL,
      date_import: null,
    })
  }
  const fiche = (code) => fiches.get(String(code || '').trim().toUpperCase())

  // --- Arborescence principale : grand domaine / domaine professionnel
  for (const r of readTable(files, 'cr_gd_dp')) {
    const f = fiche(get(r, 'code_rome'))
    if (!f) continue
    f.domaine_professionnel = {
      code_grand_domaine: get(r, 'code_grand_domaine') || null,
      grand_domaine: get(r, 'libelle_grand_domaine') || null,
      code_domaine: get(r, 'code_domaine_professionel', 'code_domaine_professionnel') || null,
      domaine: get(r, 'libelle_domaine_professionnel', 'libelle_domaine_professionel') || null,
    }
  }

  // --- Appellations (synonymes)
  let nbAppellations = 0
  for (const r of readTable(files, 'referentiel_appellation', { required: true })) {
    const f = fiche(get(r, 'code_rome'))
    const lib = get(r, 'libelle_appellation_long', 'libelle_appellation', 'libelle', 'libelle_appellation_court')
    if (!f || !lib || f.appellations.includes(lib)) continue
    f.appellations.push(lib)
    nbAppellations++
  }

  // --- Textes : définition et accès au métier
  const textes = groupBy(readTable(files, 'texte'), (r) => get(r, 'code_rome').toUpperCase())
  for (const [code, rows] of textes) {
    const f = fiche(code)
    if (!f) continue
    const byType = groupBy(rows, (r) => normalize(get(r, 'libelle_type_texte', 'type_texte')))
    const join = (rs) =>
      rs
        .sort((a, b) => Number(get(a, 'position_phrase') || 0) - Number(get(b, 'position_phrase') || 0))
        .map((r) => get(r, 'libelle_texte', 'texte'))
        .filter(Boolean)
        .join('\n')
    for (const [type, rs] of byType) {
      if (type.includes('definition')) f.definition = join(rs) || null
      else if (type.includes('acces')) f.acces_metier = join(rs) || null
    }
  }

  // --- Référentiels d'items (code_ogr -> nature + libellé)
  const items = new Map()
  for (const r of readTable(files, 'referentiel_competence')) {
    const nature = normalize(get(r, 'nature', 'libelle_nature'))
    items.set(get(r, 'code_ogr'), {
      kind: nature.includes('etre') ? 'savoir_etre' : 'savoir_faire',
      libelle: get(r, 'libelle_competence', 'libelle'),
    })
  }
  for (const r of readTable(files, 'referentiel_savoir')) {
    items.set(get(r, 'code_ogr_savoir', 'code_ogr'), {
      kind: 'savoir',
      libelle: get(r, 'libelle_savoir', 'libelle'),
    })
  }
  for (const r of readTable(files, 'referentiel_contexte_travail')) {
    items.set(get(r, 'code_ogr'), {
      kind: 'contexte',
      libelle: get(r, 'libelle_cont_travail', 'libelle'),
      type: get(r, 'libelle_type_cont_trav', 'type_contexte') || null,
    })
  }
  // Repli : item générique + bloc de composition (ex. « Savoir-faire », « Contextes de travail »)
  const blocs = new Map(readTable(files, 'composition_bloc').map((r) => [get(r, 'code_compo_bloc'), normalize(get(r, 'libelle_bloc'))]))
  const rubriques = new Map(
    readTable(files, 'descriptif_rubrique').map((r) => [
      get(r, 'code_rubrique'),
      { bloc: blocs.get(get(r, 'code_compo_bloc')) || '', libelle: get(r, 'libelle_rubrique') },
    ]),
  )
  const kindFromBloc = (bloc) =>
    bloc.includes('etre') ? 'savoir_etre'
    : bloc.includes('faire') ? 'savoir_faire'
    : bloc.includes('contexte') ? 'contexte'
    : bloc.includes('savoir') ? 'savoir'
    : null
  for (const r of readTable(files, 'item')) {
    const code = get(r, 'code_ogr')
    if (items.has(code)) continue
    const rub = rubriques.get(get(r, 'code_rubrique'))
    const kind = rub && kindFromBloc(rub.bloc)
    if (kind) items.set(code, { kind, libelle: get(r, 'libelle'), type: rub.libelle || null })
  }

  // --- Liens fiche <-> items (cohérence + liens référentiels)
  const links = new Map() // code_rome -> Map(code_ogr -> {coeur})
  const addLink = (codeRome, codeOgr, coeur) => {
    const f = fiche(codeRome)
    if (!f || !codeOgr) return
    if (!links.has(f.code_rome)) links.set(f.code_rome, new Map())
    const m = links.get(f.code_rome)
    m.set(codeOgr, { coeur: coeur || m.get(codeOgr)?.coeur || false })
  }
  for (const r of readTable(files, 'coherence_item')) addLink(get(r, 'code_rome'), get(r, 'code_ogr'), isTruthy(get(r, 'coeur_metier')))
  for (const r of readTable(files, 'liens_rome_referentiels')) addLink(get(r, 'code_rome'), get(r, 'code_ogr'), false)

  for (const [code, m] of links) {
    const f = fiches.get(code)
    const principales = []
    const autres = []
    for (const [codeOgr, { coeur }] of m) {
      const it = items.get(codeOgr)
      if (!it?.libelle) continue
      if (it.kind === 'savoir_faire') pushUnique(coeur ? principales : autres, it.libelle)
      else if (it.kind === 'savoir_etre') pushUnique(f.competences_rome.savoir_etre_professionnels, it.libelle)
      else if (it.kind === 'savoir') pushUnique(f.competences_rome.savoirs, it.libelle)
      else if (it.kind === 'contexte' && !f.contextes_travail_rome.some((c) => c.libelle === it.libelle))
        f.contextes_travail_rome.push({ type: it.type || null, libelle: it.libelle })
    }
    // Activités : savoir-faire « cœur de métier » en premier
    f.activites_rome = [...principales, ...autres.filter((a) => !principales.includes(a))]
  }

  // --- Centres d'intérêt et secteurs d'activité officiels (utiles à l'enrichissement)
  for (const r of readTable(files, 'arborescence_centre_interet')) {
    const f = fiche(get(r, 'code_rome'))
    if (f) pushUnique(f.centres_interet_rome, get(r, 'libelle_centre_interet'))
  }
  for (const r of readTable(files, 'arborescence_secteur_activite')) {
    const f = fiche(get(r, 'code_rome'))
    if (!f) continue
    const lib = [get(r, 'libelle_sect_activite'), get(r, 'libelle_ss_sect_activite')].filter(Boolean).join(' > ')
    pushUnique(f.secteurs_activite_rome, lib)
  }

  return { fiches: [...fiches.values()], nbAppellations }
}

function readVersion(files) {
  const name = [...files.keys()].find((n) => /version.*\.txt$/i.test(n))
  if (!name) return null
  const text = decode(files.get(name)).trim()
  // On garde l'en-tête (numéro, dates, titre) et pas la longue description.
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const header = lines.filter((l) => !/^description\b/i.test(l)).slice(0, 4)
  return header.join(' | ') || null
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('== Import ROME 4.0 (France Travail, Open Data) ==')
  const { files, origin } = await getSourceFiles()
  const csvCount = [...files.keys()].filter((n) => /\.csv$/i.test(n)).length
  console.log(`✔ ${files.size} fichiers trouvés dont ${csvCount} CSV`)
  if (!csvCount) throw new Error('aucun fichier CSV dans la source fournie')

  const { fiches, nbAppellations } = build(files)
  const dateImport = new Date().toISOString()
  for (const f of fiches) f.date_import = dateImport
  fiches.sort((a, b) => a.code_rome.localeCompare(b.code_rome))

  const stats = {
    nb_fiches: fiches.length,
    nb_appellations: nbAppellations,
    fiches_avec_definition: fiches.filter((f) => f.definition).length,
    fiches_avec_activites: fiches.filter((f) => f.activites_rome.length).length,
    fiches_avec_competences: fiches.filter(
      (f) => f.competences_rome.savoir_etre_professionnels.length || f.competences_rome.savoirs.length,
    ).length,
    fiches_avec_contextes: fiches.filter((f) => f.contextes_travail_rome.length).length,
  }
  const output = {
    meta: {
      source: SOURCE_LABEL,
      version_rome: readVersion(files),
      origine: origin,
      jeu_de_donnees: DATAGOUV_DATASET_PAGE,
      licence: 'Licence Ouverte / Open Licence (Etalab)',
      date_import: dateImport,
      fichiers_utilises: usedTables,
      ...stats,
    },
    fiches,
  }
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2))

  console.log('\n== Résultat ==')
  console.log(`Fiches métiers importées       : ${stats.nb_fiches}`)
  console.log(`Appellations importées         : ${stats.nb_appellations}`)
  console.log(`Fiches avec définition         : ${stats.fiches_avec_definition}`)
  console.log(`Fiches avec activités          : ${stats.fiches_avec_activites}`)
  console.log(`Fiches avec compétences        : ${stats.fiches_avec_competences}`)
  console.log(`Fiches avec contextes travail  : ${stats.fiches_avec_contextes}`)
  console.log(`Version ROME                   : ${output.meta.version_rome ?? 'inconnue'}`)
  console.log(`→ ${path.relative(ROOT, OUT_FILE)}`)
}

main().catch((err) => {
  console.error(`\n✖ ${err.message}`)
  process.exit(1)
})
