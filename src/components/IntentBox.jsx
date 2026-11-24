import { useState } from 'react'
import { buttonSecondary } from './ui'

/**
 * Recherche en langage naturel : la phrase est traduite en critères par /api/parse-intent.
 * Si l'API n'est pas disponible, un message discret s'affiche et le reste de la page fonctionne.
 */
export default function IntentBox({ onCriteria }) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState({ state: 'idle' })

  async function submit(e) {
    e.preventDefault()
    if (!text.trim()) return
    setStatus({ state: 'loading' })
    try {
      const r = await fetch('/api/parse-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      const data = await r.json().catch(() => null)
      if (!r.ok || !data?.criteres) {
        setStatus({ state: 'unavailable', message: data?.error })
        return
      }
      const added = onCriteria(data.criteres)
      setStatus({ state: 'done', added, resume: data.resume })
    } catch {
      setStatus({ state: 'unavailable' })
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <label htmlFor="intention" className="mb-2 block font-medium text-slate-900">
        Décrivez librement ce que vous recherchez <span className="font-normal text-slate-500">(facultatif)</span>
      </label>
      <textarea
        id="intention"
        rows={3}
        maxLength={1000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Décrivez librement votre métier idéal (ex: gérer des projets, garder un côté manuel, éviter les écrans toute la journée)..."
        className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
      />
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" className={buttonSecondary} disabled={!text.trim() || status.state === 'loading'}>
          {status.state === 'loading' ? 'Traduction en cours…' : 'Traduire en critères'}
        </button>
        <p className="text-sm text-slate-500" role="status" aria-live="polite">
          {status.state === 'done' &&
            (status.added
              ? `${status.added} critère${status.added > 1 ? 's' : ''} ajouté${status.added > 1 ? 's' : ''} ci-dessous. Vous pouvez les ajuster librement.`
              : 'Aucun nouveau critère identifié. Essayez de préciser votre description.')}
          {status.state === 'unavailable' &&
            'La traduction automatique n’est pas disponible pour le moment. Vous pouvez choisir vos critères ci-dessous.'}
        </p>
      </div>
      {status.state === 'done' && status.resume && (
        <p className="mt-2 text-sm italic text-slate-600">« {status.resume} »</p>
      )}
    </form>
  )
}
