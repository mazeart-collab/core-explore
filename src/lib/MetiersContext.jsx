import { createContext, useContext, useEffect, useState } from 'react'
import { getSearch } from './search'

const MetiersContext = createContext(null)

/** Charge public/data/metiers.json une seule fois pour toute l'application. */
export function MetiersProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', meta: null, metiers: [], byCode: {} })

  useEffect(() => {
    let cancelled = false
    fetch('/data/metiers.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        const metiers = (data.metiers || []).filter((m) => m.officiel_rome)
        setState({
          status: 'ready',
          meta: data.meta || null,
          metiers,
          byCode: Object.fromEntries(metiers.map((m) => [m.code_rome, m])),
        })
      })
      .catch((error) => {
        if (!cancelled) setState((s) => ({ ...s, status: 'error', error: String(error) }))
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Prépare l'index de recherche en arrière-plan dès que les données sont chargées.
  useEffect(() => {
    if (state.status !== 'ready') return
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200))
    const cancel = window.cancelIdleCallback || clearTimeout
    const id = idle(() => getSearch(state.metiers))
    return () => cancel(id)
  }, [state.status, state.metiers])

  return <MetiersContext.Provider value={state}>{children}</MetiersContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export const useMetiers = () => useContext(MetiersContext)
