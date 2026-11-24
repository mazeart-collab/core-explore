import { useEffect, useState } from 'react'

/** État React sauvegardé automatiquement dans localStorage (sans erreur si indisponible). */
export function useStoredState(key, initial, revive = (x) => x) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw) return revive(JSON.parse(raw))
    } catch {
      // stockage indisponible ou contenu invalide : on repart de la valeur initiale
    }
    return initial
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // navigation privée, quota dépassé… : la page continue de fonctionner sans sauvegarde
    }
  }, [key, value])

  return [value, setValue]
}
