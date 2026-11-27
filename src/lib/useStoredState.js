import { useEffect, useState } from 'react'

const store = (session) => (session ? window.sessionStorage : window.localStorage)

/**
 * État React sauvegardé automatiquement dans localStorage (sans erreur si indisponible).
 * `session: true` : sessionStorage, effacé à la fermeture de l'onglet (réponses personnelles).
 */
export function useStoredState(key, initial, revive = (x) => x, { session = false } = {}) {
  const [value, setValue] = useState(() => {
    try {
      const raw = store(session).getItem(key)
      if (raw) return revive(JSON.parse(raw))
    } catch {
      // stockage indisponible ou contenu invalide : on repart de la valeur initiale
    }
    return initial
  })

  useEffect(() => {
    try {
      store(session).setItem(key, JSON.stringify(value))
    } catch {
      // navigation privée, quota dépassé… : la page continue de fonctionner sans sauvegarde
    }
  }, [key, value, session])

  return [value, setValue]
}
