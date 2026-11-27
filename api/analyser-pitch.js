// Fonction serveur Vercel : POST /api/analyser-pitch
// Traduit le pitch libre de la page « Je trouve ce qui m'anime » en critères du portrait
// (identifiants de src/lib/portrait/referentiel.js uniquement), avec Claude Haiku.
// L'IA structure la demande : elle ne propose aucun métier et n'invente aucune caractéristique.
// Le texte n'est ni journalisé ni conservé.
// Variables d'environnement : ANTHROPIC_API_KEY (obligatoire), ANTHROPIC_MODEL (facultatif).
// Sans clé, la page utilise l'analyse locale par mots-clés.
import Anthropic from '@anthropic-ai/sdk'
import {
  AIME_FAMILLES,
  CHOIX_GROUPES,
  CONTRIBUTIONS,
  CURSEUR_GROUPES,
  INTERETS,
  MOTIVATIONS,
  SAVOIR_FAMILLES,
} from '../src/lib/portrait/referentiel.js'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5'
const MAX_LENGTH = 2000

const VERBES = AIME_FAMILLES.flatMap((f) => f.verbes)
const SAVOIRS = SAVOIR_FAMILLES.flatMap((f) => f.savoirs)
const CURSEURS = CURSEUR_GROUPES.flatMap((g) => g.curseurs)
const OPTIONS = [...new Set(CHOIX_GROUPES.flatMap((g) => g.options.map((o) => o.id)))]

const ids = (list) => list.map((x) => x.id)
const enumArray = (values) => ({ type: 'array', items: { type: 'string', enum: values } })

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['aime', 'savoirs', 'interets', 'sens', 'motivations', 'curseurs', 'choix', 'resume'],
  properties: {
    aime: enumArray(ids(VERBES)),
    savoirs: enumArray(ids(SAVOIRS)),
    interets: enumArray(ids(INTERETS)),
    sens: enumArray(ids(CONTRIBUTIONS)),
    motivations: enumArray(ids(MOTIVATIONS)),
    curseurs: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'pos'],
        properties: { id: { type: 'string', enum: ids(CURSEURS) }, pos: { type: 'integer', enum: [1, 2, 3, 4, 5] } },
      },
    },
    choix: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['groupe', 'option', 'etat'],
        properties: {
          groupe: { type: 'string', enum: ids(CHOIX_GROUPES) },
          option: { type: 'string', enum: OPTIONS },
          etat: { type: 'string', enum: ['oui', 'eviter'] },
        },
      },
    },
    resume: { type: 'string' },
  },
}

const line = (x) => `- ${x.id} : ${x.libelle}${x.definition ? ` (${x.definition})` : ''}`

const SYSTEM = `Tu aides les utilisateurs de CORE Explore, un outil d'exploration des métiers, à traduire la description libre de ce qu'ils recherchent dans leur vie professionnelle en critères de leur « portrait professionnel ».

Règles :
- N'utilise que les identifiants listés ci-dessous. Toutes les listes peuvent rester vides.
- Ne retiens que ce que la personne exprime clairement ou implique directement. N'invente rien : une description courte donne peu de critères.
- Ne propose jamais de métier.
- aime : les activités que la personne aime ou aimerait faire.
- savoirs : les savoir-faire ou missions évoqués, que la personne devra confirmer. Aimer une activité ne veut pas dire la maîtriser : ne déduis aucun niveau.
- interets : les univers qui l'intéressent. sens : ce à quoi elle veut contribuer. motivations : ce qu'elle attend de son travail.
- curseurs : position de 1 (extrémité gauche) à 5 (extrémité droite), 3 = équilibre entre les deux. Ex. « pas toute la journée devant un ordinateur » → ecrans = 2 ; « garder un côté concret, manuel » → manuel = 4.
- choix : cadre d'emploi ; etat "eviter" si la personne veut l'éviter (ex. « pas de travail de nuit » → horaires / nuit / eviter).
- resume : une phrase courte en français, au vouvoiement, qui reformule ce que tu as compris (sans identifiants).

## Activités (aime)
${VERBES.map(line).join('\n')}

## Savoir-faire (savoirs)
${SAVOIR_FAMILLES.map((f) => `### ${f.libelle}\n${f.savoirs.map(line).join('\n')}`).join('\n')}

## Centres d'intérêt (interets)
${INTERETS.map(line).join('\n')}

## Contributions (sens)
${CONTRIBUTIONS.map(line).join('\n')}

## Motivations
${MOTIVATIONS.map(line).join('\n')}

## Curseurs (id : gauche = 1 … droite = 5)
${CURSEURS.map((c) => `- ${c.id} (${c.libelle}) : ${c.gauche} … ${c.droite}`).join('\n')}

## Cadre d'emploi (groupe : options)
${CHOIX_GROUPES.map((g) => `- ${g.id} (${g.libelle}) : ${g.options.map((o) => `${o.id} = ${o.libelle}`).join(' ; ')}`).join('\n')}`

/** Revérifie la réponse du modèle et la met au format des propositions de l'application. */
function toPropositions(raw) {
  const pick = (key, list) => {
    const allowed = new Set(ids(list))
    return [...new Set((raw[key] || []).filter((id) => allowed.has(id)))]
  }
  const curseurs = {}
  const curseurIds = new Set(ids(CURSEURS))
  for (const c of raw.curseurs || [])
    if (curseurIds.has(c.id) && Number.isInteger(c.pos) && c.pos >= 1 && c.pos <= 5 && !curseurs[c.id])
      curseurs[c.id] = { pos: c.pos, importance: 'souhaitable' }
  const choix = {}
  for (const c of raw.choix || []) {
    const g = CHOIX_GROUPES.find((x) => x.id === c.groupe)
    if (!g || !g.options.some((o) => o.id === c.option) || !['oui', 'eviter'].includes(c.etat)) continue
    if (c.etat === 'eviter' && !g.exclusion) continue
    choix[g.id] ||= { valeurs: {}, importance: 'souhaitable' }
    choix[g.id].valeurs[c.option] = c.etat
  }
  return {
    aime: pick('aime', VERBES),
    savoirs: pick('savoirs', SAVOIRS),
    interets: pick('interets', INTERETS),
    sens: pick('sens', CONTRIBUTIONS),
    motivations: pick('motivations', MOTIVATIONS),
    curseurs,
    choix,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'Service non configuré' })

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
    if (response.stop_reason === 'refusal' || !out) return res.status(502).json({ error: 'Réponse inexploitable' })
    const raw = JSON.parse(out)
    return res.status(200).json({
      propositions: toPropositions(raw),
      resume: typeof raw.resume === 'string' ? raw.resume.trim().slice(0, 400) : '',
    })
  } catch (error) {
    // Le texte de la personne n'est jamais journalisé.
    console.error('analyser-pitch', error?.status, error?.message)
    return res.status(502).json({ error: 'Service momentanément indisponible' })
  }
}
