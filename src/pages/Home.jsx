import { Link } from 'react-router'
import { buttonPrimary, buttonSecondary } from '../components/ui'

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl py-8 text-center sm:py-16">
      <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
        Et si votre avenir professionnel avait plus de possibilités que vous ne l’imaginez&nbsp;?
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
        CORE Explore vous aide à ouvrir le champ des possibles. Parcourez librement les univers professionnels, ou
        partez de ce qui vous anime : ce que vous aimez faire, ce que vous savez faire, ce qui donne du sens à votre
        travail. Pas de test psychométrique ni de score : des pistes concrètes à découvrir, à votre rythme.
      </p>
      <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/univers" className={buttonPrimary}>
          Explorer les métiers
        </Link>
        <Link to="/ce-qui-m-anime" className={buttonSecondary}>
          Découvrir les métiers selon mes envies
        </Link>
      </div>

      <div className="mt-16 grid gap-4 text-left sm:grid-cols-3">
        {[
          ['Explorer', 'Parcourez les univers professionnels et cherchez un métier par son nom, ses activités ou ses savoirs.'],
          ['Se découvrir', 'Indiquez vos envies, vos compétences, vos motivations et les conditions de travail qui vous conviennent.'],
          ['Approfondir', 'Chaque fiche s’appuie sur le référentiel officiel ROME 4.0, avec un lien direct vers MétierScope.'],
        ].map(([title, text]) => (
          <div key={title} className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm text-slate-600">{text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
