import { useStoredState } from '../lib/useStoredState'

const STEPS = [
  {
    title: 'Exprimez vos envies',
    text: 'Décrivez votre idéal en une phrase ou cochez quelques critères. Rien n’est obligatoire.',
    icon: (
      <>
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
        <path d="M9 11h.01M12 11h.01M15 11h.01" />
      </>
    ),
  },
  {
    title: 'Affinez votre équilibre',
    text: 'Indiquez vos indispensables et vos « non-négociables » : ce que vous voulez absolument, ou éviter.',
    icon: (
      <>
        <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
        <circle cx="16" cy="6" r="2" />
        <circle cx="10" cy="12" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
  },
  {
    title: 'Explorez vos étoiles',
    text: 'Découvrez les métiers classés par affinité, et laissez-vous surprendre par des pistes inattendues.',
    icon: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />,
  },
]

/** Mini-tutoriel repliable ; l'état replié est mémorisé sur l'appareil. */
export default function Guide() {
  const [hidden, setHidden] = useStoredState('core-explore:guide-masque', false, Boolean)

  if (hidden)
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setHidden(false)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 17h.01" />
          </svg>
          Voir comment ça marche
        </button>
      </div>
    )

  return (
    <section aria-labelledby="guide-titre" className="rounded-xl border border-teal-100 bg-teal-50/50 p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 id="guide-titre" className="font-semibold text-slate-900">
          Comment trouver vos pistes en 3 étapes ?
        </h2>
        <button
          type="button"
          onClick={() => setHidden(true)}
          className="shrink-0 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          Masquer le guide
        </button>
      </div>
      <ol className="grid gap-3 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3 rounded-lg border border-white bg-white p-4 shadow-sm">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {step.icon}
              </svg>
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-teal-800 ring-1 ring-teal-200">
                {i + 1}
              </span>
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
