// Fonction serveur Vercel : GET /api/marche?rome=A1101&dep=33
// Chiffres du marché de l'emploi d'un métier dans un département (API « Marché du travail »
// de France Travail, gratuite). Réponses mises en cache 7 jours par Vercel.
// Variables d'environnement : FRANCE_TRAVAIL_CLIENT_ID et FRANCE_TRAVAIL_CLIENT_SECRET.
import { identifiants, marcheMetier } from './_lib/france-travail.js'

const ROME = /^[A-N]\d{4}$/
const DEP = /^(0[1-9]|[1-8]\d|9[0-5]|2A|2B|97[1-6])$/

export default async function handler(req, res) {
  const rome = String(req.query?.rome || '').toUpperCase()
  const dep = String(req.query?.dep || '').toUpperCase()
  if (!ROME.test(rome) || !DEP.test(dep)) {
    return res.status(400).json({ erreur: 'Paramètres attendus : rome (ex. A1101) et dep (ex. 33).' })
  }
  const creds = identifiants()
  if (!creds) return res.status(503).json({ erreur: 'Indicateurs locaux non configurés.' })
  try {
    const m = await marcheMetier(creds, rome, { typeTerritoire: 'DEP', territoire: dep })
    res.setHeader('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=86400')
    return res.status(200).json(m)
  } catch (e) {
    console.error(e)
    return res.status(502).json({ erreur: 'France Travail ne répond pas pour le moment.' })
  }
}
