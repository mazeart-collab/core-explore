#!/usr/bin/env node
/**
 * Script 2 : enrichissement hors-ligne des fiches ROME avec l'API Anthropic.
 *
 * Lit data/rome_base.json + data/taxonomies.json, demande au modèle d'associer
 * chaque métier aux taxonomies du projet, et écrit public/data/metiers.json.
 *
 * Traçabilité : chaque métier sépare `officiel_rome` (données France Travail,
 * non modifiées) et `enrichi_ia` (données générées, avec modèle et date).
 *
 * Reprise : chaque métier traité est ajouté immédiatement à
 * data/.enrich-progress.jsonl. Une relance ne retraite (et ne repaie) pas
 * les métiers déjà présents dans ce fichier.
 *
 * Usage :
 *   npm run data:enrich -- --limit=20         (test sur 20 métiers variés)
 *   npm run data:enrich                       (tous les métiers restants)
 *   npm run data:enrich -- --dry-run --limit=1  (affiche le prompt, sans appel API)
 *   npm run data:enrich -- --build-only       (régénère metiers.json depuis la progression)
 * Options : --concurrency=4  --model=claude-haiku-5-5  --input=data/rome_base.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
try {
  process.loadEnvFile(path.join(ROOT, '.env'))
} catch {
  // pas de fichier .env : on utilise les variables d'environnement existantes
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=')
    return [k, v.length ? v.join('=') : true]
  }),
)

const MODEL = args.model || process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5'
const INPUT = path.resolve(ROOT, args.input || 'data/rome_base.json')
const TAXO_FILE = path.join(ROOT, 'data/taxonomies.json')
const PROGRESS_FILE = path.join(ROOT, 'data/.enrich-progress.jsonl')
const OUTPUT = path.join(ROOT, 'public/data/metiers.json')
const LIMIT = args.limit ? Number(args.limit) : null
const CONCURRENCY = Math.max(1, Number(args.concurrency || 4))
const DRY_RUN = Boolean(args['dry-run'])
const BUILD_ONLY = Boolean(args['build-only'])
// Tarifs indicatifs ($ / million de tokens) pour l'estimation affichée en fin de run.
const PRICES = { 'claude-haiku-5-5': [0.1, 0.5], 'claude-haiku-4-5': [1, 5] }

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))

// ---------------------------------------------------------------------------
// Taxonomies -> listes d'identifiants autorisés + schéma JSON de sortie
// ---------------------------------------------------------------------------
const taxo = readJson(TAXO_FILE)
const T = {
  secteurs: taxo.univers_professionnels.univers,
  activites: taxo.activites.categories.flatMap((c) => c.activites.map((a) => ({ ...a, categorie: c.libelle }))),
  competences_categories: taxo.competences_categories,
  centres_interet: taxo.centres_interet,
  sens_causes: taxo.sens_causes,
  motivations: taxo.motivations,
}
const CRITERES = taxo.conditions_travail.criteres
const ids = (list) => list.map((x) => x.id)

const enumArray = (list, description) => ({
  type: 'array',
  description,
  items: { type: 'string', enum: ids(list) },
})

const conditionsSchema = {
  type: 'object',
  additionalProperties: false,
  required: CRITERES.map((c) => c.id),
  properties: Object.fromEntries(
    CRITERES.map((c) => {
      const opts = c.options.map((o) => o.id)
      const schema =
        c.type === 'choix_multiple'
          ? { anyOf: [{ type: 'array', items: { type: 'string', enum: opts } }, { type: 'string', enum: ['variable'] }, { type: 'null' }] }
          : { anyOf: [{ type: 'string', enum: [...opts, 'variable'] }, { type: 'null' }] }
      return [c.id, schema]
    }),
  ),
}

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'secteurs',
    'activites',
    'competences_categories',
    'centres_interet',
    'sens_causes',
    'motivations',
    'conditions_travail',
    'points_vigilance',
  ],
  properties: {
    secteurs: enumArray(T.secteurs, '1 à 3 univers professionnels, du plus pertinent au moins pertinent'),
    activites: enumArray(T.activites, '3 à 8 activités réellement exercées'),
    competences_categories: enumArray(T.competences_categories, '2 à 5 catégories de compétences clés'),
    centres_interet: enumArray(T.centres_interet, '1 à 5 centres d’intérêt'),
    sens_causes: enumArray(T.sens_causes, '0 à 3 causes auxquelles le métier contribue directement'),
    motivations: enumArray(T.motivations, '2 à 5 motivations que le métier satisfait typiquement'),
    conditions_travail: conditionsSchema,
    points_vigilance: {
      type: 'array',
      description: '2 à 3 points concrets à vérifier avant de s’engager',
      items: { type: 'string' },
    },
  },
}

// Bornes appliquées après coup (le schéma ne supporte pas minItems/maxItems).
const BOUNDS = {
  secteurs: [1, 3],
  activites: [1, 8],
  competences_categories: [1, 5],
  centres_interet: [1, 5],
  sens_causes: [0, 3],
  motivations: [1, 5],
}

function systemPrompt() {
  const list = (items, extra = () => '') => items.map((x) => `- ${x.id} : ${x.libelle}${extra(x)}`).join('\n')
  const crit = CRITERES.map((c) => {
    const opts = c.options.map((o) => `${o.id} (${o.libelle})`).join(' | ')
    return `- ${c.id} [${c.type === 'choix_multiple' ? 'liste' : 'une valeur'}] ${c.libelle} : ${opts}`
  }).join('\n')
  return `Tu es un conseiller en orientation professionnelle expert du marché du travail français.
Pour une fiche métier officielle du ROME 4.0 (France Travail), tu associes le métier aux référentiels du projet CORE Explore.

Règles :
- Utilise UNIQUEMENT les identifiants (id) listés ci-dessous.
- Appuie-toi d'abord sur les données officielles fournies (définition, activités, compétences, contextes de travail). N'invente pas de faits.
- Sois sélectif : ne retiens que ce qui caractérise vraiment le métier, pas ce qui est simplement possible.
- secteurs : 1 à 3 univers, le plus pertinent en premier.
- conditions_travail : pour chaque critère, choisis la valeur typique du métier. Mets "variable" quand cela dépend trop de l'employeur ou du poste, et null si tu ne peux pas raisonnablement l'estimer.
- points_vigilance : 2 à 3 points concrets et vérifiables à examiner avant de s'engager (contraintes physiques, horaires, diplôme réglementé, conditions d'accès, marché de l'emploi…), en français, une phrase courte chacun.

## Univers professionnels (secteurs)
${list(T.secteurs, (u) => ` [famille : ${u.famille}]`)}

## Activités
${list(T.activites, (a) => ` [${a.categorie}]`)}

## Catégories de compétences
${list(T.competences_categories)}

## Centres d'intérêt
${list(T.centres_interet)}

## Sens / causes
${list(T.sens_causes)}

## Motivations
${list(T.motivations)}

## Conditions de travail (valeurs possibles, en plus de "variable" et null)
${crit}`
}

function userPrompt(f) {
  const bullet = (arr, max) => (arr?.length ? arr.slice(0, max).map((x) => `- ${x}`).join('\n') : '(non disponible)')
  const ctx = (f.contextes_travail_rome || []).map((c) => (c.type ? `${c.type} : ${c.libelle}` : c.libelle))
  return `Fiche ROME ${f.code_rome} : ${f.intitule}
Domaine : ${[f.domaine_professionnel?.grand_domaine, f.domaine_professionnel?.domaine].filter(Boolean).join(' > ') || '(non disponible)'}
Emploi réglementé : ${f.emploi_reglemente ? 'oui' : 'non'}

Appellations :
${bullet(f.appellations, 15)}

Définition :
${f.definition || '(non disponible)'}

Accès au métier :
${f.acces_metier || '(non disponible)'}

Activités (savoir-faire) :
${bullet(f.activites_rome, 25)}

Savoir-être professionnels :
${bullet(f.competences_rome?.savoir_etre_professionnels, 10)}

Savoirs :
${bullet(f.competences_rome?.savoirs, 15)}

Contextes de travail :
${bullet(ctx, 20)}

Centres d'intérêt ROME : ${f.centres_interet_rome?.join(' ; ') || '(non disponible)'}
Secteurs d'activité ROME : ${f.secteurs_activite_rome?.join(' ; ') || '(non disponible)'}`
}

// ---------------------------------------------------------------------------
// Validation de la réponse
// ---------------------------------------------------------------------------
function sanitize(raw) {
  const out = {}
  const warnings = []
  for (const [key, list] of Object.entries(T)) {
    const allowed = new Set(ids(list))
    const values = [...new Set((raw[key] || []).filter((v) => allowed.has(v)))]
    const dropped = (raw[key] || []).length - values.length
    if (dropped) warnings.push(`${key} : ${dropped} valeur(s) hors taxonomie ignorée(s)`)
    const [min, max] = BOUNDS[key]
    if (values.length < min) warnings.push(`${key} : ${values.length} valeur(s), minimum attendu ${min}`)
    out[key] = values.slice(0, max)
  }
  out.conditions_travail = {}
  for (const c of CRITERES) {
    const opts = new Set(c.options.map((o) => o.id))
    let v = raw.conditions_travail?.[c.id]
    if (v === undefined) v = null
    if (c.type === 'choix_multiple' && Array.isArray(v)) v = [...new Set(v.filter((x) => opts.has(x)))]
    else if (v !== null && v !== 'variable' && !opts.has(v)) {
      warnings.push(`conditions_travail.${c.id} : valeur « ${v} » ignorée`)
      v = null
    }
    out.conditions_travail[c.id] = v
  }
  out.points_vigilance = (raw.points_vigilance || []).map((s) => String(s).trim()).filter(Boolean).slice(0, 3)
  return { data: out, warnings }
}

// ---------------------------------------------------------------------------
// Appel API
// ---------------------------------------------------------------------------
let client
const usage = { input: 0, output: 0, cache_read: 0, cache_write: 0 }

async function enrichOne(fiche, system) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    // Tâche de classification : effort bas pour limiter le coût.
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
    },
    // Le prompt système (taxonomies) est identique pour tous les métiers : mis en cache.
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt(fiche) }],
  })
  usage.input += response.usage.input_tokens || 0
  usage.output += response.usage.output_tokens || 0
  usage.cache_read += response.usage.cache_read_input_tokens || 0
  usage.cache_write += response.usage.cache_creation_input_tokens || 0

  if (response.stop_reason === 'refusal') throw new Error('refus du modèle')
  if (response.stop_reason === 'max_tokens') throw new Error('réponse tronquée (max_tokens)')
  const text = response.content.find((b) => b.type === 'text')?.text
  if (!text) throw new Error('réponse sans texte')
  const { data, warnings } = sanitize(JSON.parse(text))
  return {
    ...data,
    modele: response.model || MODEL,
    date_enrichissement: new Date().toISOString(),
    avertissements: warnings,
  }
}

// ---------------------------------------------------------------------------
// Progression / reprise
// ---------------------------------------------------------------------------
function loadProgress() {
  const done = new Map()
  if (!fs.existsSync(PROGRESS_FILE)) return done
  for (const line of fs.readFileSync(PROGRESS_FILE, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try {
      const entry = JSON.parse(line)
      if (entry.code_rome && entry.enrichi_ia) done.set(entry.code_rome, entry.enrichi_ia)
    } catch {
      // ligne incomplète (interruption pendant l'écriture) : ignorée, le métier sera retraité
    }
  }
  return done
}

/** Sélection « variée » : alterne entre les grands domaines (lettre du code ROME). */
function pickVaried(fiches, n) {
  const groups = new Map()
  for (const f of fiches) {
    const k = f.code_rome[0]
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(f)
  }
  // Dans chaque domaine, on répartit les choix sur toute la liste plutôt que de prendre les premiers.
  const queues = [...groups.values()].map((g) => {
    const step = Math.max(1, Math.floor(g.length / Math.ceil(n / groups.size)))
    const ordered = []
    for (let s = 0; s < step; s++) for (let i = s; i < g.length; i += step) ordered.push(g[i])
    return ordered
  })
  const picked = []
  while (picked.length < n && queues.some((q) => q.length)) {
    for (const q of queues) if (q.length && picked.length < n) picked.push(q.shift())
  }
  return picked
}

function writeOutput(base, done) {
  const metiers = base.fiches
    .filter((f) => done.has(f.code_rome))
    .map((f) => ({
      code_rome: f.code_rome,
      intitule: f.intitule,
      officiel_rome: f,
      enrichi_ia: done.get(f.code_rome),
    }))
  const output = {
    meta: {
      source_officielle: base.meta?.source,
      version_rome: base.meta?.version_rome ?? null,
      date_import_rome: base.meta?.date_import ?? null,
      date_generation: new Date().toISOString(),
      nb_metiers: metiers.length,
      nb_fiches_rome: base.fiches.length,
      complet: metiers.length === base.fiches.length,
      avertissement:
        "Les champs « enrichi_ia » sont générés automatiquement par un modèle d'IA à partir des données officielles et peuvent contenir des approximations. Les champs « officiel_rome » proviennent du ROME 4.0 (France Travail).",
    },
    metiers,
  }
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true })
  const tmp = `${OUTPUT}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(output, null, 2))
  fs.renameSync(tmp, OUTPUT)
  return metiers.length
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!fs.existsSync(INPUT)) throw new Error(`${path.relative(ROOT, INPUT)} introuvable : lancez d'abord « npm run data:import ».`)
  const base = readJson(INPUT)
  const done = loadProgress()

  if (BUILD_ONLY) {
    const n = writeOutput(base, done)
    console.log(`✔ ${path.relative(ROOT, OUTPUT)} régénéré (${n} métiers)`)
    return
  }

  const pending = base.fiches.filter((f) => !done.has(f.code_rome))
  const todo = LIMIT ? pickVaried(pending, LIMIT) : pending
  console.log('== Enrichissement des métiers ==')
  console.log(`Modèle : ${MODEL}`)
  console.log(`Fiches : ${base.fiches.length} | déjà enrichies : ${done.size} | à traiter maintenant : ${todo.length}`)

  const system = systemPrompt()
  if (DRY_RUN) {
    console.log('\n--- PROMPT SYSTÈME ---\n' + system)
    for (const f of todo.slice(0, 3)) console.log(`\n--- MESSAGE (${f.code_rome}) ---\n` + userPrompt(f))
    console.log('\n(--dry-run : aucun appel API)')
    return
  }
  if (!todo.length) {
    writeOutput(base, done)
    console.log('Rien à faire : tous les métiers sélectionnés sont déjà enrichis.')
    return
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY manquante : copiez .env.example en .env et renseignez votre clé.')
  }
  client = new Anthropic({ maxRetries: 4 })

  let ok = 0
  let failed = 0
  let stop = false
  process.on('SIGINT', () => {
    if (stop) process.exit(130)
    stop = true
    console.log('\n⏸ Interruption demandée : fin des requêtes en cours puis sauvegarde (Ctrl+C à nouveau pour forcer).')
  })

  const queue = [...todo]
  const worker = async () => {
    while (queue.length && !stop) {
      const f = queue.shift()
      try {
        const enrichi = await enrichOne(f, system)
        done.set(f.code_rome, enrichi)
        fs.appendFileSync(PROGRESS_FILE, JSON.stringify({ code_rome: f.code_rome, enrichi_ia: enrichi }) + '\n')
        ok++
        const warn = enrichi.avertissements.length ? ` ⚠ ${enrichi.avertissements.join(' ; ')}` : ''
        console.log(`✔ [${done.size}/${base.fiches.length}] ${f.code_rome} ${f.intitule} → ${enrichi.secteurs.join(', ')}${warn}`)
      } catch (err) {
        failed++
        console.error(`✖ ${f.code_rome} ${f.intitule} : ${err.message}`)
        if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
          stop = true
          console.error('Arrêt : clé API invalide ou sans accès au modèle.')
        } else if (err instanceof Anthropic.NotFoundError) {
          stop = true
          console.error(`Arrêt : modèle « ${MODEL} » introuvable (essayez --model=claude-haiku-4-5).`)
        }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker))

  const n = writeOutput(base, done)
  console.log('\n== Résultat ==')
  console.log(`Enrichis pendant ce run : ${ok} | échecs : ${failed} (seront retentés au prochain lancement)`)
  console.log(`Total enrichi : ${done.size}/${base.fiches.length}`)
  console.log(
    `Tokens : entrée ${usage.input} | sortie ${usage.output} | lecture cache ${usage.cache_read} | écriture cache ${usage.cache_write}`,
  )
  const price = PRICES[MODEL]
  if (price) {
    const cost =
      (usage.input * price[0] + usage.cache_write * price[0] * 1.25 + usage.cache_read * price[0] * 0.1 + usage.output * price[1]) / 1e6
    console.log(`Coût estimé de ce run : ~${cost.toFixed(3)} $`)
  }
  console.log(`→ ${path.relative(ROOT, OUTPUT)} (${n} métiers)`)
}

main().catch((err) => {
  console.error(`\n✖ ${err.message}`)
  process.exit(1)
})
