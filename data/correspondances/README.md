# Correspondances

`bmo_rome.csv` (à ajouter) : table de passage entre les codes métier de l'enquête BMO
(familles professionnelles FAP, par ex. `A0Z40`) et les codes ROME (par ex. `A1101`).

Format attendu : CSV (séparateur `;` ou `,`) avec une colonne de codes métier BMO / FAP
et une colonne de codes ROME, une ligne par couple. Un même code ROME peut apparaître
plusieurs fois, un même code BMO aussi. Les noms de colonnes sont détectés automatiquement
(par ex. `code_bmo;code_rome`). Exemple : `scripts/fixtures/marche-sample/bmo_rome.csv`.

Ce fichier est utilisé par `scripts/enrichir-marche.mjs` (workflow « 3. Mettre à jour le marché de l'emploi »).
