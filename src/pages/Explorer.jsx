import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import DimAime from '../components/portrait/DimAime'
import DimConditions from '../components/portrait/DimConditions'
import DimInterets from '../components/portrait/DimInterets'
import DimMotivations from '../components/portrait/DimMotivations'
import DimSavoirs from '../components/portrait/DimSavoirs'
import DimSens from '../components/portrait/DimSens'
import PitchBox from '../components/portrait/PitchBox'
import Resultats from '../components/portrait/Resultats'
import Synthese from '../components/portrait/Synthese'
import { DimensionFrame, Etapes } from '../components/portrait/controls'
import { Icone, Numero } from '../components/portrait/theme'
import { THEMES } from '../components/portrait/themes'
import { ConfirmDialog, DataGate, PageTitle, buttonPrimary, buttonSecondary } from '../components/ui'
import { DIMENSION_IDS, EMPTY_PORTRAIT, countByDimension, countPortrait, dimensionsRenseignees, normalizePortrait, resetDimension } from '../lib/portrait/model'
import { DIMENSIONS, DIMENSIONS_BY_ID, SYNTHESE } from '../lib/portrait/referentiel'
import { useStoredState } from '../lib/useStoredState'

// Réponses conservées pendant la session de navigation uniquement (effacées à la fermeture de l'onglet).
const STORAGE_KEY = 'core-explore:portrait:v2'

const COMPOSANTS = {
  aime: DimAime,
  savoirs: DimSavoirs,
  interets: DimInterets,
  sens: DimSens,
  motivations: DimMotivations,
  conditions: DimConditions,
}

function CarteDimension({ d, count, onOpen }) {
  const t = THEMES[d.couleur]
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex h-full flex-col rounded-2xl border-2 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${t.carte}`}
    >
      <div className="flex items-center gap-3">
        <Numero dimension={d} />
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${t.doux}`}>
          <Icone nom={d.icone} size={22} />
        </span>
        {count > 0 && (
          <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${t.doux}`}>
            <Icone nom="coche" size={12} strokeWidth={3} />
            {count} critère{count > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{d.titre}</h3>
      <p className="mt-1 flex-1 text-sm text-slate-600">{d.description}</p>
      <span className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${t.texte}`}>
        {d.id === 'synthese' ? 'Voir mon portrait' : count ? 'Modifier' : 'Compléter'}
        <Icone nom="fleche" size={16} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  )
}

function Progression({ portrait }) {
  const counts = countByDimension(portrait)
  const n = dimensionsRenseignees(portrait)
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-800">
          {n ? `${n} dimension${n > 1 ? 's' : ''} sur 6 explorée${n > 1 ? 's' : ''}` : 'Aucune dimension explorée pour l’instant'}
        </span>
        <span className="text-xs text-slate-500">Aucune n’est obligatoire</span>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {DIMENSIONS.map((d) => (
          <span key={d.id} className={`h-2 flex-1 rounded-full ${counts[d.id] ? THEMES[d.couleur].barre : 'bg-slate-200'}`} />
        ))}
      </div>
    </div>
  )
}

/** Barre d'action collante : nombre de critères et accès à la recherche dès le premier critère. */
function BarreAction({ n, onSynthese, onResultats }) {
  return (
    <div className="no-print sticky bottom-0 z-20 -mx-4 mt-8 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-t-2xl sm:border-x">
      <div className="flex items-center gap-3">
        <p className="flex-1 text-sm text-slate-700">
          <span className="font-semibold tabular-nums">{n}</span> critère{n > 1 ? 's' : ''}<span className="hidden sm:inline"> dans mon portrait</span>
        </p>
        <span className="hidden sm:block">
          <button type="button" className={buttonSecondary} onClick={onSynthese}>
            Mon portrait
          </button>
        </span>
        <button type="button" className={buttonPrimary} onClick={onResultats} disabled={!n}>
          Découvrir mes pistes
        </button>
      </div>
    </div>
  )
}

function Accueil({ portrait, setPortrait, go }) {
  const [mode, setMode] = useState(portrait.pitch ? 'pitch' : null)
  const counts = countByDimension(portrait)
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          aria-expanded={mode === 'pitch'}
          onClick={() => setMode((m) => (m === 'pitch' ? null : 'pitch'))}
          className={`flex items-start gap-4 rounded-2xl border-2 p-5 text-left transition ${mode === 'pitch' ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-400'}`}
        >
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white">
            <Icone nom="plume" size={22} />
          </span>
          <span>
            <span className="block text-xs font-bold uppercase tracking-wider text-teal-700">Mode 1</span>
            <span className="block text-lg font-semibold text-slate-900">Je décris mon projet</span>
            <span className="mt-1 block text-sm text-slate-600">
              Racontez librement ce que vous recherchez : nous en tirons des critères que vous validez.
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => document.getElementById('dimensions')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="flex items-start gap-4 rounded-2xl border-2 border-slate-200 bg-white p-5 text-left transition hover:border-rose-300"
        >
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white">
            <Icone nom="portrait" size={22} />
          </span>
          <span>
            <span className="block text-xs font-bold uppercase tracking-wider text-rose-700">Mode 2</span>
            <span className="block text-lg font-semibold text-slate-900">Je construis mon portrait professionnel</span>
            <span className="mt-1 block text-sm text-slate-600">
              Six dimensions à explorer dans l’ordre de votre choix. Les deux modes se combinent.
            </span>
          </span>
        </button>
      </div>

      {mode === 'pitch' && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 sm:p-6">
          <PitchBox
            portrait={portrait}
            setPortrait={setPortrait}
            onDone={() => document.getElementById('dimensions')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />
        </div>
      )}

      <section id="dimensions" aria-labelledby="titre-dimensions" className="scroll-mt-20 space-y-4">
        <h2 id="titre-dimensions" className="text-xl font-semibold text-slate-900">
          Mon portrait professionnel en six dimensions
        </h2>
        <Progression portrait={portrait} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DIMENSIONS.map((d) => (
            <CarteDimension key={d.id} d={d} count={counts[d.id]} onOpen={() => go(d.id)} />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CarteDimension d={SYNTHESE} count={0} onOpen={() => go('synthese')} />
        </div>
      </section>
    </div>
  )
}

function ExplorerContent() {
  const [portrait, setPortrait] = useStoredState(STORAGE_KEY, EMPTY_PORTRAIT, normalizePortrait, { session: true })
  const [params, setParams] = useSearchParams()
  const [confirmReset, setConfirmReset] = useState(false)
  const etape = params.get('etape')
  const vue = DIMENSIONS_BY_ID[etape] || etape === 'resultats' ? etape : null // (dimension, synthèse ou résultats)

  const go = (id) => setParams(id ? { etape: id } : {})
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [vue])

  const counts = countByDimension(portrait)
  const n = countPortrait(portrait)
  const index = DIMENSION_IDS.indexOf(vue)

  let contenu
  if (index >= 0) {
    const d = DIMENSIONS[index]
    const Composant = COMPOSANTS[d.id]
    const suivant = index < DIMENSIONS.length - 1 ? DIMENSIONS[index + 1] : SYNTHESE
    contenu = (
      <DimensionFrame
        dimension={d}
        count={counts[d.id]}
        onReset={() => setPortrait((p) => resetDimension(p, d.id))}
        onPrev={() => go(index ? DIMENSIONS[index - 1].id : null)}
        onNext={() => go(suivant.id)}
        nextLabel={suivant.id === 'synthese' ? 'Voir mon portrait' : `Dimension suivante : ${suivant.titre}`}
      >
        <Composant portrait={portrait} setPortrait={setPortrait} />
      </DimensionFrame>
    )
  } else if (vue === 'synthese') {
    contenu = (
      <Synthese
        portrait={portrait}
        setPortrait={setPortrait}
        onEdit={(id) => go(id)}
        onReset={() => setConfirmReset(true)}
        onResultats={() => go('resultats')}
      />
    )
  } else if (vue === 'resultats') {
    contenu = n ? (
      <Resultats portrait={portrait} onSynthese={() => go('synthese')} />
    ) : (
      <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        Renseignez au moins un critère pour découvrir des pistes.{' '}
        <button type="button" className="font-semibold text-teal-700 hover:underline" onClick={() => go(null)}>
          Commencer mon portrait
        </button>
      </p>
    )
  } else contenu = <Accueil portrait={portrait} setPortrait={setPortrait} go={go} />

  return (
    <div className="space-y-6">
      {vue && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => go(null)}
            className="no-print inline-flex items-center gap-1 self-start text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <Icone nom="retour" size={16} />
            Accueil du portrait
          </button>
          <div className="min-w-0 flex-1">
            <Etapes courante={vue} counts={counts} onGo={go} />
          </div>
        </div>
      )}
      {contenu}
      {vue !== 'resultats' && vue !== 'synthese' && <BarreAction n={n} onSynthese={() => go('synthese')} onResultats={() => go('resultats')} />}
      <ConfirmDialog
        open={confirmReset}
        title="Réinitialiser tous mes critères ?"
        confirmLabel="Tout réinitialiser"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setPortrait(EMPTY_PORTRAIT)
          setConfirmReset(false)
          go(null)
        }}
      >
        Les six dimensions et votre description seront vidées. Cette action ne peut pas être annulée.
      </ConfirmDialog>
    </div>
  )
}

export default function Explorer() {
  return (
    <>
      <PageTitle title="Je trouve ce qui m’anime">
        Construisez votre portrait professionnel à votre rythme. Les métiers proposés ne sont pas un verdict : ce sont des
        pistes à explorer, avec ce qui les relie à vous et les points à approfondir.
      </PageTitle>
      <p className="no-print -mt-5 mb-6 text-xs text-slate-500">
        Sans compte : vos réponses restent sur cet appareil, le temps de votre navigation, et sont effacées à la fermeture de
        l’onglet.
      </p>
      <DataGate>
        <ExplorerContent />
      </DataGate>
    </>
  )
}
