import { createContext, useCallback, useContext, useMemo } from 'react'
import { useStoredState } from './useStoredState'

// « Mon panier de métiers » : favoris (avec note personnelle) et métiers écartés,
// sauvegardés sur l'appareil de l'utilisateur.
const SelectionContext = createContext(null)
const EMPTY = { favoris: {}, ecartes: {} } // { code_rome: { date, note? } }

function revive(raw) {
  const ok = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {})
  return { favoris: ok(raw?.favoris), ecartes: ok(raw?.ecartes) }
}

export function SelectionProvider({ children }) {
  const [selection, setSelection] = useStoredState('core-explore:selection:v1', EMPTY, revive)

  const toggle = useCallback(
    (list, code) =>
      setSelection((s) => {
        const other = list === 'favoris' ? 'ecartes' : 'favoris'
        const next = { favoris: { ...s.favoris }, ecartes: { ...s.ecartes } }
        if (next[list][code]) delete next[list][code]
        else {
          next[list][code] = { date: new Date().toISOString() }
          delete next[other][code] // un métier est soit gardé, soit écarté
        }
        return next
      }),
    [setSelection],
  )

  const value = useMemo(
    () => ({
      favoris: selection.favoris,
      ecartes: selection.ecartes,
      isFavori: (code) => Boolean(selection.favoris[code]),
      isEcarte: (code) => Boolean(selection.ecartes[code]),
      toggleFavori: (code) => toggle('favoris', code),
      toggleEcarte: (code) => toggle('ecartes', code),
      setNote: (code, note) =>
        setSelection((s) =>
          s.favoris[code] ? { ...s, favoris: { ...s.favoris, [code]: { ...s.favoris[code], note } } } : s,
        ),
    }),
    [selection, toggle, setSelection],
  )

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export const useSelection = () => useContext(SelectionContext)
