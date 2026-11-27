import { isPerso, persoId, persoLabel, toggleIn } from '../../lib/portrait/model'
import { AIME_FAMILLES } from '../../lib/portrait/referentiel'
import { AjoutLibre, Pastille } from './controls'

/** Dimension 1 : verbes d'action en pastilles, regroupés par familles (titres non sélectionnables). */
export default function DimAime({ portrait, setPortrait }) {
  const toggle = (id) => setPortrait((p) => ({ ...p, aime: toggleIn(p.aime, id) }))
  const perso = portrait.aime.filter(isPerso)

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        {AIME_FAMILLES.map((f) => (
          <div key={f.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{f.libelle}</h3>
            <div className="flex flex-wrap gap-2">
              {f.verbes.map((v) => (
                <Pastille key={v.id} couleur="rose" actif={portrait.aime.includes(v.id)} onClick={() => toggle(v.id)}>
                  {v.libelle}
                </Pastille>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 p-4">
        <h3 className="mb-1 text-sm font-semibold text-slate-800">Un autre verbe d’action ?</h3>
        <p className="mb-3 text-xs text-slate-500">Par exemple : jardiner, cuisiner, piloter, enquêter…</p>
        {perso.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {perso.map((id) => (
              <Pastille key={id} couleur="rose" actif onClick={() => toggle(id)} title="Cliquez pour retirer">
                {persoLabel(id)}
              </Pastille>
            ))}
          </div>
        )}
        <AjoutLibre
          label="Ajouter un verbe d’action"
          placeholder="Ajouter un verbe d’action"
          onAdd={(texte) => setPortrait((p) => (p.aime.includes(persoId(texte)) ? p : { ...p, aime: [...p.aime, persoId(texte)] }))}
        />
      </div>
    </div>
  )
}
