'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Flavor = { id: number; slug: string; description: string; created_datetime_utc: string }
type Step = {
  id: number; order_by: number; description: string; llm_system_prompt: string;
  llm_user_prompt: string; llm_temperature: number; llm_model_id: number;
  humor_flavor_id: number; humor_flavor_step_type_id: number;
  llm_input_type_id: number; llm_output_type_id: number;
}
type Image = { id: string; url: string }
type Caption = { id: string; content: string }

export default function DashboardPage() {
  const supabase = createClient()
  const [flavors, setFlavors] = useState<Flavor[]>([])
  const [search, setSearch] = useState('')
  const [selectedFlavor, setSelectedFlavor] = useState<Flavor | null>(null)
  const [flavorModal, setFlavorModal] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [flavorForm, setFlavorForm] = useState({ slug: '', description: '' })
  const [steps, setSteps] = useState<Step[]>([])
  const [stepModal, setStepModal] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selectedStep, setSelectedStep] = useState<Step | null>(null)
  const [stepForm, setStepForm] = useState({
    description: '', llm_system_prompt: '', llm_user_prompt: '',
    llm_temperature: '0.7', llm_model_id: '6', humor_flavor_step_type_id: '1',
    llm_input_type_id: '1', llm_output_type_id: '1'
  })
  const [flavorCaptions, setFlavorCaptions] = useState<Caption[]>([])
  const [captionsLoading, setCaptionsLoading] = useState(false)
  const [images, setImages] = useState<Image[]>([])
  const [selectedImageId, setSelectedImageId] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [testResults, setTestResults] = useState<any[]>([])
  const [testError, setTestError] = useState('')
  const [token, setToken] = useState('')
  const [userId, setUserId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFlavors(); loadImages()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? '')
      setUserId(session?.user?.id ?? '')
    })
  }, [])

  useEffect(() => {
    if (selectedFlavor) { loadSteps(selectedFlavor.id); loadFlavorCaptions(selectedFlavor.id) }
  }, [selectedFlavor])

  const loadFlavors = async () => {
    setLoading(true)
    const { data } = await supabase.from('humor_flavors').select('*').order('id')
    setFlavors(data || []); setLoading(false)
  }
  const loadSteps = async (id: number) => {
    const { data } = await supabase.from('humor_flavor_steps').select('*').eq('humor_flavor_id', id).order('order_by')
    setSteps(data || [])
  }
  const loadFlavorCaptions = async (id: number) => {
    setCaptionsLoading(true)
    const { data } = await supabase.from('captions').select('id, content').eq('humor_flavor_id', id).order('created_datetime_utc', { ascending: false }).limit(20)
    setFlavorCaptions(data || []); setCaptionsLoading(false)
  }
  const loadImages = async () => {
    const { data } = await supabase.from('images').select('id, url').limit(50)
    setImages(data || [])
    if (data && data.length > 0) setSelectedImageId(data[0].id)
  }

  const openCreateFlavor = () => { setFlavorForm({ slug: '', description: '' }); setError(''); setFlavorModal('create') }
  const openEditFlavor = (f: Flavor) => { setFlavorForm({ slug: f.slug, description: f.description }); setError(''); setFlavorModal('edit') }
  const openDeleteFlavor = () => { setError(''); setFlavorModal('delete') }

  const saveFlavor = async () => {
    setSaving(true); setError('')
    const payload = { slug: flavorForm.slug, description: flavorForm.description, modified_by_user_id: userId, ...(flavorModal === 'create' && { created_by_user_id: userId }) }
    const { error: e } = flavorModal === 'create' ? await supabase.from('humor_flavors').insert(payload) : await supabase.from('humor_flavors').update(payload).eq('id', selectedFlavor!.id)
    if (e) { setError(e.message); setSaving(false); return }
    setSaving(false); setFlavorModal(null); loadFlavors()
    if (flavorModal === 'edit' && selectedFlavor) setSelectedFlavor({ ...selectedFlavor, ...payload })
  }

  const deleteFlavor = async () => {
    if (!selectedFlavor) return
    setSaving(true)
    const { error: e } = await supabase.from('humor_flavors').delete().eq('id', selectedFlavor.id)
    if (e) { setError(e.message); setSaving(false); return }
    setSaving(false); setFlavorModal(null); setSelectedFlavor(null); setSteps([]); loadFlavors()
  }

  const duplicateFlavor = async () => {
    if (!selectedFlavor) return
    setSaving(true); setError('')
    const newSlug = `${selectedFlavor.slug}-copy-${Date.now().toString().slice(-4)}`
    const { data: newFlavor, error: flavorErr } = await supabase.from('humor_flavors').insert({ slug: newSlug, description: selectedFlavor.description, created_by_user_id: userId, modified_by_user_id: userId }).select().single()
    if (flavorErr) { setError(flavorErr.message); setSaving(false); return }
    if (steps.length > 0) {
      const newSteps = steps.map(s => ({ humor_flavor_id: newFlavor.id, description: s.description, llm_system_prompt: s.llm_system_prompt, llm_user_prompt: s.llm_user_prompt, llm_temperature: s.llm_temperature, llm_model_id: s.llm_model_id, llm_input_type_id: s.llm_input_type_id, llm_output_type_id: s.llm_output_type_id, humor_flavor_step_type_id: s.humor_flavor_step_type_id, order_by: s.order_by, created_by_user_id: userId, modified_by_user_id: userId }))
      await supabase.from('humor_flavor_steps').insert(newSteps)
    }
    setSaving(false); loadFlavors(); alert(`Duplicated as "${newSlug}"!`)
  }

  const openCreateStep = () => {
    setStepForm({ description: '', llm_system_prompt: '', llm_user_prompt: '', llm_temperature: '0.7', llm_model_id: '6', humor_flavor_step_type_id: '1', llm_input_type_id: '1', llm_output_type_id: '1' })
    setError(''); setStepModal('create')
  }
  const openEditStep = (s: Step) => {
    setSelectedStep(s)
    setStepForm({ description: s.description ?? '', llm_system_prompt: s.llm_system_prompt ?? '', llm_user_prompt: s.llm_user_prompt ?? '', llm_temperature: String(s.llm_temperature ?? 0.7), llm_model_id: String(s.llm_model_id ?? '6'), humor_flavor_step_type_id: String(s.humor_flavor_step_type_id ?? '1'), llm_input_type_id: String(s.llm_input_type_id ?? '1'), llm_output_type_id: String(s.llm_output_type_id ?? '1') })
    setError(''); setStepModal('edit')
  }
  const openDeleteStep = (s: Step) => { setSelectedStep(s); setError(''); setStepModal('delete') }

  const saveStep = async () => {
    if (!selectedFlavor) return
    setSaving(true); setError('')
    const maxOrder = steps.length > 0 ? Math.max(...steps.map(s => s.order_by)) : 0
    const payload: any = {
      humor_flavor_id: selectedFlavor.id,
      description: stepForm.description || null,
      llm_system_prompt: stepForm.llm_system_prompt || null,
      llm_user_prompt: stepForm.llm_user_prompt || null,
      llm_temperature: stepForm.llm_temperature ? Number(stepForm.llm_temperature) : null,
      llm_model_id: stepForm.llm_model_id ? Number(stepForm.llm_model_id) : null,
      humor_flavor_step_type_id: stepForm.humor_flavor_step_type_id ? Number(stepForm.humor_flavor_step_type_id) : 1,
      llm_input_type_id: stepForm.llm_input_type_id ? Number(stepForm.llm_input_type_id) : 1,
      llm_output_type_id: stepForm.llm_output_type_id ? Number(stepForm.llm_output_type_id) : 1,
      modified_by_user_id: userId,
      ...(stepModal === 'create' && { created_by_user_id: userId }),
    }
    if (stepModal === 'create') payload.order_by = maxOrder + 1
    const { error: e } = stepModal === 'create' ? await supabase.from('humor_flavor_steps').insert(payload) : await supabase.from('humor_flavor_steps').update(payload).eq('id', selectedStep!.id)
    if (e) { setError(e.message); setSaving(false); return }
    setSaving(false); setStepModal(null); loadSteps(selectedFlavor.id)
  }

  const deleteStep = async () => {
    if (!selectedStep || !selectedFlavor) return
    setSaving(true)
    const { error: e } = await supabase.from('humor_flavor_steps').delete().eq('id', selectedStep.id)
    if (e) { setError(e.message); setSaving(false); return }
    setSaving(false); setStepModal(null); loadSteps(selectedFlavor.id)
  }

  const moveStep = async (step: Step, dir: 'up' | 'down') => {
    const idx = steps.findIndex(s => s.id === step.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= steps.length) return
    const swap = steps[swapIdx]
    await supabase.from('humor_flavor_steps').update({ order_by: swap.order_by }).eq('id', step.id)
    await supabase.from('humor_flavor_steps').update({ order_by: step.order_by }).eq('id', swap.id)
    loadSteps(selectedFlavor!.id)
  }

  const testFlavor = async () => {
    if (!selectedFlavor || !selectedImageId || !token) return
    setTestLoading(true); setTestError(''); setTestResults([])
    try {
      const res = await fetch('https://api.almostcrackd.ai/pipeline/generate-captions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: selectedImageId, humorFlavorId: selectedFlavor.id })
      })
      if (!res.ok) throw new Error(`API error: ${await res.text()}`)
      const data = await res.json()
      setTestResults(Array.isArray(data) ? data : [data])
    } catch (e: any) { setTestError(e.message) }
    setTestLoading(false)
  }

  const filteredFlavors = flavors.filter(f =>
    f.slug.toLowerCase().includes(search.toLowerCase()) ||
    (f.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const overlay = { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }
  const modalBox = { background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '20px', padding: '32px', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Hero */}
      <div style={{ padding: '40px 36px 32px', borderBottom: '1px solid var(--border)', position: 'relative', overflow: 'hidden', background: 'var(--bg-panel)' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'linear-gradient(var(--text) 1px, transparent 1px), linear-gradient(90deg, var(--text) 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '-60px', right: '8%', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(124,109,250,0.08), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '0', right: '25%', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(34,211,238,0.06), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid rgba(124,109,250,0.2)', padding: '3px 10px', borderRadius: '6px', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '10px' }}>⚗ experiment dashboard</div>
            <h1 style={{ fontFamily: 'var(--sans)', fontSize: '44px', fontWeight: '800', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '10px' }}>
              <span style={{ color: 'var(--accent)' }}>humor</span>{' '}
              <span style={{ color: 'var(--text)' }}>lab</span>
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', fontFamily: 'var(--mono)', letterSpacing: '0.04em' }}>build · test · iterate → ai humor pipelines</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { n: flavors.length, l: 'flavors', c: 'var(--accent)', b: 'var(--accent-dim)', border: 'rgba(124,109,250,0.2)' },
              { n: steps.length, l: 'steps', c: 'var(--teal)', b: 'var(--teal-dim)', border: 'rgba(34,211,238,0.2)' },
              { n: '88k', l: 'captions', c: 'var(--pink)', b: 'var(--pink-dim)', border: 'rgba(244,114,182,0.2)' },
            ].map(({ n, l, c, b, border }) => (
              <div key={l} style={{ textAlign: 'center', padding: '14px 20px', background: b, border: `1px solid ${border}`, borderRadius: '12px', borderTop: `3px solid ${c}` }}>
                <div style={{ fontSize: '24px', fontWeight: '800', color: c, fontFamily: 'var(--sans)' }}>{n}</div>
                <div style={{ fontSize: '9px', color: 'var(--text-dimmer)', fontFamily: 'var(--mono)', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '3px' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: 'calc(100vh - 220px)' }}>

        {/* Sidebar */}
        <div style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>All Flavors</div>
                <div style={{ fontSize: '10px', color: 'var(--text-dimmer)', fontFamily: 'var(--mono)', marginTop: '1px' }}>
                  {filteredFlavors.length === flavors.length ? `${flavors.length} total` : `${filteredFlavors.length} of ${flavors.length}`}
                </div>
              </div>
              <button className="btn btn-primary" onClick={openCreateFlavor} style={{ padding: '6px 12px', fontSize: '11px' }}>+ New</button>
            </div>
            <div style={{ position: 'relative' }}>
              <input className="input" placeholder="Search flavors…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', fontSize: '11px', borderRadius: '8px', height: '34px' }} />
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text-dimmer)', pointerEvents: 'none' }}>⌕</span>
              {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dimmer)', fontSize: '14px' }}>×</button>}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dimmer)', fontSize: '12px', fontFamily: 'var(--mono)' }}>Loading…</div>
            ) : filteredFlavors.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-dimmer)', fontFamily: 'var(--mono)' }}>No results for "{search}"</div>
              </div>
            ) : filteredFlavors.map(f => (
              <div key={f.id} onClick={() => setSelectedFlavor(f)} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: selectedFlavor?.id === f.id ? 'var(--accent-dim)' : 'transparent', borderLeft: selectedFlavor?.id === f.id ? '3px solid var(--accent)' : '3px solid transparent', transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: selectedFlavor?.id === f.id ? 'var(--accent)' : 'var(--text)', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '185px' }}>{f.slug}</div>
                  <span style={{ fontSize: '9px', color: 'var(--accent)', background: 'var(--accent-dim)', padding: '1px 5px', borderRadius: '3px', fontFamily: 'var(--mono)', flexShrink: 0 }}>#{f.id}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dimmer)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.description || 'No description'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        {selectedFlavor ? (
          <div style={{ overflowY: 'auto', background: 'var(--bg)' }}>

            {/* Flavor header */}
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', background: 'var(--accent-dim)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-60px', right: '-20px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(124,109,250,0.15), transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', background: 'var(--bg-panel)', color: 'var(--accent)', border: '1px solid rgba(124,109,250,0.3)', padding: '2px 8px', borderRadius: '5px', letterSpacing: '0.1em' }}>FLAVOR #{selectedFlavor.id}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', background: 'var(--bg-elevated)', color: 'var(--text-dim)', padding: '2px 8px', borderRadius: '5px' }}>{steps.length} steps</span>
                  </div>
                  <h2 style={{ fontFamily: 'var(--sans)', fontSize: '28px', fontWeight: '800', letterSpacing: '-0.03em', color: 'var(--accent)', marginBottom: '6px', lineHeight: 1 }}>{selectedFlavor.slug}</h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.5 }}>{selectedFlavor.description || 'No description.'}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button className="btn btn-teal" onClick={duplicateFlavor} disabled={saving}>⎘ Duplicate</button>
                  <button className="btn" onClick={() => openEditFlavor(selectedFlavor)}>Edit</button>
                  <button className="btn btn-danger" onClick={openDeleteFlavor}>Delete</button>
                </div>
              </div>
            </div>

            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Steps */}
              <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, var(--accent-dim), transparent)' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>Prompt Steps</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dimmer)', fontFamily: 'var(--mono)', marginTop: '1px' }}>Executed in order — {steps.length} step{steps.length !== 1 ? 's' : ''}</div>
                  </div>
                  <button className="btn btn-primary" onClick={openCreateStep}>+ Add Step</button>
                </div>
                {steps.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', opacity: 0.2, marginBottom: '10px' }}>⛓</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '4px' }}>No steps yet</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dimmer)', fontFamily: 'var(--mono)' }}>Add your first prompt step</div>
                  </div>
                ) : steps.map((s, idx) => (
                  <div key={s.id} style={{ padding: '18px 20px', borderBottom: idx < steps.length - 1 ? '1px solid var(--border)' : 'none', position: 'relative' }}>
                    {idx < steps.length - 1 && <div style={{ position: 'absolute', left: '39px', bottom: '-10px', width: '2px', height: '20px', background: 'linear-gradient(180deg, var(--accent-dim), transparent)', zIndex: 1 }} />}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: '#fff', boxShadow: '0 3px 12px var(--accent-glow)', flexShrink: 0 }}>{s.order_by}</div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', marginBottom: '5px' }}>{s.description || 'Untitled step'}</div>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            {s.llm_temperature != null && <span style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--teal)', background: 'var(--teal-dim)', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(34,211,238,0.2)' }}>temp {s.llm_temperature}</span>}
                            {s.llm_model_id != null && <span style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--accent)', background: 'var(--accent-dim)', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(124,109,250,0.2)' }}>model {s.llm_model_id}</span>}
                            <span style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--text-dimmer)', background: 'var(--bg-elevated)', padding: '2px 7px', borderRadius: '4px' }}>in {s.llm_input_type_id}</span>
                            <span style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--text-dimmer)', background: 'var(--bg-elevated)', padding: '2px 7px', borderRadius: '4px' }}>out {s.llm_output_type_id}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button className="btn" onClick={() => moveStep(s, 'up')} disabled={idx === 0} style={{ padding: '4px 8px' }}>↑</button>
                        <button className="btn" onClick={() => moveStep(s, 'down')} disabled={idx === steps.length - 1} style={{ padding: '4px 8px' }}>↓</button>
                        <button className="btn" onClick={() => openEditStep(s)}>Edit</button>
                        <button className="btn btn-danger" onClick={() => openDeleteStep(s)}>Del</button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginLeft: '48px' }}>
                      {s.llm_system_prompt && (
                        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', borderTop: '2px solid rgba(124,109,250,0.4)' }}>
                          <div style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--accent)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>⚙ System</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)', whiteSpace: 'pre-wrap', maxHeight: '72px', overflow: 'auto', lineHeight: 1.5 }}>{s.llm_system_prompt}</div>
                        </div>
                      )}
                      {s.llm_user_prompt && (
                        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', borderTop: '2px solid rgba(34,211,238,0.4)' }}>
                          <div style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--teal)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>◎ User</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)', whiteSpace: 'pre-wrap', maxHeight: '72px', overflow: 'auto', lineHeight: 1.5 }}>{s.llm_user_prompt}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Test */}
              <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--green-dim)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>Live Test</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dimmer)', fontFamily: 'var(--mono)', marginTop: '1px' }}>Generate captions in real time</div>
                  </div>
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--text-dimmer)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Select Test Image</div>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {images.slice(0, 10).map(img => (
                        <div key={img.id} onClick={() => setSelectedImageId(img.id)} style={{ flexShrink: 0, width: '72px', height: '72px', borderRadius: '10px', overflow: 'hidden', border: selectedImageId === img.id ? '2px solid var(--accent)' : '2px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s', boxShadow: selectedImageId === img.id ? '0 0 0 3px var(--accent-dim)' : 'none', transform: selectedImageId === img.id ? 'scale(1.05)' : 'scale(1)' }}>
                          <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={testFlavor} disabled={testLoading || !selectedImageId} style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '12px', borderRadius: '10px', marginBottom: '14px' }}>
                    {testLoading ? '⟳ Generating…' : `▶ Run "${selectedFlavor.slug}"`}
                  </button>
                  {testError && <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--red)', padding: '12px 14px', borderRadius: '8px', fontSize: '12px', marginBottom: '12px', fontFamily: 'var(--mono)' }}>⚠ {testError}</div>}
                  {testResults.length > 0 && (
                    <div>
                      <div style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--green)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>✓ {testResults.length} captions generated</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {testResults.map((r, i) => (
                          <div key={i} style={{ padding: '14px 16px', background: 'var(--accent-dim)', border: '1px solid rgba(124,109,250,0.15)', borderRadius: '10px', fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--sans)', lineHeight: 1.6, fontStyle: 'italic', position: 'relative' }}>
                            <span style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--accent)', position: 'absolute', top: '8px', right: '12px' }}>#{i+1}</span>
                            "{r.content ?? r}"
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Saved Captions */}
              {flavorCaptions.length > 0 && (
                <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>Saved Captions</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dimmer)', fontFamily: 'var(--mono)', marginTop: '1px' }}>{flavorCaptions.length} from this flavor</div>
                  </div>
                  {captionsLoading ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dimmer)', fontSize: '12px' }}>Loading…</div>
                  ) : flavorCaptions.map((c, i) => (
                    <div key={c.id} style={{ padding: '12px 20px', borderBottom: i < flavorCaptions.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--sans)', lineHeight: 1.5 }}>{c.content}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, var(--accent-dim) 0%, transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{ fontSize: '56px', marginBottom: '16px', opacity: 0.15 }}>⚗</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.02em' }}>Select a Flavor</div>
              <div style={{ fontSize: '12px', color: 'var(--text-dimmer)', fontFamily: 'var(--mono)', maxWidth: '260px', margin: '0 auto', lineHeight: 1.7 }}>Choose a humor flavor from the left panel to view and edit its steps</div>
              <div style={{ marginTop: '20px', display: 'inline-flex', gap: '6px', fontSize: '11px', color: 'var(--accent)', fontFamily: 'var(--mono)', background: 'var(--accent-dim)', padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(124,109,250,0.2)' }}>← pick one</div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {(flavorModal === 'create' || flavorModal === 'edit') && (
        <div style={overlay}>
          <div style={{ ...modalBox, width: '480px' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '4px' }}>{flavorModal === 'create' ? '⚗ New Flavor' : 'Edit Flavor'}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-dimmer)', fontFamily: 'var(--mono)' }}>Define your AI humor personality</div>
            </div>
            {error && <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '12px', marginBottom: '16px', fontSize: '12px', borderRadius: '8px', fontFamily: 'var(--mono)' }}>{error}</div>}
            {[['slug', 'Flavor Slug'], ['description', 'Description']].map(([k, l]) => (
              <div key={k} style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dimmer)', marginBottom: '6px', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>{l}</div>
                <input className="input" value={(flavorForm as any)[k]} onChange={e => setFlavorForm(v => ({ ...v, [k]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn" onClick={() => setFlavorModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveFlavor} disabled={saving}>{saving ? 'Saving…' : 'Save Flavor'}</button>
            </div>
          </div>
        </div>
      )}

      {flavorModal === 'delete' && selectedFlavor && (
        <div style={overlay}>
          <div style={{ ...modalBox, width: '400px' }}>
            <div style={{ fontSize: '32px', marginBottom: '14px' }}>⚠️</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>Delete Flavor?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '20px', lineHeight: 1.6 }}>Permanently delete <span style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{selectedFlavor.slug}</span> and all {steps.length} steps.</div>
            {error && <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '12px', marginBottom: '14px', fontSize: '12px', borderRadius: '8px' }}>{error}</div>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setFlavorModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={deleteFlavor} disabled={saving}>{saving ? 'Deleting…' : 'Delete Forever'}</button>
            </div>
          </div>
        </div>
      )}

      {(stepModal === 'create' || stepModal === 'edit') && (
        <div style={overlay}>
          <div style={{ ...modalBox, width: '560px', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '4px' }}>{stepModal === 'create' ? '+ New Step' : 'Edit Step'}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-dimmer)', fontFamily: 'var(--mono)' }}>Configure this prompt chain step</div>
            </div>
            {error && <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '12px', marginBottom: '14px', fontSize: '12px', borderRadius: '8px', fontFamily: 'var(--mono)' }}>{error}</div>}
            {([
              ['description', 'Description', false],
              ['llm_system_prompt', 'System Prompt', true],
              ['llm_user_prompt', 'User Prompt', true],
              ['llm_temperature', 'Temperature', false],
              ['llm_model_id', 'LLM Model ID', false],
              ['humor_flavor_step_type_id', 'Step Type ID', false],
              ['llm_input_type_id', 'Input Type ID', false],
              ['llm_output_type_id', 'Output Type ID', false],
            ] as [string, string, boolean][]).map(([k, l, isTextarea]) => (
              <div key={k} style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dimmer)', marginBottom: '6px', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>{l}</div>
                {isTextarea ? <textarea className="input" value={(stepForm as any)[k]} onChange={e => setStepForm(v => ({ ...v, [k]: e.target.value }))} style={{ minHeight: '100px' }} /> : <input className="input" value={(stepForm as any)[k]} onChange={e => setStepForm(v => ({ ...v, [k]: e.target.value }))} />}
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn" onClick={() => setStepModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveStep} disabled={saving}>{saving ? 'Saving…' : 'Save Step'}</button>
            </div>
          </div>
        </div>
      )}

      {stepModal === 'delete' && selectedStep && (
        <div style={overlay}>
          <div style={{ ...modalBox, width: '380px' }}>
            <div style={{ fontSize: '32px', marginBottom: '14px' }}>🗑️</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>Delete Step?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '20px' }}>Delete <span style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>Step {selectedStep.order_by}</span>? Cannot be undone.</div>
            {error && <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '12px', marginBottom: '14px', fontSize: '12px', borderRadius: '8px' }}>{error}</div>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setStepModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={deleteStep} disabled={saving}>{saving ? 'Deleting…' : 'Delete Step'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}