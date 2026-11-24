// Marché de l'emploi : libellés, départements et liens externes.

export const TENSIONS = {
  forte: { libelle: 'Recrute fortement', classes: 'bg-emerald-50 text-emerald-800 ring-emerald-200', rang: 0 },
  equilibree: { libelle: 'Marché équilibré', classes: 'bg-sky-50 text-sky-800 ring-sky-200', rang: 1 },
  concurrentielle: { libelle: 'Marché concurrentiel', classes: 'bg-amber-50 text-amber-800 ring-amber-200', rang: 2 },
}

/** Rang de tri : les métiers qui recrutent le plus d'abord, les données inconnues en dernier. */
export const tensionRang = (m) => TENSIONS[m?.marche_emploi?.niveau_tension]?.rang ?? 3

export const DEPARTEMENTS = [
  ['01', 'Ain'], ['02', 'Aisne'], ['03', 'Allier'], ['04', 'Alpes-de-Haute-Provence'], ['05', 'Hautes-Alpes'],
  ['06', 'Alpes-Maritimes'], ['07', 'Ardèche'], ['08', 'Ardennes'], ['09', 'Ariège'], ['10', 'Aube'], ['11', 'Aude'],
  ['12', 'Aveyron'], ['13', 'Bouches-du-Rhône'], ['14', 'Calvados'], ['15', 'Cantal'], ['16', 'Charente'],
  ['17', 'Charente-Maritime'], ['18', 'Cher'], ['19', 'Corrèze'], ['2A', 'Corse-du-Sud'], ['2B', 'Haute-Corse'],
  ['21', 'Côte-d’Or'], ['22', 'Côtes-d’Armor'], ['23', 'Creuse'], ['24', 'Dordogne'], ['25', 'Doubs'], ['26', 'Drôme'],
  ['27', 'Eure'], ['28', 'Eure-et-Loir'], ['29', 'Finistère'], ['30', 'Gard'], ['31', 'Haute-Garonne'], ['32', 'Gers'],
  ['33', 'Gironde'], ['34', 'Hérault'], ['35', 'Ille-et-Vilaine'], ['36', 'Indre'], ['37', 'Indre-et-Loire'],
  ['38', 'Isère'], ['39', 'Jura'], ['40', 'Landes'], ['41', 'Loir-et-Cher'], ['42', 'Loire'], ['43', 'Haute-Loire'],
  ['44', 'Loire-Atlantique'], ['45', 'Loiret'], ['46', 'Lot'], ['47', 'Lot-et-Garonne'], ['48', 'Lozère'],
  ['49', 'Maine-et-Loire'], ['50', 'Manche'], ['51', 'Marne'], ['52', 'Haute-Marne'], ['53', 'Mayenne'],
  ['54', 'Meurthe-et-Moselle'], ['55', 'Meuse'], ['56', 'Morbihan'], ['57', 'Moselle'], ['58', 'Nièvre'], ['59', 'Nord'],
  ['60', 'Oise'], ['61', 'Orne'], ['62', 'Pas-de-Calais'], ['63', 'Puy-de-Dôme'], ['64', 'Pyrénées-Atlantiques'],
  ['65', 'Hautes-Pyrénées'], ['66', 'Pyrénées-Orientales'], ['67', 'Bas-Rhin'], ['68', 'Haut-Rhin'], ['69', 'Rhône'],
  ['70', 'Haute-Saône'], ['71', 'Saône-et-Loire'], ['72', 'Sarthe'], ['73', 'Savoie'], ['74', 'Haute-Savoie'],
  ['75', 'Paris'], ['76', 'Seine-Maritime'], ['77', 'Seine-et-Marne'], ['78', 'Yvelines'], ['79', 'Deux-Sèvres'],
  ['80', 'Somme'], ['81', 'Tarn'], ['82', 'Tarn-et-Garonne'], ['83', 'Var'], ['84', 'Vaucluse'], ['85', 'Vendée'],
  ['86', 'Vienne'], ['87', 'Haute-Vienne'], ['88', 'Vosges'], ['89', 'Yonne'], ['90', 'Territoire de Belfort'],
  ['91', 'Essonne'], ['92', 'Hauts-de-Seine'], ['93', 'Seine-Saint-Denis'], ['94', 'Val-de-Marne'], ['95', 'Val-d’Oise'],
  ['971', 'Guadeloupe'], ['972', 'Martinique'], ['973', 'Guyane'], ['974', 'La Réunion'], ['976', 'Mayotte'],
]

/** Offres France Travail filtrées sur le code ROME (et le département s'il est choisi). */
export function lienOffres(codeRome, dept) {
  const p = new URLSearchParams({ motsCles: codeRome, offresPartenaires: 'true', tri: '0' })
  if (dept) p.set('lieux', `${dept}D`)
  return `https://candidat.francetravail.fr/offres/recherche?${p}`
}

/** « Conducteur / Conductrice d'engins agricoles » → « Conducteur d'engins agricoles » (pour une recherche). */
export function intituleSimple(intitule) {
  const [gauche, droite] = String(intitule).split(' / ')
  if (droite === undefined) return intitule
  const suite = droite.split(' ').slice(1).join(' ')
  return `${gauche.trim()} ${suite}`.trim()
}

/** Recherche de formations sur Mon Compte Formation, pré-remplie avec l'intitulé du métier. */
export function lienFormations(intitule) {
  const q = JSON.stringify({ quoi: intituleSimple(intitule) })
  return `https://www.moncompteformation.gouv.fr/espace-prive/html/#/formation/recherche/resultats?q=${encodeURIComponent(q)}`
}
