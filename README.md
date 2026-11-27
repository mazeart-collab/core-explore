# CORE Explore

Application web d'exploration des métiers (React + Vite + Tailwind CSS), construite sur le référentiel officiel **ROME 4.0 de France Travail** (Open Data).

## Pages (V1)

| URL | Page |
| --- | --- |
| `/` | Accueil |
| `/univers` | Explorer les métiers : univers par familles, recherche tolérante aux fautes |
| `/metier/:code_rome` | Fiche métier (données officielles ROME et repères enrichis séparés) |
| `/ce-qui-m-anime` | Je trouve ce qui m'anime : portrait professionnel en six dimensions (`?etape=aime`, `savoirs`, `interets`, `sens`, `motivations`, `conditions`), synthèse (`?etape=synthese`), pistes (`?etape=resultats`) et description libre analysée sur l'appareil |
| `/a-propos` | À propos et sources |

Le référentiel du portrait (identifiants, synonymes, correspondances avec les étiquettes des métiers) est dans `src/lib/portrait/referentiel.js` ; l'analyse du pitch, sans service externe, dans `src/lib/portrait/pitch.js` (un fournisseur IA pourra s'y brancher) ; le moteur de recherche dans `src/lib/portrait/moteur.js` (pondération ajustable `POIDS`, jamais affichée). Tests : `npm test` (dont les tests 1 à 8 du brief, sur la vraie base métiers).

La fonction serveur `api/analyser-pitch.js` (Vercel) traduit la description libre du mode « Je décris mon projet » en critères du portrait, avec Claude Haiku (`claude-haiku-5-5`, modifiable par la variable `ANTHROPIC_MODEL`). Sans clé `ANTHROPIC_API_KEY`, ou si le service ne répond pas, la page analyse le texte sur l’appareil (mots-clés, synonymes, négations). Le texte n’est jamais journalisé.

## Déploiement sur Vercel

1. Sur vercel.com : **Add New… > Project**, importez le dépôt GitHub `core-explore`. Les réglages sont lus dans `vercel.json` (Vite, sortie `dist`) : rien à modifier.
2. Avant ou après le premier déploiement : **Settings > Environment Variables**, ajoutez `ANTHROPIC_API_KEY` (cochez Production et Preview), puis **Deployments > ⋯ > Redeploy** pour la prendre en compte.

Sans clé, le site fonctionne entièrement ; seul le bouton « Traduire en critères » affiche un message indiquant que la fonction n'est pas disponible.

## Démarrage

```bash
npm install
npm run dev        # application (la fonction /api n'est disponible qu'avec `vercel dev` ou une fois déployée)
```

Node.js 20.12 ou plus récent.

## Structure

| Dossier / fichier | Contenu |
| --- | --- |
| `data/taxonomies.json` | Référentiels du projet : 80 univers professionnels (8 familles), activités (7 catégories), 13 catégories de compétences, centres d'intérêt, sens / causes, motivations, 20 critères de conditions de travail |
| `data/rome_base.json` | Base officielle générée par `data:import` (non versionnée tant qu'elle n'a pas été générée) |
| `public/data/metiers.json` | Base finale enrichie, servie à l'application (générée par `data:enrich`) |
| `scripts/` | Pipeline de données |
| `scripts/fixtures/rome-sample/` | Petit échantillon fictif au format ROME, pour tester l'import sans téléchargement |

## Pipeline de données

### 1. Import officiel ROME 4.0

```bash
npm run data:import
```

Le script interroge le jeu de données [ROME sur data.gouv.fr](https://www.data.gouv.fr/datasets/repertoire-operationnel-des-metiers-et-des-emplois-rome), récupère la ressource « Toutes les données du ROME » au format CSV (archive ZIP publiée par France Travail), la met en cache dans `data/raw/`, puis génère `data/rome_base.json`. Il affiche le nombre exact de fiches et d'appellations importées.

Chaque fiche contient : `code_rome`, `intitule`, `appellations`, `definition`, `acces_metier`, `activites_rome` (savoir-faire, cœur de métier en premier), `competences_rome` (savoir-être professionnels et savoirs), `contextes_travail_rome`, `centres_interet_rome`, `secteurs_activite_rome`, `domaine_professionnel`, `lien_metierscope`, `source` et `date_import`.

Si le téléchargement automatique échoue (réseau, changement d'URL), téléchargez l'archive à la main depuis la page data.gouv.fr, puis :

```bash
node scripts/import-rome.js --from=chemin/vers/archive.zip   # ou un dossier de CSV décompressés
```

Options : `--refresh` (retélécharge), `--out=fichier.json`. Pour tester sur l'échantillon : `npm run data:import:sample`.

### 2. Enrichissement par IA (hors-ligne)

```bash
cp .env.example .env              # puis renseignez ANTHROPIC_API_KEY
npm run data:enrich -- --limit=20 # d'abord un test sur 20 métiers variés
npm run data:enrich               # puis tous les métiers restants
```

Le script associe chaque métier aux taxonomies (`secteurs`, `activites`, `competences_categories`, `centres_interet`, `sens_causes`, `motivations`, `conditions_travail`, `points_vigilance`) avec le modèle `claude-haiku-5-5` (modifiable avec `--model=` ou la variable `ANTHROPIC_MODEL`).

- **Traçabilité** : chaque métier de `public/data/metiers.json` sépare `officiel_rome` (données France Travail inchangées) et `enrichi_ia` (données générées, avec le modèle et la date).
- **Reprise** : chaque métier traité est enregistré aussitôt dans `data/.enrich-progress.jsonl`. Une relance reprend là où le run s'est arrêté sans repayer les métiers déjà faits. Ctrl+C arrête proprement.
- **Contrôle** : la réponse est contrainte par un schéma JSON, puis revérifiée ; toute valeur hors taxonomie est écartée et signalée.
- `conditions_travail` accepte `"variable"` (dépend de l'employeur) ou `null` (inconnu).

Autres options : `--dry-run` (affiche les prompts sans appel API), `--concurrency=4`, `--build-only` (régénère `metiers.json` depuis la progression).

### Lancer le pipeline depuis GitHub (sans terminal)

Deux workflows manuels sont disponibles dans l'onglet **Actions** du dépôt :

1. **« 1. Importer ROME 4.0 »** : génère `data/rome_base.json` et le committe sur la branche choisie.
2. **« 2. Enrichir les métiers »** : paramètre `limit` (`20` par défaut ; vide ou `all` pour tous les métiers restants). Committe `public/data/metiers.json` et `data/.enrich-progress.jsonl`, même si le run échoue ou est annulé, pour que le run suivant reprenne sans repayer.

3. **« 3. Mettre à jour le marché de l'emploi »** : ajoute à chaque métier un bloc `marche_emploi` (niveau de tension, indice France Travail de 1 à 5, offres sur 12 mois, demandeurs d'emploi de catégorie A, source et période) lu dans l'API gratuite « Marché du travail » de France Travail, sans IA. Les blocs `officiel_rome` et `enrichi_ia` ne sont jamais modifiés. Nécessite les secrets `FRANCE_TRAVAIL_CLIENT_ID` et `FRANCE_TRAVAIL_CLIENT_SECRET` (application créée sur francetravail.io avec l'API « Marché du travail »). Le champ « limite » permet un essai rapide sur quelques métiers.

   Les mêmes deux variables, ajoutées dans Vercel (Settings › Environment Variables), activent les chiffres par département de l'encart « Réalité du marché près de chez vous » (fonction `api/marche.js`, réponses mises en cache 7 jours). Sans elles, l'encart affiche les chiffres nationaux.

Prérequis pour le workflow 2 : ajouter la clé API dans **Settings > Secrets and variables > Actions > New repository secret**, nom `ANTHROPIC_API_KEY`.

## Sources et licence des données

ROME 4.0, France Travail, publié sous Licence Ouverte / Open Licence (Etalab). Fiches consultables sur [Métierscope](https://candidat.francetravail.fr/metierscope/).
