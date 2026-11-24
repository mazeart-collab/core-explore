import { createContext, useContext, useEffect, useState } from 'react'

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

  return <MetiersContext.Provider value={state}>{children}</MetiersContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export const useMetiers = () => useContext(MetiersContext)
