#!/usr/bin/env node
/**
 * Script 4 : notation des liens métier ↔ centres d'intérêt, contributions et motivations.
 *
 * Pourquoi : les étiquettes de `enrichi_ia` sont « présent / absent » : « psychologie » peut figurer sur un
 * métier sans en être la nature (ex. responsable de station de lavage). Ce script demande au modèle de NOTER
 * chaque lien de 1 à 3 (3 = au cœur du métier, 2 = net mais secondaire, 1 = accessoire ; absent = aucun lien),
 * à partir des seules données officielles du ROME. Le moteur s'appuie ensuite sur ces notes.
 *
 * Écrit `enrichi_ia.liens` = { interets: {id: note}, sens: {...}, motivations: {...}, modele, date } dans
 * public/data/metiers.json ; les autres champs ne sont pas modifiés.
 *
 * Reprise : chaque métier noté est ajouté aussitôt à data/.liens-progress.jsonl ; une relance ne repaie pas
 * les métiers déjà notés.
 *
 * Usage :
 *   npm run data:liens -- --limit=20          (essai sur 20 métiers variés)
 *   npm run data:liens                        (tous les métiers restants)
 *   npm run data:liens -- --dry-run --limit=1 (affiche le prompt, sans appel API)
 *   npm run data:liens -- --build-only        (réapplique la progression à metiers.json)
 * Options : --concurrency=4  --model=claude-haiku-5-5
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
try {
  process.loadEnvFile(path.join(ROOT, '.env'))
} catch {
  // pas de fichier .env : variables d'environnement existantes
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=')
    return [k, v.length ? v.join('=') : true]
  }),
)

const MODEL = args.model || process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5'
const DATA_FILE = path.join(ROOT, 'public/data/metiers.json')
const TAXO_FILE = path.join(ROOT, 'data/taxonomies.json')
const PROGRESS_FILE = path.join(ROOT, 'data/.liens-progress.jsonl')
const LIMIT = args.limit ? Number(args.limit) : null
const CONCURRENCY = Math.max(1, Number(args.concurrency || 4))
const DRY_RUN = Boolean(args['dry-run'])
const BUILD_ONLY = Boolean(args['build-only'])
const PRICES = { 'claude-haiku-5-5': [0.1, 0.5], 'claude-haiku-4-5': [1, 5] }

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const taxo = readJson(TAXO_FILE)
const T = { interets: taxo.centres_interet, sens: taxo.sens_causes, motivations: taxo.motivations }
const MAX = { interets: 4, sens: 3, motivations: 5 }

const listeSchema = (list, description) => ({
  type: 'array',
  description,
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'note'],
    properties: { id: { type: 'string', enum: list.map((x) => x.id) }, note: { type: 'integer', enum: [1, 2, 3] } },
  },
})
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['interets', 'sens', 'motivations'],
  properties: {
    interets: listeSchema(T.interets, `0 à ${MAX.interets} centres d'intérêt réellement liés au métier`),
    sens: listeSchema(T.sens, `0 à ${MAX.sens} causes auxquelles le métier contribue directement`),
    motivations: listeSchema(T.motivations, `0 à ${MAX.motivations} motivations que le métier satisfait typiquement`),
  },
}

function systemPrompt() {
  const list = (items) => items.map((x) => `- ${x.id} : ${x.libelle}${x.description ? ` (${x.description})` : ''}`).join('\n')
  return `Tu es un conseiller en orientation professionnelle expert du marché du travail français.
À partir d'une fiche métier officielle du ROME 4.0, tu notes le lien entre ce métier et des centres d'intérêt, des causes et des motivations.

Échelle (note UNIQUEMENT les liens qui existent ; n'inscris rien si le lien est inexistant) :
- 3 : au cœur du métier. Une personne passionnée par ce thème s'y retrouverait presque sûrement dans le quotidien du métier. Réserve cette note à 1 ou 2 éléments par catégorie au plus.
- 2 : lien net mais secondaire (une partie du quotidien, un public ou un contexte fréquent).
- 1 : lien accessoire ou occasionnel.

Règles :
- Appuie-toi sur les activités, la définition et les contextes de travail fournis. N'invente pas.
- Un thème simplement présent « dans le secteur » ou « possible chez certains employeurs » vaut 1 au mieux, ou rien.
- Ne note pas un centre d'intérêt parce que le métier implique des relations avec les clients ou des collègues : cela ne vaut pas « psychologie et relations humaines », sauf si l'écoute, l'accompagnement ou la compréhension des personnes est la finalité du métier.
- Utilise UNIQUEMENT les identifiants listés. Au plus ${MAX.interets} centres d'intérêt, ${MAX.sens} causes, ${MAX.motivations} motivations.

## Centres d'intérêt
${list(T.interets)}

## Causes
${list(T.sens)}

## Motivations
${list(T.motivations)}`
}

function userPrompt(f) {
  const bullet = (arr, max) => (arr?.length ? arr.slice(0, max).map((x) => `- ${x}`).join('\n') : '(non disponible)')
  const ctx = (f.contextes_travail_rome || []).map((c) => (c.type ? `${c.type} : ${c.libelle}` : c.libelle))
  return `Fiche ROME ${f.code_rome} : ${f.intitule}
Domaine : ${[f.domaine_professionnel?.grand_domaine, f.domaine_professionnel?.domaine].filter(Boolean).join(' > ') || '(non disponible)'}

Appellations :
${bullet(f.appellations, 10)}

Définition :
${f.definition || '(non disponible)'}

Activités :
${bullet(f.activites_rome, 20)}

Contextes de travail :
${bullet(ctx, 15)}

Secteurs d'activité ROME : ${f.secteurs_activite_rome?.join(' ; ') || '(non disponible)'}`
}

/** Valide la réponse : identifiants connus, notes de 1 à 3, bornes par catégorie. */
function sanitize(raw) {
  const out = {}
  for (const key of Object.keys(T)) {
    const allowed = new Set(T[key].map((x) => x.id))
    const notes = {}
    for (const { id, note } of raw[key] || []) {
      if (allowed.has(id) && [1, 2, 3].includes(note)) notes[id] = Math.max(notes[id] || 0, note)
    }
    out[key] = Object.fromEntries(
      Object.entries(notes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX[key]),
    )
  }
  return out
}

let client
const usage = { input: 0, output: 0, cache_read: 0, cache_write: 0 }

async function noterUn(fiche, system) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
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
  return { ...sanitize(JSON.parse(text)), modele: response.model || MODEL, date: new Date().toISOString() }
}

function loadProgress() {
  const done = new Map()
  if (!fs.existsSync(PROGRESS_FILE)) return done
  for (const line of fs.readFileSync(PROGRESS_FILE, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try {
      const e = JSON.parse(line)
      if (e.code_rome && e.liens) done.set(e.code_rome, e.liens)
    } catch {
      // ligne incomplète : le métier sera retraité
    }
  }
  return done
}

/** Sélection variée : alterne entre les grands domaines (lettre du code ROME). */
function pickVaried(metiers, n) {
  const groups = new Map()
  for (const m of metiers) {
    const k = m.code_rome[0]
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(m)
  }
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

function applyAndWrite(data, done) {
  let n = 0
  for (const m of data.metiers) {
    const liens = done.get(m.code_rome)
    if (!liens) continue
    m.enrichi_ia = { ...m.enrichi_ia, liens }
    n++
  }
  data.meta = { ...data.meta, liens_notes: n }
  const tmp = `${DATA_FILE}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, DATA_FILE)
  return n
}

async function main() {
  const data = readJson(DATA_FILE)
  const done = loadProgress()

  if (BUILD_ONLY) {
    console.log(`✔ ${applyAndWrite(data, done)} métiers avec liens notés dans ${path.relative(ROOT, DATA_FILE)}`)
    return
  }

  const pending = data.metiers.filter((m) => !done.has(m.code_rome))
  const todo = LIMIT ? pickVaried(pending, LIMIT) : pending
  console.log('== Notation des liens métier ↔ intérêts / causes / motivations ==')
  console.log(`Modèle : ${MODEL}`)
  console.log(`Métiers : ${data.metiers.length} | déjà notés : ${done.size} | à traiter maintenant : ${todo.length}`)

  const system = systemPrompt()
  if (DRY_RUN) {
    console.log('\n--- PROMPT SYSTÈME ---\n' + system)
    for (const m of todo.slice(0, 3)) console.log(`\n--- MESSAGE (${m.code_rome}) ---\n` + userPrompt(m.officiel_rome))
    console.log('\n(--dry-run : aucun appel API)')
    return
  }
  if (!todo.length) {
    applyAndWrite(data, done)
    console.log('Rien à faire : tous les métiers sélectionnés sont déjà notés.')
    return
  }
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY manquante.')
  client = new Anthropic({ maxRetries: 4 })

  let ok = 0
  let failed = 0
  let stop = false
  process.on('SIGINT', () => {
    if (stop) process.exit(130)
    stop = true
    console.log('\n⏸ Interruption demandée : fin des requêtes en cours puis sauvegarde.')
  })

  const queue = [...todo]
  const worker = async () => {
    while (queue.length && !stop) {
      const m = queue.shift()
      try {
        const liens = await noterUn(m.officiel_rome, system)
        done.set(m.code_rome, liens)
        fs.appendFileSync(PROGRESS_FILE, JSON.stringify({ code_rome: m.code_rome, liens }) + '\n')
        ok++
        const fort = Object.values(liens.interets).filter((v) => v === 3).length
        console.log(`✔ [${done.size}/${data.metiers.length}] ${m.code_rome} ${m.intitule} (${Object.keys(liens.interets).length} intérêts dont ${fort} au cœur)`)
      } catch (err) {
        failed++
        console.error(`✖ ${m.code_rome} ${m.intitule} : ${err.message}`)
        if (err instanceof Anthropic.BadRequestError) {
          stop = true
          console.error("Arrêt : requête refusée par l'API (400), elle échouerait pour tous les métiers.")
        } else if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
          stop = true
          console.error('Arrêt : clé API invalide ou sans accès au modèle.')
        } else if (err instanceof Anthropic.NotFoundError) {
          stop = true
          console.error(`Arrêt : modèle « ${MODEL} » introuvable.`)
        }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker))

  const n = applyAndWrite(data, done)
  console.log('\n== Résultat ==')
  console.log(`Notés pendant ce run : ${ok} | échecs : ${failed} (retentés au prochain lancement)`)
  console.log(`Total noté : ${n}/${data.metiers.length}`)
  const price = PRICES[MODEL]
  if (price) {
    const cost =
      (usage.input * price[0] + usage.cache_write * price[0] * 1.25 + usage.cache_read * price[0] * 0.1 + usage.output * price[1]) / 1e6
    console.log(`Coût estimé de ce run : ~${cost.toFixed(3)} $`)
  }
}

main().catch((err) => {
  console.error(`\n✖ ${err.message}`)
  process.exit(1)
})
