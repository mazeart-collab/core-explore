import { useEffect, useRef } from 'react'
import { useMetiers } from '../lib/MetiersContext'

export function Tag({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    teal: 'bg-teal-50 text-teal-800',
    amber: 'bg-amber-50 text-amber-800',
  }
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
}

export function PageTitle({ title, children }) {
  return (
    <div className="mb-8 max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
      {children && <div className="mt-3 text-slate-600">{children}</div>}
    </div>
  )
}

/** Affiche un état de chargement ou d'erreur tant que la base métiers n'est pas prête. */
export function DataGate({ children }) {
  const { status, error } = useMetiers()
  if (status === 'loading') return <p className="py-12 text-center text-slate-500">Chargement des métiers…</p>
  if (status === 'error')
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Impossible de charger la base métiers ({error}). Réessayez en rechargeant la page.
      </p>
    )
  return children
}

export const buttonPrimary =
  'inline-flex items-center justify-center rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-50'
export const buttonSecondary =
  'inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-50'

/**
 * Fenêtre de confirmation (balise <dialog> native : focus, Échap et fond gérés par le navigateur).
 * `open` pilote l'affichage ; onConfirm / onCancel sont appelés au clic.
 */
export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirmer', onConfirm, onCancel }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      onClick={(e) => e.target === ref.current && onCancel()}
      aria-labelledby="confirm-titre"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="p-5 sm:p-6">
        <h2 id="confirm-titre" className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        {children && <div className="mt-2 text-sm text-slate-600">{children}</div>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={buttonSecondary} onClick={onCancel} autoFocus>
            Annuler
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
