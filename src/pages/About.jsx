import { DataCount } from '../components/Layout'
import { PageTitle } from '../components/ui'
import { useMetiers } from '../lib/MetiersContext'

export default function About() {
  const { meta, status } = useMetiers()
  const dateImport = meta?.date_import_rome ? new Date(meta.date_import_rome).toLocaleDateString('fr-FR') : null

  return (
    <div className="max-w-3xl space-y-6">
      <PageTitle title="À propos de CORE Explore" />
      <p className="text-slate-700">
        CORE Explore est un outil d’exploration des métiers. Il ne cherche pas à vous évaluer ni à vous dire ce que
        vous devriez faire : il vous aide à découvrir des métiers auxquels vous n’auriez peut-être pas pensé, et à
        comprendre pourquoi ils pourraient vous intéresser.
      </p>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">D’où viennent les données ?</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>
            <strong>Données officielles</strong> : le Répertoire Opérationnel des Métiers et des Emplois (ROME 4.0) de
            France Travail, publié en Open Data sous Licence Ouverte
            {dateImport ? ` (import du ${dateImport})` : ''}. Intitulés, appellations, définitions, accès aux métiers,
            activités, compétences et contextes de travail en sont issus sans modification.
          </li>
          <li>
            <strong>Repères enrichis par IA</strong> : univers professionnels, activités, motivations, conditions de
            travail et points de vigilance sont proposés automatiquement par un modèle d’IA à partir des données
            officielles. Ils peuvent contenir des approximations et sont toujours présentés séparément.
          </li>
        </ul>
        {status === 'ready' && (
          <p className="mt-4 text-sm text-slate-500">
            Base actuelle : <DataCount />
            {meta && meta.complet === false ? ' (base en cours de constitution).' : '.'}
          </p>
        )}
      </section>

      <p className="text-sm text-slate-600">
        Pour la description complète et à jour de chaque métier, consultez{' '}
        <a
          href="https://candidat.francetravail.fr/metierscope/"
          className="font-medium text-teal-700 underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          MétierScope
        </a>
        , le site de France Travail.
      </p>
    </div>
  )
}
