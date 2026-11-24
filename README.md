# CORE Explore

Application web d'exploration des métiers (React + Vite + Tailwind CSS), construite sur le référentiel officiel **ROME 4.0 de France Travail** (Open Data).

Les écrans ne sont pas encore construits : ce dépôt contient la structure du projet, les référentiels et le pipeline de construction de la base métiers.

## Démarrage

```bash
npm install
npm run dev        # application (écran provisoire)
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

## Sources et licence des données

ROME 4.0, France Travail, publié sous Licence Ouverte / Open Licence (Etalab). Fiches consultables sur [Métierscope](https://candidat.francetravail.fr/metierscope/).
