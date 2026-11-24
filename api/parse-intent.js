// Fonction serveur Vercel : POST /api/parse-intent
// Traduit une description libre du métier idéal en critères appartenant
// strictement à data/taxonomies.json, avec Claude Haiku.
// Variables d'environnement : ANTHROPIC_API_KEY (obligatoire), ANTHROPIC_MODEL (facultatif).
import fs from 'node:fs'
import Anthropic from '@anthropic-ai/sdk'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5'
const MAX_LENGTH = 1000

const T = JSON.parse(fs.readFileSync(new URL('../data/taxonomies.json', import.meta.url), 'utf8'))

const ACTIVITES = T.activites.categories.flatMap((c) => c.activites)
const LISTS = {
  activites: ACTIVITES,
  centres_interet: T.centres_interet,
  sens_causes: T.sens_causes,
  motivations: T.motivations,
}
const COMPETENCES = T.competences_categories
const CRITERES = T.conditions_travail.criteres
const ETATS = ['utiliser', 'ne_plus', 'developper']
const IMPORTANCES = ['indispensable', 'souhaitable', 'eviter']

const ids = (list) => list.map((x) => x.id)
const enumArray = (values) => ({ type: 'array', items: { type: 'string', enum: values } })
const ALL_OPTION_IDS = [...new Set(CRITERES.flatMap((c) => c.options.map((o) => o.id)))]

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['activites', 'competences', 'centres_interet', 'sens_causes', 'motivations', 'conditions_travail', 'resume'],
  properties: {
    activites: enumArray(ids(LISTS.activites)),
    competences: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['categorie', 'etat'],
        properties: {
          categorie: { type: 'string', enum: ids(COMPETENCES) },
          etat: { type: 'string', enum: ETATS },
        },
      },
    },
    centres_interet: enumArray(ids(LISTS.centres_interet)),
    sens_causes: enumArray(ids(LISTS.sens_causes)),
    motivations: enumArray(ids(LISTS.motivations)),
    conditions_travail: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['critere', 'valeur', 'importance'],
        properties: {
          critere: { type: 'string', enum: ids(CRITERES) },
          valeur: { type: 'string', enum: ALL_OPTION_IDS },
          importance: { type: 'string', enum: IMPORTANCES },
        },
      },
    },
    resume: { type: 'string' },
  },
}

const line = (x) => `- ${x.id} : ${x.libelle}${x.description ? ` (${x.description})` : ''}`

const SYSTEM = `Tu aides les utilisateurs de CORE Explore, un outil d'exploration des métiers, à traduire une description libre de leur métier idéal en critères de recherche.

Règles :
- N'utilise que les identifiants listés ci-dessous.
- Ne retiens que ce que la personne exprime clairement ou implique directement. N'invente rien ; une description courte donne peu de critères. Toutes les listes peuvent rester vides.
- competences : "utiliser" (sait faire et veut l'utiliser), "developper" (veut apprendre ou progresser), "ne_plus" (sait faire mais ne veut plus).
- conditions_travail : pour un critère de type échelle, une seule valeur, celle qui correspond au souhait (ou à ce qu'il faut éviter). Pour un critère à choix multiple, une entrée par valeur. importance : "indispensable" si la personne insiste (absolument, surtout, impératif), "eviter" si elle veut éviter cette situation (ex. « éviter les écrans toute la journée » → ecran = important, importance eviter), sinon "souhaitable".
- resume : une phrase courte en français, au vouvoiement, qui reformule ce que tu as compris (sans mentionner d'identifiants).

## Activités
${ACTIVITES.map(line).join('\n')}

## Catégories de compétences
${COMPETENCES.map(line).join('\n')}

## Centres d'intérêt
${LISTS.centres_interet.map(line).join('\n')}

## Ce qui donne du sens (causes)
${LISTS.sens_causes.map(line).join('\n')}

## Motivations
${LISTS.motivations.map(line).join('\n')}

## Conditions de travail (critère : valeurs possibles)
${CRITERES.map((c) => `- ${c.id} (${c.libelle}, ${c.type === 'echelle' ? 'échelle' : 'choix multiple'}) : ${c.options.map((o) => `${o.id} = ${o.libelle}`).join(' ; ')}`).join('\n')}`

/** Revérifie la réponse et la convertit au format de critères de l'application. */
function toCriteria(raw) {
  const pick = (key) => {
    const allowed = new Set(ids(LISTS[key]))
    return [...new Set((raw[key] || []).filter((id) => allowed.has(id)))]
  }
  const competences = {}
  const compIds = new Set(ids(COMPETENCES))
  for (const c of raw.competences || []) {
    if (compIds.has(c.categorie) && ETATS.includes(c.etat)) competences[c.categorie] = c.etat
  }
  const conditions = {}
  for (const c of raw.conditions_travail || []) {
    const critere = CRITERES.find((x) => x.id === c.critere)
    if (!critere || !critere.options.some((o) => o.id === c.valeur)) continue
    const importance = IMPORTANCES.includes(c.importance) ? c.importance : 'souhaitable'
    const current = conditions[critere.id]
    if (critere.type === 'choix_multiple' && current) {
      if (!current.valeurs.includes(c.valeur)) current.valeurs.push(c.valeur)
    } else if (!current) {
      conditions[critere.id] = { valeurs: [c.valeur], importance }
    }
  }
  return {
    activites: pick('activites'),
    competences,
    centres_interet: pick('centres_interet'),
    sens_causes: pick('sens_causes'),
    motivations: pick('motivations'),
    conditions,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'Service non configuré' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = null
    }
  }
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!text) return res.status(400).json({ error: 'Texte manquant' })
  if (text.length > MAX_LENGTH) return res.status(400).json({ error: `Texte trop long (${MAX_LENGTH} caractères maximum)` })

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `Description de la personne :\n"""\n${text}\n"""` }],
    })
    const out = response.content.find((b) => b.type === 'text')?.text
    if (response.stop_reason === 'refusal' || !out) {
      return res.status(502).json({ error: 'Réponse inexploitable' })
    }
    const raw = JSON.parse(out)
    return res.status(200).json({
      criteres: toCriteria(raw),
      resume: typeof raw.resume === 'string' ? raw.resume.trim().slice(0, 400) : '',
    })
  } catch (error) {
    console.error('parse-intent', error?.status, error?.message)
    return res.status(502).json({ error: 'Service momentanément indisponible' })
  }
}
