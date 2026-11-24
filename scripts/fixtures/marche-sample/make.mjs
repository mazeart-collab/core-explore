// Génère un petit fichier BMO fictif (même structure que l'Open Data) pour tester le script hors ligne.
// Usage : node scripts/fixtures/marche-sample/make.mjs
import ExcelJS from 'exceljs'
const wb = new ExcelJS.Workbook()
const s = wb.addWorksheet('BMO_2026_open_data')
s.addRow(['Enquête BMO 2026 – données fictives de test'])
s.addRow(['annee', 'Code métier BMO', 'Nom métier BMO', 'Famille_met', 'Dept', 'NomDept', 'met', 'xmet', 'smet'])
const rows = [
  ['A0Z40', 'Agriculteurs salariés', 'A', '01', 'Ain', 120, 90, 40],
  ['A0Z40', 'Agriculteurs salariés', 'A', '02', 'Aisne', 80, 60, 30],
  ['J1Z80', 'Ouvriers qualifiés du magasinage', 'J', '01', 'Ain', 200, 100, '*'],
  ['J1Z80', 'Ouvriers qualifiés du magasinage', 'J', '02', 'Aisne', '*', '*', '*'],
  ['L5Z60', 'Employés de la banque et des assurances', 'L', '75', 'Paris', 300, 90, 0],
]
for (const r of rows) s.addRow([2026, ...r])
await wb.xlsx.writeFile(new URL('./bmo-sample.xlsx', import.meta.url).pathname)
console.log('bmo-sample.xlsx créé')
