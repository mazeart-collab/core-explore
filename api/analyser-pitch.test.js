import { afterEach, describe, expect, it, vi } from 'vitest'

const create = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create } } }))
const { default: handler } = await import('./analyser-pitch.js')

const call = async (body) => {
  const res = { code: 0, data: null, status(c) { this.code = c; return this }, json(j) { this.data = j; return this }, setHeader() {} }
  await handler({ method: 'POST', body }, res)
  return res
}

describe('/api/analyser-pitch', () => {
  afterEach(() => { delete process.env.ANTHROPIC_API_KEY; create.mockReset() })

  it('répond 503 sans clé (la page passe alors à l’analyse locale)', async () => {
    expect((await call({ text: 'bonjour' })).code).toBe(503)
  })

  it('ne garde que des identifiants du référentiel', async () => {
    process.env.ANTHROPIC_API_KEY = 'test'
    create.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify({
        aime: ['concevoir', 'inexistant'], savoirs: ['rechercher_des_fournisseurs'], interets: [], sens: [], motivations: ['liberte'],
        curseurs: [{ id: 'ecrans', pos: 2 }, { id: 'faux', pos: 3 }],
        choix: [{ groupe: 'horaires', option: 'nuit', etat: 'eviter' }, { groupe: 'statut', option: 'nuit', etat: 'oui' }],
        resume: 'Vous souhaitez concevoir.',
      }) }],
    })
    const r = await call({ text: 'Je veux concevoir' })
    expect(r.code).toBe(200)
    expect(r.data.propositions.aime).toEqual(['concevoir'])
    expect(r.data.propositions.curseurs).toEqual({ ecrans: { pos: 2, importance: 'souhaitable' } })
    expect(r.data.propositions.choix).toEqual({ horaires: { valeurs: { nuit: 'eviter' }, importance: 'souhaitable' } })
    expect(r.data.resume).toBe('Vous souhaitez concevoir.')
    const arg = create.mock.calls[0][0]
    expect(arg.output_config.format.type).toBe('json_schema')
  })
})
