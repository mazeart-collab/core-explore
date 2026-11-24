import { useState } from 'react'
import { Link } from 'react-router'
import { SecteursTags } from '../components/MetierCard'
import { HeartIcon, ThumbDownIcon } from '../components/SelectionButtons'
import { DataGate, PageTitle, buttonPrimary, buttonSecondary } from '../components/ui'
import { useMetiers } from '../lib/MetiersContext'
import { useSelection } from '../lib/SelectionContext'
import { UNIVERS, label } from '../lib/taxonomies'
import { clean, shortDescription } from '../lib/text'

const byDate = (entries) => [...entries].sort((a, b) => (a[1].date < b[1].date ? 1 : -1))

/** Texte de la sélection, prêt à coller dans un e-mail. */
function selectionText(favoris, byCode) {
  const date = new Date().toLocaleDateString('fr-FR')
  const lines = [`Ma sélection de métiers – CORE Explore (${date})`, '']
  byDate(Object.entries(favoris)).forEach(([code, info], i) => {
    const m = byCode[code]
    if (!m) return
    lines.push(`${i + 1}. ${clean(m.intitule)} (code ROME ${code})`)
    const secteurs = (m.enrichi_ia?.secteurs || []).map((id) => label(UNIVERS, id))
    if (secteurs.length) lines.push(`   Univers : ${secteurs.join(', ')}`)
    if (info.note?.trim()) lines.push(`   Ma note : ${info.note.trim().replace(/\n+/g, ' / ')}`)
    if (m.officiel_rome.lien_metierscope) lines.push(`   Fiche officielle : ${m.officiel_rome.lien_metierscope}`)
    lines.push('')
  })
  return lines.join('\n')
}

function FavoriItem({ metier, info }) {
  const { setNote, toggleFavori } = useSelection()
  const id = `note-${metier.code_rome}`
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-5 print:break-inside-avoid print:border-slate-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">
            <Link to={`/metier/${metier.code_rome}`} className="hover:text-teal-700 hover:underline">
              {clean(metier.intitule)}
            </Link>
            <span className="ml-2 text-xs font-normal text-slate-500">Code ROME {metier.code_rome}</span>
          </h2>
          <SecteursTags metier={metier} />
          <p className="text-sm text-slate-600">{shortDescription(metier.officiel_rome.definition, 180)}</p>
        </div>
        <div className="flex shrink-0 gap-2 print:hidden">
          <Link to={`/metier/${metier.code_rome}`} className="text-sm font-medium text-teal-700 hover:underline">
            Voir la fiche
          </Link>
          <button
            type="button"
            onClick={() => toggleFavori(metier.code_rome)}
            className="text-sm font-medium text-slate-500 hover:text-rose-700"
          >
            Retirer
          </button>
        </div>
      </div>
      <label htmlFor={id} className="mt-4 block text-sm font-medium text-slate-700 print:hidden">
        Ma note <span className="font-normal text-slate-500">(ce qui m’attire, mes questions…)</span>
      </label>
      <textarea
        id={id}
        rows={2}
        value={info.note || ''}
        onChange={(e) => setNote(metier.code_rome, e.target.value)}
        placeholder="Ex. : le contact avec le public, se renseigner sur la formation…"
        className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 print:hidden"
      />
      {info.note?.trim() && (
        <p className="mt-3 hidden whitespace-pre-line text-sm text-slate-700 print:block">
          <strong>Ma note :</strong> {info.note}
        </p>
      )}
    </li>
  )
}

function PanierContent() {
  const { byCode } = useMetiers()
  const { favoris, ecartes, toggleEcarte } = useSelection()
  const [tab, setTab] = useState('favoris')
  const [copied, setCopied] = useState(null)

  const favs = byDate(Object.entries(favoris)).filter(([code]) => byCode[code])
  const outs = byDate(Object.entries(ecartes)).filter(([code]) => byCode[code])

  async function copy() {
    const text = selectionText(favoris, byCode)
    try {
      await navigator.clipboard.writeText(text)
      setCopied('ok')
    } catch {
      setCopied('error')
    }
    setTimeout(() => setCopied(null), 3000)
  }

  const tabClass = (active) =>
    `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${active ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div role="tablist" aria-label="Mon panier" className="inline-flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <button type="button" role="tab" aria-selected={tab === 'favoris'} className={tabClass(tab === 'favoris')} onClick={() => setTab('favoris')}>
            Mes favoris ({favs.length})
          </button>
          <button type="button" role="tab" aria-selected={tab === 'ecartes'} className={tabClass(tab === 'ecartes')} onClick={() => setTab('ecartes')}>
            Métiers écartés ({outs.length})
          </button>
        </div>
        {tab === 'favoris' && favs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonSecondary} onClick={copy}>
              Copier ma sélection
            </button>
            <button type="button" className={buttonPrimary} onClick={() => window.print()}>
              Imprimer / PDF
            </button>
          </div>
        )}
      </div>
      <p className="text-sm text-slate-600 print:hidden" role="status" aria-live="polite">
        {copied === 'ok' && 'Sélection copiée : vous pouvez la coller dans un e-mail à votre consultant·e.'}
        {copied === 'error' && 'La copie a échoué. Utilisez plutôt « Imprimer / PDF ».'}
      </p>

      {tab === 'favoris' ? (
        favs.length ? (
          <ul className="space-y-4">
            {favs.map(([code, info]) => (
              <FavoriItem key={code} metier={byCode[code]} info={info} />
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
            <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <HeartIcon />
            </span>
            Votre panier est vide. Cliquez sur le cœur d’un métier pour le garder ici.
            <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
              <Link to="/univers" className={buttonSecondary}>
                Explorer les métiers
              </Link>
              <Link to="/ce-qui-m-anime" className={buttonSecondary}>
                Découvrir selon mes envies
              </Link>
            </div>
          </div>
        )
      ) : outs.length ? (
        <ul className="space-y-3">
          {outs.map(([code]) => (
            <li key={code} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <Link to={`/metier/${code}`} className="font-medium text-slate-800 hover:text-teal-700 hover:underline">
                {clean(byCode[code].intitule)}
              </Link>
              <button type="button" className={buttonSecondary} onClick={() => toggleEcarte(code)}>
                Restaurer
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <ThumbDownIcon />
          </span>
          Aucun métier écarté. Le bouton « Pas pour moi » d’une carte le range ici, d’où vous pourrez le restaurer.
        </div>
      )}
    </div>
  )
}

export default function Panier() {
  return (
    <>
      <PageTitle title="Mon panier de métiers">
        Les métiers que vous gardez, avec vos notes, à partager avec votre consultant·e en bilan de compétences.
      </PageTitle>
      <DataGate>
        <PanierContent />
      </DataGate>
    </>
  )
}
