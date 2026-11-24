/** Nettoie les textes ROME : doubles apostrophes ('' → ') et espaces superflus. */
export function clean(text) {
  if (text === null || text === undefined) return ''
  return String(text).replace(/''/g, "'").replace(/[ \t]+/g, ' ').trim()
}

/** Minuscules sans accents, pour comparer des textes. */
export function normalize(text) {
  return clean(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .toLowerCase()
}

/** Courte description : première phrase (ou début) de la définition. */
export function shortDescription(text, max = 220) {
  const t = clean(text).replace(/\n+/g, ' ')
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  return cut.slice(0, cut.lastIndexOf(' ')) + '…'
}
