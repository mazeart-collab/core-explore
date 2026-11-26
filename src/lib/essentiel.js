// Repères courts d'un métier, affichés sur les cartes (à la place de l'extrait de description)
// et en tête de fiche : niveau d'accès, lieu de travail, télétravail, horaires, salaire.
import { clean } from './text'

// Niveaux reconnus dans le texte « Accès au métier » du ROME, du plus bas au plus haut.
const NIVEAUX = [
  { rang: 0, libelle: 'Sans diplôme', re: /sans diplôme|pas de diplôme|aucun diplôme/i },
  { rang: 1, libelle: 'CAP / BEP', re: /\b(CAP|BEP)\b/ },
  { rang: 2, libelle: 'Bac', re: /\bBac(?!\s*\+)\b/i },
  { rang: 3, libelle: 'Bac +2', re: /\bBac\s*\+\s*2\b|\b(BTS|DUT)\b/i },
  { rang: 4, libelle: 'Bac +3', re: /\bBac\s*\+\s*3\b|\blicence\b|\bBUT\b/i },
  { rang: 5, libelle: 'Bac +4', re: /\bBac\s*\+\s*4\b/i },
  { rang: 6, libelle: 'Bac +5', re: /\bBac\s*\+\s*5\b|\bmaster\b|diplôme d['’]ingénieur/i },
  { rang: 7, libelle: 'Bac +8', re: /\bBac\s*\+\s*([6-9]|1\d)\b|\bdoctorat\b/i },
]

/** « CAP à Bac +3 », « Bac +5 »… d'après la première phrase de l'accès au métier, ou null. */
export function niveauAcces(metier) {
  const phrase = clean(metier.officiel_rome?.acces_metier).split('\n')[0]
  if (!phrase) return null
  const trouves = NIVEAUX.filter((n) => n.re.test(phrase))
  if (!trouves.length) return null
  const min = trouves[0]
  const max = trouves[trouves.length - 1]
  return min === max ? min.libelle : `${min.libelle} à ${max.libelle}`
}

const LIEU = { bureau: 'Au bureau', terrain: 'Sur le terrain', mixte: 'Bureau et terrain' }
const TELETRAVAIL = { partiel: 'Télétravail partiel', majoritaire: 'Télétravail majoritaire' }
const HORAIRES = { reguliers: 'Horaires de journée', decales: 'Horaires décalés', nuit_weekend: 'Nuit, week-end ou astreintes' }

/** Liste de repères courts : [{ id, libelle }]. */
export function reperes(metier) {
  const ct = metier.enrichi_ia?.conditions_travail || {}
  const out = []
  const niveau = niveauAcces(metier)
  if (niveau) out.push({ id: 'niveau', libelle: niveau })
  if (LIEU[ct.bureau_terrain]) out.push({ id: 'lieu', libelle: LIEU[ct.bureau_terrain] })
  if (TELETRAVAIL[ct.teletravail]) out.push({ id: 'teletravail', libelle: TELETRAVAIL[ct.teletravail] })
  if (HORAIRES[ct.horaires]) out.push({ id: 'horaires', libelle: HORAIRES[ct.horaires] })
  const s = metier.marche_emploi?.salaire
  if (s?.min && s?.max) {
    const k = (n) => `${(Math.round(n / 100) / 10).toLocaleString('fr-FR')} k€`
    out.push({ id: 'salaire', libelle: s.min === s.max ? `${k(s.min)} brut/mois` : `${k(s.min)} – ${k(s.max)} brut/mois` })
  }
  return out
}
