#!/usr/bin/env node
/**
 * Enrichit public/data/metiers.json avec les indicateurs officiels du marché de l'emploi
 * (enquête Besoins en Main-d'Œuvre de France Travail, Open Data). Aucun appel à une IA.
 *
 * Usage :
 *   node scripts/enrichir-marche.mjs [--bmo=fichier.xlsx|URL] [--correspondance=fichier.csv|URL]
 *                                    [--out=public/data/metiers.json] [--dry-run]
 *
 * 1. BMO : sans --bmo, le fichier le plus récent est recherché sur data.gouv.fr
 *    (jeu « enquete-besoins-en-main-doeuvre-bmo »), puis sur francetravail.org.
 * 2. Les métiers BMO sont codés en familles professionnelles (FAP), pas en codes ROME :
 *    une table de correspondance « code métier BMO / FAP → code ROME » est nécessaire
 *    (par défaut data/correspondances/bmo_rome.csv, colonnes détectées automatiquement).
 * 3. Chaque fiche reçoit un bloc « marche_emploi ». Les blocs officiel_rome et enrichi_ia
 *    ne sont jamais modifiés. Sans correspondance, niveau_tension = "inconnue".
 *
 * Niveau de tension : déduit de la part des projets jugés difficiles par les employeurs (BMO).
 * Seuils (modifiables ci-dessous) : forte ≥ 65 %, concurrentielle < 45 %, équilibrée entre les deux.
 */
import fs from 'node:fs'
import path from 'node:path'
import ExcelJS from 'exceljs'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=')
    return [k, v.length ? v.join('=') : true]
  }),
)
const OUT = args.out || 'public/data/metiers.json'
const CORRESPONDANCE = args.correspondance || process.env.CORRESPONDANCE || 'data/correspondances/bmo_rome.csv'
const BMO = args.bmo || process.env.BMO || null
const RAW_DIR = 'data/raw/bmo'
const SEUIL_FORTE = 0.65
const SEUIL_CONCURRENTIELLE = 0.45
const DATASET = 'enquete-besoins-en-main-doeuvre-bmo'
const FALLBACK_URLS = (year) => [
  `https://www.francetravail.org/files/live/sites/peorg/files/documents/Statistiques-et-analyses/Open-data/BMO/Base-open-data-BMO-${year}.xlsx`,
  `https://www.francetravail.org/files/live/sites/peorg/files/documents/Statistiques-et-analyses/Open-data/BMO/Base_open_data_BMO_${year}.xlsx`,
]

const log = (...a) => console.log(...a)
const fail = (msg) => {
  console.error(`\n❌ ${msg}`)
  process.exit(1)
}
const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

// ---------------------------------------------------------------------------
// Téléchargements
// ---------------------------------------------------------------------------
async function download(url, dest) {
  const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'core-explore-data-pipeline' } })
  if (!r.ok) throw new Error(`HTTP ${r.status} pour ${url}`)
  const buf = Buffer.from(await r.arrayBuffer())
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, buf)
  return dest
}

/** Cherche le fichier BMO le plus récent ; renvoie { file, annee, url }. */
async function findBmo() {
  if (BMO && !/^https?:/.test(BMO)) return { file: BMO, annee: yearOf(BMO), url: null }
  const candidates = []
  if (BMO) candidates.push({ url: BMO, annee: yearOf(BMO) })
  else {
    try {
      const r = await fetch(`https://www.data.gouv.fr/api/1/datasets/${DATASET}/`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const ds = await r.json()
      const xlsx = (ds.resources || [])
        .filter((res) => /xlsx?$/i.test(res.format || res.url || '') && (res.filesize ?? 1e6) > 100_000)
        .map((res) => ({ url: res.url, annee: yearOf(`${res.title} ${res.url}`), date: res.last_modified || '' }))
        .sort((a, b) => (b.annee || 0) - (a.annee || 0) || (a.date < b.date ? 1 : -1))
      log(`data.gouv.fr : ${xlsx.length} fichier(s) xlsx candidats.`)
      candidates.push(...xlsx)
    } catch (e) {
      log(`data.gouv.fr indisponible (${e.message}) : on essaie francetravail.org.`)
    }
    const y = new Date().getFullYear() + 1
    for (let year = y; year >= y - 3; year--) for (const url of FALLBACK_URLS(year)) candidates.push({ url, annee: year })
  }
  for (const c of candidates) {
    try {
      const file = await download(c.url, path.join(RAW_DIR, `bmo-${c.annee || 'inconnu'}.xlsx`))
      log(`BMO téléchargé : ${c.url}`)
      return { file, annee: c.annee, url: c.url }
    } catch (e) {
      log(`  ✗ ${e.message}`)
    }
  }
  fail("Aucun fichier BMO n'a pu être téléchargé. Passez --bmo=<fichier ou URL> (voir l'onglet Actions).")
}

function yearOf(s) {
  const m = String(s).match(/20\d\d/g)
  return m ? Number(m.at(-1)) : null
}

// ---------------------------------------------------------------------------
// Lecture du fichier BMO (colonnes détectées par leur nom)
// ---------------------------------------------------------------------------
const COLS = {
  code: (h) => /code.*(metier|fap)|^(fap|metier_?bmo|code_?bmo)$|^code_?metier/.test(h),
  libelle: (h) => /(nom|lib|lbl).*(metier)|^metier$|libelle/.test(h) && !/famille|fam_/.test(h),
  projets: (h) => h === 'met' || /projets?_?(de_?)?recrut/.test(h),
  difficiles: (h) => h === 'xmet' || /difficil/.test(h),
  annee: (h) => h === 'annee' || h === 'année',
}

async function readBmo(file) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(file)
  // La feuille de données est la plus grande.
  const sheet = [...wb.worksheets].sort((a, b) => b.rowCount - a.rowCount)[0]
  let headerRow = null
  let idx = null
  for (let r = 1; r <= Math.min(20, sheet.rowCount); r++) {
    const values = sheet.getRow(r).values.map((v) => norm(v?.result ?? v?.text ?? v))
    const found = Object.fromEntries(Object.entries(COLS).map(([k, test]) => [k, values.findIndex((h) => h && test(h))]))
    if (found.code > 0 && found.projets > 0) {
      headerRow = r
      idx = found
      log(`Feuille « ${sheet.name} », en-têtes ligne ${r} : ${values.filter(Boolean).join(' | ')}`)
      break
    }
  }
  if (!headerRow) {
    for (let r = 1; r <= 5; r++) log(`  ligne ${r} :`, sheet.getRow(r).values.slice(1, 15).join(' | '))
    fail('Colonnes BMO introuvables (code métier, projets « met »). Les premières lignes sont affichées ci-dessus.')
  }
  log(`Colonnes retenues : ${Object.entries(idx).map(([k, v]) => `${k}=${v > 0 ? v : '∅'}`).join(', ')}`)

  const num = (v) => {
    const x = typeof v === 'object' && v !== null ? (v.result ?? v.text) : v
    const n = Number(String(x ?? '').replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : null // « * » (secret statistique) → null
  }
  const parMetier = new Map() // code → { libelle, projets, difficiles, annee }
  sheet.eachRow((row, r) => {
    if (r <= headerRow) return
    const v = row.values
    const code = String(v[idx.code] ?? '').trim().toUpperCase()
    if (!code) return
    const e = parMetier.get(code) || { libelle: v[idx.libelle] || '', projets: 0, difficiles: 0, lignes: 0 }
    const p = num(v[idx.projets])
    const d = idx.difficiles > 0 ? num(v[idx.difficiles]) : null
    if (p !== null) e.projets += p
    if (p !== null && d !== null) e.difficiles += d
    if (idx.annee > 0 && !e.annee) e.annee = num(v[idx.annee])
    e.lignes++
    parMetier.set(code, e)
  })
  const total = [...parMetier.values()].reduce((s, e) => s + e.projets, 0)
  // Ordre de grandeur attendu : environ 2 à 3 millions de projets en France ; bien plus indiquerait des sous-totaux comptés deux fois.
  log(`${parMetier.size} métiers BMO lus, ${Math.round(total).toLocaleString('fr-FR')} projets de recrutement au total.`)
  return parMetier
}

// ---------------------------------------------------------------------------
// Correspondance code métier BMO / FAP → code ROME
// ---------------------------------------------------------------------------
async function readCorrespondance(src) {
  let file = src
  if (/^https?:/.test(src)) file = await download(src, path.join(RAW_DIR, 'correspondance' + path.extname(new URL(src).pathname)))
  if (!fs.existsSync(file)) return null
  let rows
  if (/\.xlsx?$/i.test(file)) {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(file)
    const sheet = [...wb.worksheets].sort((a, b) => b.rowCount - a.rowCount)[0]
    rows = []
    sheet.eachRow((row) => rows.push(row.values.slice(1).map((x) => String(x?.result ?? x?.text ?? x ?? ''))))
  } else {
    const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '')
    const sep = (text.split('\n')[0].match(/[;,\t]/) || [','])[0]
    rows = text
      .split(/\r?\n/)
      .filter((l) => l.trim())
      .map((l) => l.split(sep).map((c) => c.replace(/^"|"$/g, '').trim()))
  }
  // Colonnes : la première dont les valeurs ressemblent à des codes ROME, et la colonne « fap / bmo / metier ».
  const isRome = (s) => /^[A-N]\d{4}$/.test(String(s).trim().toUpperCase())
  const header = rows[0].map(norm)
  const sample = rows.slice(1, 50)
  const romeCol = header.findIndex((_, i) => sample.filter((r) => isRome(r[i])).length > sample.length / 2)
  const codeCol = header.findIndex((h, i) => i !== romeCol && /fap|bmo|metier|code/.test(h))
  if (romeCol < 0 || codeCol < 0) fail(`Table de correspondance illisible (${file}) : colonnes ROME / code métier introuvables.`)
  log(`Correspondance : ${file} (colonnes « ${rows[0][codeCol]} » → « ${rows[0][romeCol]} »)`)
  const map = new Map() // ROME → Set(codes BMO)
  for (const r of rows.slice(1)) {
    const rome = String(r[romeCol] || '').trim().toUpperCase()
    const code = String(r[codeCol] || '').trim().toUpperCase()
    if (!isRome(rome) || !code) continue
    if (!map.has(rome)) map.set(rome, new Set())
    map.get(rome).add(code)
  }
  log(`${map.size} codes ROME présents dans la correspondance.`)
  return map
}

// ---------------------------------------------------------------------------
// Calcul du bloc marche_emploi
// ---------------------------------------------------------------------------
function niveau(part) {
  if (part === null) return 'inconnue'
  if (part >= SEUIL_FORTE) return 'forte'
  if (part < SEUIL_CONCURRENTIELLE) return 'concurrentielle'
  return 'equilibree'
}

function bloc(codes, bmo, annee, source) {
  const found = [...(codes || [])].map((c) => [c, bmo.get(c)]).filter(([, e]) => e)
  if (!found.length) return { niveau_tension: 'inconnue', projets_recrutement: null, part_difficultes_recrutement: null, source, annee }
  const projets = found.reduce((s, [, e]) => s + e.projets, 0)
  const difficiles = found.reduce((s, [, e]) => s + e.difficiles, 0)
  const part = projets > 0 ? difficiles / projets : null
  return {
    niveau_tension: niveau(part),
    projets_recrutement: projets > 0 ? Math.round(projets) : null,
    part_difficultes_recrutement: part === null ? null : Math.round(part * 100),
    // Les chiffres BMO portent sur une famille de métiers, pas sur la seule fiche ROME.
    perimetre: found.map(([c, e]) => `${c} ${String(e.libelle).trim()}`.trim()),
    source,
    annee,
  }
}

// ---------------------------------------------------------------------------
async function main() {
  if (!fs.existsSync(OUT)) fail(`${OUT} introuvable : lancez d'abord l'import et l'enrichissement.`)
  const correspondance = await readCorrespondance(CORRESPONDANCE).catch((e) => fail(`Correspondance : ${e.message}`))
  const { file, annee: anneeFichier, url } = await findBmo()
  const bmo = await readBmo(file)
  const annee = [...bmo.values()].find((e) => e.annee)?.annee || anneeFichier
  const source = `France Travail – enquête Besoins en Main-d'Œuvre (BMO) ${annee ?? ''}`.trim()

  if (!correspondance) {
    log(`\nExemples de codes métier BMO : ${[...bmo.keys()].slice(0, 15).join(', ')}`)
    fail(
      `Table de correspondance absente (${CORRESPONDANCE}). Les métiers BMO sont codés en familles professionnelles, ` +
        `pas en codes ROME : ajoutez un fichier CSV (colonnes « code_bmo » et « code_rome ») ou passez son URL ` +
        `dans le champ « correspondance » du workflow.`,
    )
  }

  const data = JSON.parse(fs.readFileSync(OUT, 'utf8'))
  const stats = { forte: 0, equilibree: 0, concurrentielle: 0, inconnue: 0 }
  for (const m of data.metiers) {
    m.marche_emploi = bloc(correspondance.get(m.code_rome), bmo, annee, source)
    stats[m.marche_emploi.niveau_tension]++
  }
  data.meta.marche_emploi = {
    source,
    annee,
    url_source: url,
    date_mise_a_jour: new Date().toISOString(),
    seuils: { forte: SEUIL_FORTE, concurrentielle: SEUIL_CONCURRENTIELLE },
    methode:
      "Niveau de tension déduit de la part des projets de recrutement jugés difficiles par les employeurs (BMO), " +
      'agrégée sur les familles de métiers BMO correspondant à chaque code ROME.',
  }
  log(`\nRésultat : ${Object.entries(stats).map(([k, v]) => `${k} ${v}`).join(' · ')} (sur ${data.metiers.length} métiers)`)
  if (args['dry-run']) return log('--dry-run : aucun fichier modifié.')
  const tmp = `${OUT}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, OUT)
  log(`${OUT} mis à jour.`)
}

main().catch((e) => fail(e.stack || e.message))
