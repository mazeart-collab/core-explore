// Référentiel du « portrait professionnel » (page « Je trouve ce qui m'anime »).
//
// Chaque critère visible possède un identifiant stable et une couche de correspondance :
// - `taxo` : étiquettes de data/taxonomies.json portées par les métiers (bloc enrichi_ia) ;
// - `mots` : formes et synonymes reconnus dans un pitch ou une recherche (texte normalisé,
//   sans accents ; un mot terminé par « * » est un préfixe).
// La richesse est dans ces correspondances, pas dans le nombre de boutons affichés.
import { normalize } from '../text.js'

/** Identifiant lisible et stable à partir d'un libellé. */
export const slug = (s) =>
  normalize(s)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

// ---------------------------------------------------------------------------
// Les six dimensions et la synthèse
// ---------------------------------------------------------------------------

export const DIMENSIONS = [
  {
    id: 'aime',
    court: 'J’aime faire',
    numero: 1,
    titre: 'Ce que j’aime faire',
    question: 'Qu’est-ce que j’aime faire ?',
    description: 'Les activités qui vous donnent de l’énergie, que vous sachiez déjà les faire ou non.',
    consigne:
      'Sélectionnez les activités qui vous procurent du plaisir, vous stimulent ou vous donnent envie de vous investir, que vous sachiez déjà les réaliser ou non.',
    couleur: 'rose',
    icone: 'etincelle',
  },
  {
    id: 'savoirs',
    court: 'Je sais faire',
    numero: 2,
    titre: 'Ce que je sais faire',
    question: 'Quelles actions concrètes suis-je capable de réaliser ?',
    description: 'Vos savoir-faire, et la place que vous voulez leur donner demain.',
    consigne:
      'Identifiez les savoir-faire que vous possédez et précisez la place que vous souhaitez leur donner dans votre future vie professionnelle.',
    couleur: 'teal',
    icone: 'outils',
  },
  {
    id: 'interets',
    court: 'Intérêts',
    numero: 3,
    titre: 'Mes centres d’intérêt',
    question: 'À quoi est-ce que j’aime m’intéresser ?',
    description: 'Les univers et les sujets qui éveillent votre curiosité.',
    consigne: 'Sélectionnez les univers qui éveillent votre curiosité, dans votre vie personnelle comme professionnelle.',
    couleur: 'amber',
    icone: 'boussole',
  },
  {
    id: 'sens',
    court: 'Sens',
    numero: 4,
    titre: 'Ce qui donne du sens à mon travail',
    question: 'À quoi aimerais-je contribuer à travers mon travail ?',
    description: 'Ce que vous aimeriez apporter aux autres, à la société ou au monde.',
    consigne:
      'Au-delà de vos missions quotidiennes, à quoi aimeriez-vous contribuer ? Qu’aimeriez-vous apporter aux autres, à la société ou au monde qui vous entoure ?',
    couleur: 'emerald',
    icone: 'graine',
  },
  {
    id: 'motivations',
    court: 'Motivations',
    numero: 5,
    titre: 'Mes motivations professionnelles',
    question: 'Qu’est-ce que je souhaite retirer de mon travail ?',
    description: 'Ce que vous attendez personnellement de votre vie professionnelle.',
    consigne:
      'Parmi les motivations suivantes, identifiez celles qui comptent le plus pour vous dans votre vie professionnelle.',
    couleur: 'blue',
    icone: 'flamme',
  },
  {
    id: 'conditions',
    court: 'Conditions',
    numero: 6,
    titre: 'Mes conditions de travail idéales',
    question: 'Comment ai-je envie de travailler au quotidien ?',
    description: 'Votre quotidien idéal : lieux, rythmes, relations et cadre d’emploi.',
    consigne:
      'Imaginez votre quotidien professionnel idéal. Précisez les environnements, les rythmes et les conditions de travail qui vous conviendraient.',
    couleur: 'sky',
    icone: 'curseurs',
  },
]

export const SYNTHESE = {
  id: 'synthese',
  court: 'Mon portrait',
  numero: 7,
  titre: 'Mon portrait professionnel',
  description: 'La synthèse de vos critères, avant de découvrir vos pistes.',
  couleur: 'teal',
  icone: 'portrait',
}

export const DIMENSIONS_BY_ID = Object.fromEntries([...DIMENSIONS, SYNTHESE].map((d) => [d.id, d]))

// ---------------------------------------------------------------------------
// Dimension 1 — Ce que j'aime faire (verbes d'action)
// ---------------------------------------------------------------------------

const v = (libelle, taxo, mots) => ({ id: slug(libelle), libelle, taxo, mots })

export const AIME_FAMILLES = [
  {
    id: 'creer',
    libelle: 'Créer et imaginer',
    verbes: [
      v('Imaginer', ['imaginer_des_idees_et_des_concepts'], ['imagin*', 'idee', 'idees']),
      v(
        'Créer',
        ['imaginer_des_idees_et_des_concepts', 'dessiner_illustrer_mettre_en_forme_visuellement', 'inventer_des_solutions_nouvelles'],
        ['creer', 'cree', 'crees', 'creation*', 'creati*', 'createur*', 'creatrice*'],
      ),
      v(
        'Concevoir',
        ['concevoir_des_produits_des_objets_ou_des_espaces', 'imaginer_des_idees_et_des_concepts'],
        ['concevoir', 'concoi*', 'concu', 'concue', 'concus', 'concept*', 'conception*', 'elaborer', 'dessiner des plans'],
      ),
      v('Inventer', ['inventer_des_solutions_nouvelles'], ['inventer', 'invente', 'invention*', 'inventif*', 'innov*']),
      v(
        'S’exprimer',
        ['ecrire_et_rediger_des_contenus', 'composer_interpreter_se_produire_sur_scene', 'informer_presenter_raconter'],
        ['exprimer', 'm exprimer', 'expression', 'ecrire', 'raconter', 'jouer sur scene'],
      ),
    ],
  },
  {
    id: 'fabriquer',
    libelle: 'Fabriquer et agir',
    verbes: [
      v('Fabriquer', ['fabriquer_assembler_produire'], ['fabriqu*', 'fabrication*', 'produire', 'de mes mains', 'avec mes mains']),
      v('Construire', ['construire_installer_poser'], ['construi*', 'construction*', 'batir', 'installer']),
      v('Transformer', ['preparer_cuisiner_transformer_des_produits', 'fabriquer_assembler_produire'], ['transform*', 'faconner']),
      v('Réparer', ['reparer_entretenir_depanner'], ['reparer', 'repare', 'reparation*', 'depann*', 'entretenir', 'bricol*']),
      v('Manipuler', ['piloter_des_machines_ou_des_engins', 'fabriquer_assembler_produire'], ['manipul*', 'manier', 'machines', 'outils']),
      v('Expérimenter', ['rechercher_experimenter_tester'], ['experiment*', 'tester', 'essayer']),
    ],
  },
  {
    id: 'organiser',
    libelle: 'Organiser et gérer',
    verbes: [
      v('Organiser', ['planifier_et_organiser_le_travail', 'organiser_des_evenements'], ['organis*']),
      v('Planifier', ['planifier_et_organiser_le_travail'], ['planifi*', 'planning*', 'anticip*', 'etapes']),
      v('Coordonner', ['coordonner_des_equipes_ou_des_intervenants'], ['coordon*', 'coordination']),
      v(
        'Gérer',
        ['gerer_des_stocks_des_flux_des_approvisionnements', 'gerer_un_budget_tenir_des_comptes', 'traiter_des_dossiers_administratifs'],
        ['gerer', 'gere', 'geres', 'gestion', 'gestionnaire'],
      ),
      v('Optimiser', ['gerer_des_stocks_des_flux_des_approvisionnements', 'diagnostiquer_et_resoudre_des_problemes'], ['optimis*', 'ameliorer', 'amelioration*']),
    ],
  },
  {
    id: 'reflechir',
    libelle: 'Réfléchir et comprendre',
    verbes: [
      v('Observer', ['rechercher_experimenter_tester', 'evaluer_des_risques_auditer'], ['observ*']),
      v('Comprendre', ['interpreter_des_textes_et_des_regles', 'rechercher_experimenter_tester'], ['comprendre', 'comprehension']),
      v('Rechercher', ['rechercher_experimenter_tester'], ['recherch*', 'enquet*', 'investig*']),
      v('Analyser', ['analyser_des_donnees_et_des_chiffres'], ['analys*', 'chiffres', 'donnees', 'statisti*']),
      v('Résoudre', ['diagnostiquer_et_resoudre_des_problemes'], ['resoudre', 'resolution', 'solutions', 'problemes', 'diagnosti*']),
      v('Contrôler', ['controler_la_qualite_la_securite_la_conformite', 'evaluer_des_risques_auditer'], ['control*', 'verifi*', 'audit*']),
    ],
  },
  {
    id: 'accompagner',
    libelle: 'Accompagner et prendre soin',
    verbes: [
      v('Écouter', ['ecouter_soutenir_conseiller_des_personnes'], ['ecout*']),
      v('Aider', ['accompagner_et_aider_au_quotidien', 'ecouter_soutenir_conseiller_des_personnes'], ['aider', 'aide', 'utile aux autres', 'rendre service']),
      v('Accompagner', ['orienter_inserer_accompagner_un_parcours', 'accompagner_et_aider_au_quotidien'], ['accompagn*', 'soutenir']),
      v(
        'Conseiller',
        ['conseiller_des_clients', 'expertiser_conseiller_techniquement', 'ecouter_soutenir_conseiller_des_personnes'],
        ['conseil*', 'orienter'],
      ),
      v('Soigner', ['soigner_prendre_soin'], ['soign*', 'soins', 'prendre soin']),
      v('Protéger', ['proteger_defendre_les_droits_des_personnes', 'controler_la_qualite_la_securite_la_conformite'], ['proteg*', 'protection', 'defendre', 'securis*']),
    ],
  },
  {
    id: 'communiquer',
    libelle: 'Communiquer et transmettre',
    verbes: [
      v('Communiquer', ['informer_presenter_raconter', 'promouvoir_faire_connaitre', 'accueillir_renseigner_le_public'], ['communiqu*', 'communication']),
      v('Transmettre', ['enseigner_former'], ['transmett*', 'transmission', 'enseign*', 'former', 'expliquer']),
      v('Animer', ['eduquer_animer_des_groupes'], ['animer', 'anime', 'animation*', 'animateur*', 'animatrice*']),
      v('Convaincre', ['vendre_negocier', 'promouvoir_faire_connaitre', 'representer_porter_une_cause_ou_une_organisation'], ['convain*', 'persuad*', 'argument*']),
      v('Négocier', ['vendre_negocier'], ['negoci*']),
      v('Vendre', ['vendre_negocier', 'conseiller_des_clients'], ['vendre', 'vends', 'vente', 'ventes', 'commerci*']),
      v(
        'Mettre en relation',
        ['developper_un_reseau_des_partenariats', 'accueillir_renseigner_le_public'],
        ['mettre en relation', 'mise en relation', 'reseau', 'reseaux', 'relier', 'rencontr*'],
      ),
    ],
  },
  {
    id: 'diriger',
    libelle: 'Diriger et entreprendre',
    verbes: [
      v('Entreprendre', ['creer_developper_une_activite_ou_une_entreprise'], ['entrepren*', 'monter ma boite', 'mon entreprise', 'ma propre entreprise']),
      v('Diriger', ['diriger_une_structure_ou_un_service', 'manager_une_equipe'], ['dirig*', 'manag*', 'encadr*']),
      v('Décider', ['prendre_des_decisions_engageantes', 'definir_une_strategie'], ['decid*', 'decision*', 'strateg*']),
      v(
        'Développer',
        ['creer_developper_une_activite_ou_une_entreprise', 'developper_un_reseau_des_partenariats', 'piloter_des_projets'],
        ['developp*', 'faire grandir', 'croissance'],
      ),
      v('Fédérer', ['manager_une_equipe', 'coordonner_des_equipes_ou_des_intervenants', 'representer_porter_une_cause_ou_une_organisation'], ['feder*', 'rassembl*', 'mobiliser']),
    ],
  },
]

export const VERBES = Object.fromEntries(
  AIME_FAMILLES.flatMap((f) => f.verbes.map((x) => [x.id, { ...x, famille: f.id }])),
)

/**
 * Couche de correspondance verbe → verbes d'action des savoir-faire officiels du ROME
 * (premier mot de la ligne, ou début de ligne pour une expression). Un même verbe ouvre ainsi
 * vers des métiers très différents : « Concevoir » couvre « Élaborer un plan », « Modéliser »…
 */
export const VERBES_ROME = {
  imaginer: ['imaginer', 'inventer', 'proposer', 'creer'],
  creer: ['creer', 'composer', 'dessiner', 'illustrer', 'inventer', 'imaginer'],
  concevoir: ['concevoir', 'elaborer', 'modeliser', 'dessiner', 'prototyper', 'imaginer'],
  inventer: ['inventer', 'innover', 'imaginer', 'mettre au point'],
  s_exprimer: ['interpreter', 'jouer', 'chanter', 'ecrire', 'rediger', 'raconter', 'improviser'],
  fabriquer: ['fabriquer', 'produire', 'usiner', 'faconner', 'confectionner', 'assembler', 'monter', 'souder'],
  construire: ['construire', 'batir', 'maconner', 'poser', 'installer', 'edifier', 'monter', 'coffrer'],
  transformer: ['transformer', 'faconner', 'cuisiner', 'decouper', 'usiner', 'travailler'],
  reparer: ['reparer', 'depanner', 'restaurer', 'remplacer', 'entretenir', 'remettre en etat'],
  manipuler: ['manipuler', 'conduire', 'piloter', 'manoeuvrer', 'regler', 'utiliser'],
  experimenter: ['experimenter', 'tester', 'essayer', 'mesurer'],
  organiser: ['organiser', 'structurer', 'preparer', 'ordonnancer'],
  planifier: ['planifier', 'ordonnancer', 'anticiper', 'programmer les'],
  coordonner: ['coordonner', 'superviser', 'piloter'],
  gerer: ['gerer', 'administrer', 'tenir'],
  optimiser: ['optimiser', 'ameliorer', 'rationaliser'],
  observer: ['observer', 'surveiller', 'reperer', 'inspecter'],
  comprendre: ['interpreter', 'etudier', 'identifier', 'comprendre'],
  rechercher: ['rechercher', 'collecter', 'enqueter', 'etudier', 'investiguer', 'recenser'],
  analyser: ['analyser', 'evaluer', 'etudier', 'calculer', 'interpreter'],
  resoudre: ['resoudre', 'diagnostiquer', 'depanner', 'traiter'],
  controler: ['controler', 'verifier', 'inspecter', 'auditer'],
  ecouter: ['ecouter', 'recueillir', 'accueillir'],
  aider: ['aider', 'assister', 'soutenir', 'accompagner'],
  accompagner: ['accompagner', 'orienter', 'guider', 'soutenir', 'suivre'],
  conseiller: ['conseiller', 'preconiser', 'orienter', 'renseigner'],
  soigner: ['soigner', 'prodiguer', 'panser', 'masser', 'realiser des soins'],
  proteger: ['proteger', 'securiser', 'defendre', 'prevenir', 'sauvegarder'],
  communiquer: ['communiquer', 'informer', 'diffuser', 'presenter', 'promouvoir'],
  transmettre: ['transmettre', 'former', 'enseigner', 'expliquer'],
  animer: ['animer', 'divertir'],
  convaincre: ['convaincre', 'argumenter', 'promouvoir', 'persuader'],
  negocier: ['negocier'],
  vendre: ['vendre', 'commercialiser', 'prospecter'],
  mettre_en_relation: ['mettre en relation', 'developper un reseau', 'relier', 'mettre en contact'],
  entreprendre: ['creer une entreprise', 'creer une activite', 'reprendre une entreprise', 'lancer'],
  diriger: ['diriger', 'manager', 'encadrer', 'piloter'],
  decider: ['decider', 'arbitrer', 'determiner', 'valider', 'definir la strategie'],
  developper: ['developper', 'deployer', 'lancer'],
  federer: ['federer', 'mobiliser', 'rassembler', 'impliquer'],
}

// ---------------------------------------------------------------------------
// Dimension 2 — Ce que je sais faire (bibliothèque de savoir-faire)
// ---------------------------------------------------------------------------

/** États possibles d'un savoir-faire (un seul à la fois). */
export const SAVOIR_ETATS = [
  { id: 'mobiliser', symbole: '✓', libelle: 'Je le possède et souhaite le mobiliser', court: 'À mobiliser', couleur: 'emerald' },
  { id: 'ecarter', symbole: '×', libelle: 'Je le possède mais ne souhaite plus le mobiliser', court: 'À écarter', couleur: 'rose' },
  { id: 'developper', symbole: '+', libelle: 'Je souhaite développer ce savoir-faire', court: 'À développer', couleur: 'blue' },
]

// Familles : `taxo` = catégories de compétences (taxonomies.json) ; `mots` = synonymes de recherche.
// Un savoir-faire peut préciser ses propres `taxo` ou `mots` avec la syntaxe ['Libellé', { taxo, mots }].
const FAMILLES_SAVOIRS = [
  {
    id: 'communication',
    libelle: 'Communication orale et écrite',
    taxo: ['relationnelles_et_communication', 'expression_ecrite_et_langues'],
    mots: ['ecrire', 'rediger', 'redaction', 'oral', 'parler', 'presenter', 'expression'],
    savoirs: [
      ['Rédiger un e-mail professionnel', { mots: ['mail', 'courriel', 'message'] }],
      ['Rédiger un courrier', { mots: ['lettre'] }],
      ['Rédiger un compte rendu', { mots: ['proces verbal', 'cr', 'notes de reunion', 'rapport'] }],
      ['Rédiger un article ou une newsletter', { mots: ['journalisme', 'blog', 'contenu'] }],
      ['Construire un argumentaire', { mots: ['argumenter', 'convaincre', 'plaidoyer'] }],
      ['Présenter un projet à l’oral', { mots: ['pitch', 'soutenance', 'exposer'] }],
      ['Prendre la parole devant un public', { mots: ['conference', 'discours', 'parole en public'] }],
      ['Animer une réunion', { mots: ['reunion', 'facilitation'] }],
      'Adapter son discours à son interlocuteur',
      ['Conduire une interview', { mots: ['entretien', 'journaliste', 'questionner'] }],
      ['Créer un support de communication', { mots: ['flyer', 'affiche', 'plaquette', 'brochure'] }],
      ['Communiquer dans une langue étrangère', { taxo: ['expression_ecrite_et_langues'], mots: ['anglais', 'espagnol', 'allemand', 'langues', 'bilingue'] }],
    ],
  },
  {
    id: 'projet',
    libelle: 'Organisation et gestion de projet',
    taxo: ['organisation_et_rigueur'],
    mots: ['organiser', 'organisation', 'projet', 'planifier', 'gestion de projet'],
    savoirs: [
      ['Construire un planning', { mots: ['planning', 'emploi du temps', 'calendrier', 'etapes'] }],
      ['Élaborer un rétroplanning', { mots: ['retroplanning', 'echeancier', 'jalons'] }],
      'Définir des objectifs',
      ['Prioriser des tâches', { mots: ['priorites', 'urgences'] }],
      ['Organiser un événement', { mots: ['evenement', 'salon', 'seminaire', 'mariage', 'festival', 'evenementiel'] }],
      ['Coordonner plusieurs intervenants', { mots: ['intervenants', 'prestataires', 'coordination', 'coordonner'] }],
      ['Répartir des tâches', { mots: ['deleguer', 'repartition'] }],
      ['Identifier les ressources nécessaires à un projet', { mots: ['ressources', 'moyens'] }],
      ['Suivre l’avancement d’un projet', { mots: ['suivi de projet', 'tableau de bord', 'avancement'] }],
      ['Anticiper les risques et les imprévus', { mots: ['anticiper', 'imprevus', 'plan b'] }],
      ['Rédiger un cahier des charges', { mots: ['cahier des charges', 'specifications', 'besoin'] }],
      ['Mettre en place une procédure', { mots: ['procedure', 'process', 'mode operatoire'] }],
    ],
  },
  {
    id: 'administratif',
    libelle: 'Gestion administrative et financière',
    taxo: ['organisation_et_rigueur'],
    mots: ['administratif', 'administration', 'gestion', 'finance', 'chiffres', 'argent'],
    savoirs: [
      ['Constituer et suivre un dossier', { mots: ['dossier', 'demarches'] }],
      ['Classer et archiver des documents', { mots: ['classement', 'archives', 'archivage'] }],
      ['Élaborer un budget', { mots: ['budget', 'previsionnel'] }],
      ['Suivre des dépenses', { mots: ['depenses', 'frais'] }],
      ['Établir un devis', { mots: ['devis', 'chiffrage', 'chiffrer'] }],
      ['Établir une facture', { mots: ['facture', 'facturation'] }],
      ['Effectuer des calculs de coûts', { mots: ['cout', 'couts', 'prix de revient', 'marge'] }],
      ['Gérer des commandes', { mots: ['commandes', 'bon de commande'] }],
      ['Suivre des stocks', { mots: ['stock', 'stocks', 'inventaire', 'logistique'] }],
      ['Traiter des données administratives', { mots: ['saisie', 'donnees administratives'] }],
      ['Réaliser des opérations comptables', { taxo: ['organisation_et_rigueur', 'scientifiques_et_mathematiques'], mots: ['comptabilite', 'comptable', 'bilan', 'paie', 'tresorerie'] }],
    ],
  },
  {
    id: 'analyse',
    libelle: 'Analyse et résolution de problèmes',
    taxo: ['analyse_et_resolution_de_problemes'],
    mots: ['analyser', 'analyse', 'probleme', 'resoudre', 'solutions', 'trouver des solutions'],
    savoirs: [
      ['Rechercher des informations', { mots: ['documentation', 'veille', 'sources'] }],
      ['Vérifier la fiabilité d’une information', { mots: ['fact checking', 'fiabilite', 'verifier'] }],
      ['Analyser des données chiffrées', { mots: ['statistiques', 'chiffres', 'data', 'donnees', 'excel'] }],
      'Interpréter des résultats',
      ['Identifier les causes d’un problème', { mots: ['causes', 'trouver des solutions', 'diagnostic'] }],
      ['Comparer plusieurs solutions', { mots: ['solutions', 'alternatives', 'arbitrer'] }],
      ['Élaborer des recommandations', { mots: ['recommandations', 'preconisations', 'conseil'] }],
      ['Construire des indicateurs de suivi', { mots: ['indicateurs', 'kpi', 'tableau de bord'] }],
      ['Réaliser un diagnostic', { mots: ['diagnostic', 'etat des lieux', 'audit'] }],
      ['Synthétiser des informations', { mots: ['synthese', 'resumer'] }],
      ['Évaluer des risques', { mots: ['risques', 'risque'] }],
      ['Améliorer un processus', { mots: ['amelioration continue', 'optimiser', 'lean', 'process'] }],
    ],
  },
  {
    id: 'commerce',
    libelle: 'Commerce, achats et développement',
    taxo: ['commerciales_et_negociation'],
    mots: ['commerce', 'vente', 'vendre', 'client', 'clients', 'achat', 'achats', 'commercial'],
    savoirs: [
      ['Identifier les besoins d’un client', { mots: ['besoins client', 'decouverte client'] }],
      ['Prospecter de nouveaux clients', { mots: ['prospection', 'prospecter', 'demarcher'] }],
      ['Présenter une offre commerciale', { mots: ['offre', 'proposition commerciale'] }],
      ['Négocier un prix ou un contrat', { mots: ['negocier', 'negociation', 'contrat'] }],
      ['Rechercher des fournisseurs', { mots: ['fournisseur', 'fournisseurs', 'sourcing', 'acheteur'] }],
      ['Comparer des devis', { mots: ['devis', 'appel d offres'] }],
      ['Conclure une vente', { mots: ['closing', 'vendre'] }],
      ['Fidéliser une clientèle', { mots: ['fidelisation', 'relation client'] }],
      ['Réaliser une étude de marché', { taxo: ['commerciales_et_negociation', 'analyse_et_resolution_de_problemes'], mots: ['etude de marche', 'marketing', 'concurrence'] }],
      ['Développer un partenariat', { mots: ['partenariat', 'partenaires'] }],
      ['Traiter une réclamation', { mots: ['reclamation', 'litige', 'sav', 'service client'] }],
    ],
  },
  {
    id: 'creation',
    libelle: 'Création et conception',
    taxo: ['creativite_et_innovation'],
    mots: ['creer', 'creation', 'conception', 'concevoir', 'design', 'artistique'],
    savoirs: [
      ['Réaliser un croquis', { mots: ['croquis', 'dessin', 'dessiner', 'esquisse'] }],
      ['Dessiner un plan', { taxo: ['creativite_et_innovation', 'techniques_et_manuelles'], mots: ['plan', 'plans', 'dao', 'cao', 'architecture'] }],
      ['Créer une identité visuelle', { mots: ['logo', 'graphisme', 'charte graphique', 'graphiste'] }],
      ['Concevoir un objet ou un produit', { mots: ['produit', 'objet', 'design produit'] }],
      ['Concevoir un aménagement', { mots: ['amenagement', 'decoration', 'interieur', 'espace'] }],
      ['Réaliser une maquette', { mots: ['maquette', 'wireframe'] }],
      ['Créer un prototype', { mots: ['prototype', 'prototypage'] }],
      ['Composer une photographie', { mots: ['photo', 'photographie', 'photographe'] }],
      ['Réaliser un montage vidéo', { taxo: ['creativite_et_innovation', 'numeriques_et_informatiques'], mots: ['video', 'montage', 'film'] }],
      ['Concevoir un contenu éditorial', { mots: ['editorial', 'contenu', 'ligne editoriale'] }],
      ['Créer une ambiance ou une scénographie', { mots: ['scenographie', 'ambiance', 'decor', 'vitrine'] }],
    ],
  },
  {
    id: 'fabrication',
    libelle: 'Fabrication et savoir-faire techniques',
    taxo: ['techniques_et_manuelles'],
    mots: ['technique', 'manuel', 'fabriquer', 'fabrication', 'atelier', 'bricolage'],
    savoirs: [
      ['Lire un plan technique', { mots: ['plan technique', 'schema'] }],
      ['Prendre des mesures', { mots: ['mesurer', 'metrer'] }],
      ['Effectuer des tracés', { mots: ['tracer', 'trace'] }],
      ['Utiliser des outils manuels', { mots: ['outils', 'outil'] }],
      ['Utiliser des machines', { mots: ['machine', 'machines', 'machines outils'] }],
      ['Découper des matériaux', { mots: ['decouper', 'decoupe', 'scier'] }],
      ['Assembler des éléments', { mots: ['assembler', 'assemblage', 'monter'] }],
      ['Transformer des matériaux', { mots: ['bois', 'metal', 'materiaux', 'faconner'] }],
      ['Installer des équipements', { mots: ['installation', 'installer', 'poser'] }],
      ['Effectuer des finitions', { mots: ['finitions', 'peinture', 'vernir'] }],
      ['Diagnostiquer une panne', { mots: ['panne', 'pannes', 'depanner'] }],
      ['Réparer un équipement', { mots: ['reparer', 'reparation'] }],
      ['Effectuer des opérations de maintenance', { mots: ['maintenance', 'entretien'] }],
      ['Contrôler la qualité d’une réalisation', { taxo: ['techniques_et_manuelles', 'juridiques_reglementaires_et_securite'], mots: ['qualite', 'controle'] }],
    ],
  },
  {
    id: 'numerique',
    libelle: 'Numérique et informatique',
    taxo: ['numeriques_et_informatiques'],
    mots: ['numerique', 'informatique', 'ordinateur', 'logiciel', 'digital', 'web'],
    savoirs: [
      ['Utiliser un traitement de texte', { mots: ['word', 'traitement de texte'] }],
      ['Construire un tableau de calcul', { mots: ['excel', 'tableur', 'tableau'] }],
      ['Créer un support de présentation', { mots: ['powerpoint', 'diaporama', 'slides'] }],
      ['Utiliser un logiciel métier', { mots: ['erp', 'crm', 'logiciel'] }],
      ['Gérer une base de données', { mots: ['base de donnees', 'sql'] }],
      ['Administrer un site internet', { mots: ['site', 'wordpress', 'site web'] }],
      ['Gérer des réseaux sociaux', { mots: ['reseaux sociaux', 'instagram', 'linkedin', 'community manager'] }],
      ['Programmer une application', { mots: ['programmer', 'coder', 'developpeur', 'code', 'programmation'] }],
      ['Automatiser des tâches', { mots: ['automatiser', 'automatisation', 'script'] }],
      ['Utiliser un logiciel de conception', { mots: ['cao', 'dao', 'autocad', 'photoshop', 'figma'] }],
      ['Paramétrer des équipements informatiques', { mots: ['reseau informatique', 'parametrer', 'installer un poste'] }],
      ['Utiliser des outils d’intelligence artificielle', { mots: ['ia', 'intelligence artificielle', 'chatgpt'] }],
    ],
  },
  {
    id: 'relations',
    libelle: 'Relations humaines et accompagnement',
    taxo: ['relationnelles_et_communication', 'pedagogie_et_accompagnement'],
    mots: ['accompagner', 'accompagnement', 'relation', 'ecoute', 'social', 'aider'],
    savoirs: [
      ['Conduire un entretien individuel', { mots: ['entretien'] }],
      ['Pratiquer l’écoute active', { mots: ['ecoute', 'ecouter'] }],
      ['Identifier les besoins d’une personne', { mots: ['besoins'] }],
      ['Accompagner une personne dans ses démarches', { mots: ['demarches', 'insertion'] }],
      ['Accueillir et orienter un public', { mots: ['accueil', 'accueillir', 'orienter'] }],
      ['Gérer une situation conflictuelle', { mots: ['conflit', 'conflits', 'tensions'] }],
      'Adapter son accompagnement à une personne',
      ['Instaurer une relation de confiance', { mots: ['confiance'] }],
      ['Accompagner une personne en difficulté', { mots: ['difficulte', 'vulnerable', 'precarite'] }],
      ['Réaliser une médiation', { mots: ['mediation', 'mediateur'] }],
    ],
  },
  {
    id: 'pedagogie',
    libelle: 'Pédagogie et transmission',
    taxo: ['pedagogie_et_accompagnement'],
    mots: ['former', 'formation', 'enseigner', 'pedagogie', 'transmettre', 'apprendre'],
    savoirs: [
      ['Concevoir un support pédagogique', { mots: ['support de cours', 'e learning'] }],
      ['Construire un programme de formation', { mots: ['programme', 'ingenierie de formation'] }],
      ['Animer un atelier', { mots: ['atelier', 'ateliers'] }],
      ['Expliquer une méthode ou un savoir-faire', { mots: ['expliquer', 'explication'] }],
      ['Faire une démonstration technique', { mots: ['demonstration', 'demo'] }],
      ['Évaluer des acquis', { mots: ['evaluation', 'evaluer', 'examen'] }],
      'Adapter une méthode pédagogique',
      ['Accompagner une personne dans son apprentissage', { mots: ['tutorat', 'tuteur', 'apprenti', 'mentorat'] }],
    ],
  },
  {
    id: 'management',
    libelle: 'Management et pilotage',
    taxo: ['management_et_leadership'],
    mots: ['manager', 'management', 'equipe', 'diriger', 'encadrer', 'piloter'],
    savoirs: [
      ['Fixer des objectifs à une équipe', { mots: ['objectifs'] }],
      ['Déléguer des missions', { mots: ['deleguer', 'delegation'] }],
      ['Animer un collectif de travail', { mots: ['collectif', 'animer une equipe'] }],
      ['Conduire un entretien professionnel', { mots: ['entretien annuel', 'entretien professionnel'] }],
      ['Évaluer le travail d’un collaborateur', { mots: ['evaluer', 'evaluation'] }],
      ['Recruter un collaborateur', { mots: ['recruter', 'recrutement', 'embaucher'] }],
      ['Accompagner un changement', { mots: ['conduite du changement', 'changement', 'transformation'] }],
      ['Arbitrer entre plusieurs priorités', { mots: ['arbitrer', 'arbitrage'] }],
      ['Construire une stratégie de développement', { mots: ['strategie', 'developpement'] }],
      ['Piloter la performance d’une activité', { mots: ['performance', 'rentabilite', 'resultats'] }],
    ],
  },
  {
    id: 'qualite',
    libelle: 'Qualité, réglementation et sécurité',
    taxo: ['juridiques_reglementaires_et_securite'],
    mots: ['qualite', 'reglementation', 'securite', 'normes', 'juridique', 'droit'],
    savoirs: [
      ['Appliquer une réglementation', { mots: ['loi', 'reglementation', 'normes', 'juridique'] }],
      ['Rédiger un protocole', { mots: ['protocole'] }],
      ['Contrôler la conformité d’un document', { mots: ['conformite'] }],
      ['Réaliser un audit', { mots: ['audit', 'auditer'] }],
      ['Identifier des risques professionnels', { mots: ['risques professionnels', 'document unique'] }],
      ['Appliquer des règles d’hygiène', { mots: ['hygiene', 'haccp'] }],
      ['Mettre en œuvre des mesures de prévention', { mots: ['prevention'] }],
      ['Réaliser des contrôles de sécurité', { mots: ['securite', 'controles'] }],
      ['Assurer une veille réglementaire', { mots: ['veille'] }],
    ],
  },
  {
    id: 'sciences',
    libelle: 'Sciences et expérimentation',
    taxo: ['scientifiques_et_mathematiques'],
    mots: ['science', 'sciences', 'scientifique', 'laboratoire', 'recherche', 'experience'],
    savoirs: [
      ['Appliquer une méthode scientifique', { mots: ['methode scientifique', 'rigueur scientifique'] }],
      ['Réaliser une expérimentation', { mots: ['experimentation', 'experience', 'essais', 'tests'] }],
      ['Effectuer des prélèvements', { mots: ['prelevement', 'prelevements', 'echantillons'] }],
      ['Réaliser des mesures techniques', { mots: ['mesures', 'metrologie'] }],
      ['Utiliser des instruments de mesure', { mots: ['instruments', 'microscope'] }],
      ['Formuler des hypothèses', { mots: ['hypotheses'] }],
      ['Interpréter des résultats expérimentaux', { mots: ['resultats', 'analyses'] }],
      ['Rédiger un rapport scientifique', { mots: ['rapport', 'publication'] }],
    ],
  },
  {
    id: 'vivant',
    libelle: 'Soin et intervention auprès du vivant',
    taxo: ['physiques_et_sensorielles', 'techniques_et_manuelles'],
    mots: ['soin', 'soins', 'soigner', 'vivant', 'animaux', 'plantes', 'nature', 'cuisine'],
    savoirs: [
      ['Réaliser des gestes de premiers secours', { mots: ['secourisme', 'premiers secours', 'sst', 'urgence'] }],
      ['Assurer des soins d’hygiène et de confort', { mots: ['toilette', 'aide soignant', 'confort'] }],
      ['Observer l’état d’une personne ou d’un animal', { mots: ['surveiller', 'observer'] }],
      ['Préparer des produits alimentaires', { mots: ['cuisine', 'cuisiner', 'alimentaire', 'patisserie', 'boulangerie'] }],
      ['Appliquer des techniques de culture', { mots: ['culture', 'cultiver', 'agriculture', 'maraichage', 'semis'] }],
      ['Entretenir des espaces végétalisés', { mots: ['jardin', 'jardiner', 'espaces verts', 'paysage'] }],
      ['Assurer les soins courants aux animaux', { mots: ['animaux', 'elevage', 'soins aux animaux'] }],
      ['Utiliser des équipements de protection', { mots: ['epi', 'protection'] }],
    ],
  },
]

export const SAVOIR_FAMILLES = FAMILLES_SAVOIRS.map((f) => ({
  ...f,
  savoirs: f.savoirs.map((s) => {
    const [libelle, opts = {}] = Array.isArray(s) ? s : [s]
    return {
      id: slug(libelle),
      libelle,
      famille: f.id,
      taxo: opts.taxo || f.taxo,
      mots: opts.mots || [],
    }
  }),
}))

export const SAVOIRS = Object.fromEntries(SAVOIR_FAMILLES.flatMap((f) => f.savoirs.map((s) => [s.id, s])))

// ---------------------------------------------------------------------------
// Dimension 3 — Mes centres d'intérêt
// ---------------------------------------------------------------------------

const ci = (libelle, emoji, fond, taxo, mots) => ({ id: slug(libelle), libelle, emoji, fond, taxo, mots })

export const INTERETS = [
  ci('Nature et environnement', '🌿', 'emerald', ['nature_et_plein_air', 'environnement_et_ecologie'], ['nature', 'environnement', 'ecologie', 'plein air', 'foret']),
  ci('Animaux et monde vivant', '🦊', 'amber', ['animaux'], ['animaux', 'animal', 'chevaux', 'chiens', 'faune']),
  ci('Sciences et recherche', '🔬', 'blue', ['sciences_et_decouvertes'], ['sciences', 'science', 'recherche scientifique', 'physique', 'chimie', 'biologie']),
  ci('Technologies et numérique', '💻', 'teal', ['technologies_et_numerique'], ['technologie*', 'numerique', 'informatique', 'tech']),
  ci('Mécanique et transports', '⚙️', 'sky', ['mecanique_et_machines', 'vehicules_et_transports'], ['mecanique', 'moteur*', 'voiture*', 'transport*', 'avion*', 'trains']),
  ci('Architecture, habitat et décoration', '🏡', 'rose', ['construction_et_bricolage'], ['architecture', 'habitat', 'maison*', 'decoration', 'batiment']),
  ci('Art et design', '🎨', 'rose', ['art_dessin_et_creation'], ['art', 'arts', 'design', 'dessin', 'peinture']),
  ci('Musique et spectacle', '🎭', 'blue', ['musique_et_spectacle'], ['musique', 'spectacle*', 'theatre', 'concert*', 'danse']),
  ci('Mode et beauté', '👗', 'rose', ['mode_et_beaute'], ['mode', 'beaute', 'couture', 'cosmetique*', 'coiffure']),
  ci('Cuisine et gastronomie', '🍳', 'amber', ['cuisine_et_gastronomie'], ['cuisine', 'gastronomie', 'patisserie', 'vin', 'recettes']),
  ci('Sport et loisirs', '⚽', 'emerald', ['sport_et_activite_physique', 'aventure_et_sensations_fortes'], ['sport*', 'loisirs', 'randonnee', 'football']),
  ci('Voyages, langues et cultures', '🌍', 'sky', ['voyages_et_cultures_du_monde', 'langues_etrangeres'], ['voyage*', 'langues', 'cultures', 'etranger', 'international']),
  ci('Histoire et patrimoine', '🏛️', 'amber', ['lecture_ecriture_et_histoire'], ['histoire', 'patrimoine', 'archeologie', 'musee*']),
  ci('Littérature et médias', '📚', 'teal', ['lecture_ecriture_et_histoire', 'communication_medias_et_reseaux_sociaux'], ['litterature', 'livres', 'lecture', 'medias', 'journalisme', 'presse']),
  ci('Jeux et stratégie', '♟️', 'blue', ['jeux_logique_et_strategie'], ['jeux', 'jeu', 'strategie', 'echecs', 'enigmes', 'jeux video']),
  ci('Économie et entrepreneuriat', '📈', 'sky', ['commerce_economie_et_argent', 'organisation_et_gestion'], ['economie', 'entrepreneuriat', 'finance', 'bourse', 'start up']),
  ci('Droit et politique', '⚖️', 'teal', ['droit_et_justice', 'societe_politique_et_actualite'], ['droit', 'justice', 'politique', 'lois']),
  ci('Santé et corps humain', '🩺', 'emerald', ['sante_et_corps_humain'], ['sante', 'medecine', 'corps humain', 'bien etre']),
  ci('Psychologie et relations humaines', '💬', 'rose', ['psychologie_et_relations_humaines'], ['psychologie', 'relations humaines', 'comportement*']),
  ci('Éducation et société', '🎓', 'amber', ['enfance_et_education', 'societe_politique_et_actualite'], ['education', 'enfants', 'enfance', 'societe', 'ecole']),
]

export const INTERETS_BY_ID = Object.fromEntries(INTERETS.map((x) => [x.id, x]))

// ---------------------------------------------------------------------------
// Dimension 4 — Ce qui donne du sens à mon travail
// ---------------------------------------------------------------------------

const co = (libelle, taxo, mots) => ({ id: slug(libelle), libelle, taxo, mots })

export const CONTRIBUTIONS = [
  co('Améliorer la qualité de vie des personnes.', ['aider_les_personnes_vulnerables', 'apporter_du_bien_etre_et_du_plaisir'], ['qualite de vie']),
  co('Favoriser la santé et le bien-être.', ['prendre_soin_de_la_sante'], ['sante', 'bien etre']),
  co('Réduire les inégalités et favoriser l’inclusion.', ['aider_les_personnes_vulnerables', 'defendre_la_justice_et_les_droits'], ['inegalites', 'inclusion', 'handicap', 'insertion', 'solidarite']),
  co('Défendre les droits et les libertés.', ['defendre_la_justice_et_les_droits'], ['droits', 'libertes', 'justice']),
  co('Préserver l’environnement et le vivant.', ['proteger_l_environnement_et_le_climat', 'proteger_les_animaux'], ['environnement', 'planete', 'climat', 'biodiversite', 'ecologie', 'vivant']),
  co('Favoriser l’accès à l’éducation et au savoir.', ['transmettre_et_eduquer'], ['education', 'savoir', 'enseignement']),
  co('Faire progresser les connaissances et la société.', ['faire_progresser_la_connaissance', 'innover_grace_a_la_technologie'], ['connaissances', 'progres', 'recherche']),
  co('Contribuer à la sécurité des personnes.', ['proteger_et_assurer_la_securite'], ['securite', 'proteger les gens']),
  co('Améliorer les lieux et les conditions de vie.', ['construire_et_ameliorer_le_cadre_de_vie'], ['cadre de vie', 'logement', 'ville', 'urbanisme']),
  co('Préserver la culture et le patrimoine.', ['faire_vivre_la_culture_et_la_beaute', 'preserver_les_savoir_faire_et_le_patrimoine'], ['culture', 'patrimoine', 'savoir faire']),
  co('Favoriser le lien social et le vivre-ensemble.', ['creer_du_lien_entre_les_personnes'], ['lien social', 'vivre ensemble', 'lien']),
  co('Faciliter le quotidien et répondre aux besoins essentiels.', ['faire_fonctionner_les_services_essentiels', 'nourrir_les_gens'], ['quotidien', 'besoins essentiels', 'nourrir', 'service public']),
  co('Contribuer au développement économique.', ['developper_l_economie_et_l_emploi_local', 'innover_grace_a_la_technologie'], ['economie', 'emploi', 'territoire', 'developpement economique']),
  co('Apporter de la beauté, du plaisir et des émotions.', ['apporter_du_bien_etre_et_du_plaisir', 'faire_vivre_la_culture_et_la_beaute'], ['beaute', 'plaisir', 'emotions', 'faire rever']),
]

export const CONTRIBUTIONS_BY_ID = Object.fromEntries(CONTRIBUTIONS.map((x) => [x.id, x]))

// ---------------------------------------------------------------------------
// Dimension 5 — Mes motivations professionnelles
// ---------------------------------------------------------------------------

// `contexte: true` : motivation qui dépend surtout de l'employeur, du contrat ou du contexte ;
// elle ne peut pas être évaluée de façon fiable à l'échelle d'un métier (« point à approfondir »).
const mo = (libelle, definition, icone, taxo, mots, contexte = false) => ({ id: slug(libelle), libelle, definition, icone, taxo, mots, contexte })

export const MOTIVATIONS = [
  mo('Sécurité', 'Avoir une situation professionnelle stable et rassurante.', '🛡️', ['stabilite_et_securite_de_l_emploi'], ['stabilite', 'stable', 'securite de l emploi', 'cdi'], true),
  mo('Rémunération', 'Disposer de revenus satisfaisants.', '💶', ['bonne_remuneration'], ['salaire', 'remuneration', 'gagner', 'revenus', 'argent'], true),
  mo('Reconnaissance', 'Se sentir valorisé pour son travail.', '🏅', ['reconnaissance_et_prestige'], ['reconnaissance', 'reconnu', 'valorise'], true),
  mo('Accomplissement', 'Être fier de ses réalisations et voir les résultats de son travail.', '🏔️', ['voir_des_resultats_concrets'], ['concret', 'concrete', 'resultats', 'fier', 'fierte']),
  mo('Apprentissage', 'Découvrir de nouvelles choses et développer ses compétences.', '🌱', ['apprendre_en_continu'], ['apprendre', 'decouvrir', 'nouveautes']),
  mo('Évolution', 'Progresser et accéder à de nouvelles opportunités.', '📈', ['evoluer_et_prendre_des_responsabilites'], ['evoluer', 'evolution', 'progresser', 'carriere']),
  mo('Challenge', 'Se dépasser et relever des défis.', '🎯', ['relever_des_defis', 'action_et_adrenaline'], ['defi', 'defis', 'challenge', 'depasser']),
  mo('Liberté', 'Pouvoir faire ses propres choix professionnels.', '🕊️', ['autonomie_et_liberte_d_organisation', 'etre_son_propre_patron'], ['liberte', 'libre', 'independance', 'mon propre patron']),
  mo('Appartenance', 'Se sentir intégré et partager une aventure collective.', '🤝', ['travailler_en_equipe'], ['appartenance', 'collectif', 'aventure collective']),
  mo('Équilibre de vie', 'Préserver du temps et de l’énergie pour sa vie personnelle.', '⚖️', ['equilibre_vie_professionnelle_vie_personnelle'], ['equilibre', 'vie personnelle', 'vie de famille', 'temps pour moi'], true),
  mo('Épanouissement', 'Prendre du plaisir dans son activité professionnelle.', '🌻', ['exprimer_sa_creativite', 'variete_des_missions'], ['epanouissement', 'epanouir', 'plaisir'], true),
  mo('Expertise', 'Approfondir un domaine et devenir une référence.', '🔎', ['expertise_et_maitrise_d_un_sujet'], ['expertise', 'expert', 'approfondir', 'reference']),
]

export const MOTIVATIONS_BY_ID = Object.fromEntries(MOTIVATIONS.map((x) => [x.id, x]))
export const MAX_PRIORITES = 3

// ---------------------------------------------------------------------------
// Dimension 6 — Mes conditions de travail idéales
// ---------------------------------------------------------------------------

/** Importance d'un critère de condition renseigné. */
export const IMPORTANCES = [
  { id: 'souhaitable', libelle: 'Souhaitable' },
  { id: 'indispensable', libelle: 'Indispensable' },
]

// Échelles de 3 ou 4 valeurs de taxonomies.json, ventilées sur les 5 positions du curseur.
const sur5 = (a, b, c) => [[a], [a, b], [b], [b, c], [c]]

// Curseurs à 5 positions. `taxo` : critère de taxonomies.json ; `valeurs[i]` : valeurs du métier
// compatibles avec la position i+1 ; `phrases[i]` : formulation affichée sous le curseur.
const cu = (id, libelle, gauche, droite, taxo, valeurs, phrases) => ({ id, libelle, gauche, droite, taxo, valeurs, phrases })

export const CURSEUR_GROUPES = [
  {
    id: 'environnement',
    libelle: 'Mon environnement de travail',
    curseurs: [
      cu('lieu', 'Lieu de travail', 'Bureau', 'Terrain', 'bureau_terrain', sur5('bureau', 'mixte', 'terrain'), [
        'Je souhaite travailler essentiellement au bureau.',
        'Je souhaite travailler plutôt au bureau, avec un peu de terrain.',
        'Je souhaite partager mon temps entre bureau et terrain.',
        'Je souhaite être plutôt sur le terrain.',
        'Je souhaite être essentiellement sur le terrain.',
      ]),
      cu('environnement', 'Environnement', 'Intérieur', 'Extérieur', 'interieur_exterieur', sur5('interieur', 'mixte', 'exterieur'), [
        'Je souhaite travailler en intérieur.',
        'Je souhaite travailler plutôt en intérieur.',
        'Je souhaite alterner intérieur et extérieur.',
        'Je souhaite travailler plutôt en extérieur.',
        'Je souhaite travailler en extérieur.',
      ]),
      cu('ecrans', 'Utilisation des écrans', 'Très peu', 'Très fréquente', 'ecran', sur5('faible', 'modere', 'important'), [
        'Je souhaite utiliser très peu les écrans.',
        'Je souhaite utiliser les écrans de façon limitée.',
        'Une utilisation modérée des écrans me convient.',
        'Une utilisation fréquente des écrans me convient.',
        'Je souhaite travailler la majorité du temps sur écran.',
      ]),
      cu('manuel', 'Travail manuel', 'Aucun', 'Très fréquent', 'manuel', sur5('faible', 'modere', 'important'), [
        'Je ne souhaite pas de travail manuel.',
        'Je souhaite un peu de travail manuel.',
        'Je souhaite une part de travail manuel.',
        'Je souhaite un travail souvent manuel.',
        'Je souhaite un travail essentiellement manuel.',
      ]),
      cu('physique', 'Sollicitations physiques', 'Faibles', 'Importantes', 'activite_physique', sur5('faible', 'moderee', 'intense'), [
        'Je souhaite un travail peu physique.',
        'Je souhaite des sollicitations physiques plutôt faibles.',
        'Des sollicitations physiques modérées me conviennent.',
        'Je souhaite un travail plutôt physique.',
        'Je souhaite un travail très physique.',
      ]),
    ],
  },
  {
    id: 'relations',
    libelle: 'Mes relations et responsabilités',
    curseurs: [
      cu('contact', 'Contact humain', 'Limité', 'Permanent', 'relations_humaines', sur5('faibles', 'moderees', 'intenses'), [
        'Je souhaite des contacts humains limités.',
        'Je souhaite des contacts humains plutôt ponctuels.',
        'Je souhaite des contacts humains réguliers.',
        'Je souhaite des contacts humains fréquents.',
        'Je souhaite être en contact permanent avec des personnes.',
      ]),
      cu('collectif', 'Organisation collective', 'Seul', 'En équipe', 'individuel_collectif', sur5('individuel', 'mixte', 'collectif'), [
        'Je souhaite travailler seul.',
        'Je souhaite travailler plutôt seul.',
        'Je souhaite alterner travail seul et en équipe.',
        'Je souhaite travailler plutôt en équipe.',
        'Je souhaite travailler en équipe.',
      ]),
      cu('autonomie', 'Autonomie', 'Travail encadré', 'Grande autonomie', 'autonomie', sur5('faible', 'moyenne', 'elevee'), [
        'Je souhaite un travail encadré, avec des consignes claires.',
        'Je souhaite un travail plutôt encadré.',
        'Je souhaite une autonomie modérée.',
        'Je souhaite une bonne autonomie.',
        'Je souhaite une grande autonomie.',
      ]),
      cu('responsabilites', 'Responsabilités', 'Limitées', 'Importantes', 'responsabilites', sur5('faibles', 'moyennes', 'elevees'), [
        'Je souhaite des responsabilités limitées.',
        'Je souhaite des responsabilités plutôt limitées.',
        'Je souhaite des responsabilités modérées.',
        'Je souhaite des responsabilités plutôt importantes.',
        'Je souhaite des responsabilités importantes.',
      ]),
      cu('management', 'Management', 'Aucun', 'Encadrement d’équipe', 'management', sur5('aucun', 'coordination', 'equipe'), [
        'Je ne souhaite pas encadrer de personnes.',
        'Je souhaite peu ou pas d’encadrement.',
        'Je souhaite coordonner d’autres personnes, sans forcément les encadrer.',
        'Je souhaite plutôt encadrer une équipe.',
        'Je souhaite encadrer une équipe.',
      ]),
    ],
  },
  {
    id: 'rythme',
    libelle: 'Mon rythme de travail',
    note: 'Le rythme et l’intensité sont séparés : une activité peut être intense mais prévisible, ou imprévisible sans être constamment intense.',
    curseurs: [
      cu('diversite', 'Diversité des missions', 'Répétitives', 'Très variées', 'missions', sur5('repetitives', 'equilibrees', 'variees'), [
        'Je souhaite des missions répétitives, bien connues.',
        'Je souhaite des missions plutôt répétitives.',
        'Je souhaite un équilibre entre routine et nouveauté.',
        'Je souhaite des missions plutôt variées.',
        'Je souhaite des missions très variées.',
      ]),
      cu('previsibilite', 'Prévisibilité du rythme', 'Prévisible', 'Imprévisible', 'rythme', [['regulier'], ['regulier'], ['regulier', 'pics'], ['pics', 'soutenu'], ['pics']], [
        'Je souhaite un rythme très prévisible.',
        'Je souhaite un rythme plutôt prévisible.',
        'Je souhaite un rythme en partie prévisible.',
        'Un rythme plutôt imprévisible me convient.',
        'Je souhaite un rythme imprévisible, fait d’imprévus.',
      ]),
      cu('intensite', 'Intensité du travail', 'Modérée', 'Soutenue', 'rythme', [['regulier'], ['regulier', 'pics'], ['regulier', 'pics'], ['pics', 'soutenu'], ['soutenu']], [
        'Je souhaite une intensité de travail modérée.',
        'Je souhaite une intensité plutôt modérée.',
        'Je souhaite une intensité intermédiaire.',
        'Une intensité plutôt soutenue me convient.',
        'Je souhaite un travail à l’intensité soutenue.',
      ]),
      cu('deplacements', 'Déplacements', 'Aucun', 'Très fréquents', 'deplacements', [['aucun'], ['aucun', 'occasionnels'], ['occasionnels'], ['frequents'], ['frequents', 'permanents']], [
        'Je ne souhaite pas me déplacer.',
        'Je souhaite des déplacements rares.',
        'Je souhaite des déplacements occasionnels.',
        'Je souhaite des déplacements réguliers.',
        'Je souhaite des déplacements très fréquents.',
      ]),
      cu('teletravail', 'Télétravail', 'Aucun', 'Total', 'teletravail', [['impossible'], ['impossible', 'ponctuel'], ['ponctuel', 'partiel'], ['partiel', 'majoritaire'], ['majoritaire']], [
        'Je ne souhaite pas de télétravail.',
        'Je souhaite un télétravail ponctuel.',
        'Je souhaite quelques jours de télétravail.',
        'Je souhaite une majorité de télétravail.',
        'Je souhaite travailler entièrement à distance.',
      ]),
    ],
  },
]

export const CURSEURS = Object.fromEntries(CURSEUR_GROUPES.flatMap((g) => g.curseurs.map((c) => [c.id, { ...c, groupe: g.id }])))

// Cadre d'emploi : boutons cliquables (valeurs non progressives).
// `exclusion: true` : chaque option peut aussi être marquée « À éviter ».
// Chaque option renvoie vers des valeurs de taxonomies.json (`taxo` : [critère, valeurs])
// et, si utile, vers des contextes de travail officiels du ROME (`rome`).
const op = (id, libelle, taxo, rome) => ({ id, libelle, taxo, rome })

export const CHOIX_GROUPES = [
  {
    id: 'temps',
    libelle: 'Temps de travail',
    options: [
      op('temps_plein', 'Temps plein', ['temps_travail', ['temps_plein', 'horaires_longs']]),
      op('temps_partiel', 'Temps partiel', ['temps_travail', ['temps_partiel']]),
    ],
  },
  {
    id: 'horaires',
    libelle: 'Horaires',
    exclusion: true,
    options: [
      op('reguliers', 'Horaires réguliers', ['horaires', ['reguliers']], ['Travail en journée']),
      op('flexibles', 'Horaires flexibles', null),
      op('decales', 'Horaires décalés', ['horaires', ['decales']], ['Travail en horaires décalés', 'Travail par roulement', 'Travail posté']),
      op('nuit', 'Travail de nuit', ['horaires', ['nuit_weekend']], ['Travail de nuit']),
      op('weekend', 'Travail le week-end', ['horaires', ['nuit_weekend']], ['Travail les week-ends', 'Travail le samedi', 'Travail le dimanche']),
      op('astreintes', 'Astreintes', null, ['Travail en astreinte', 'Mobilisable en urgence']),
    ],
  },
  {
    id: 'statut',
    libelle: 'Statut professionnel',
    options: [
      op('prive', 'Salarié du secteur privé', ['statut', ['salarie_prive']], ['Salarié secteur privé']),
      op('public', 'Agent public', ['statut', ['fonction_publique']], ['Salarié secteur public', 'Fonctionnaire']),
      op('independant', 'Indépendant ou libéral', ['statut', ['independant']], ['Travailleur indépendant', 'Profession libérale']),
      op('entrepreneur', 'Entrepreneur', ['statut', ['independant']], ['Travailleur indépendant']),
    ],
  },
  {
    id: 'structure',
    libelle: 'Type de structure',
    options: [
      op('tpe', 'Très petite entreprise', ['taille_structure', ['tpe']]),
      op('pme', 'PME', ['taille_structure', ['pme']]),
      op('grande', 'Grande entreprise', ['taille_structure', ['grande_entreprise']]),
      op('association', 'Association', ['statut', ['associatif']], ['Association']),
      op('organisme_public', 'Organisme public', ['taille_structure', ['administration']], ['Organisme public', 'Collectivités territoriales']),
    ],
  },
  {
    id: 'cadre',
    libelle: 'Cadre de travail',
    exclusion: true,
    options: [
      op('bureau', 'Bureau', ['cadre', ['bureau']]),
      op('atelier', 'Atelier ou usine', ['cadre', ['atelier_usine']], ['En atelier', 'En milieu industriel']),
      op('chantier', 'Chantier', ['cadre', ['chantier']], ['Sur chantier']),
      op('commerce', 'Commerce ou boutique', ['cadre', ['commerce']], ['Commerce de proximité']),
      op('sante', 'Établissement de santé ou médico-social', ['cadre', ['etablissement_sante_social']], ['Etablissement de santé', 'Etablissement social ou médico-social']),
      op('educatif', 'Établissement éducatif', ['cadre', ['etablissement_scolaire']]),
      op('domicile', 'Chez les clients ou à domicile', ['cadre', ['domicile_client']], ['Au domicile d']),
      op('nature', 'En pleine nature', ['cadre', ['nature']], ['En extérieur']),
      op('vehicule', 'Véhicule', ['cadre', ['vehicule']]),
      op('studio', 'Studio ou salle de spectacle', ['cadre', ['salle_spectacle_studio']]),
      op('restaurant', 'Cuisine ou restaurant', ['cadre', ['cuisine_salle']]),
      op('laboratoire', 'Laboratoire', ['cadre', ['laboratoire']], ['En laboratoire']),
    ],
  },
]

export const CHOIX = Object.fromEntries(CHOIX_GROUPES.map((g) => [g.id, { ...g, byId: Object.fromEntries(g.options.map((o) => [o.id, o])) }]))

/** États d'une option du cadre d'emploi. */
export const CHOIX_ETATS = { oui: 'Je souhaite', eviter: 'À éviter' }
