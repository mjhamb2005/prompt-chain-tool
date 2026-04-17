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

  const overlay = { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }
  const modalBox = { background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '20px', padding: '32px', boxShadow: '0 32px 100px rgba(0,0,0,0.7)' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Hero Header */}
      <div style={{
        padding: '48px 40px 40px',
        background: 'linear-gradient(180deg, rgba(124,109,250,0.06) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border)',
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Decorative orbs */}
        <div style={{ position: 'absolute', top: '-60px', right: '10%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(124,109,250,0.08), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '-40px', right: '30%', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(167,139,250,0.05), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid rgba(124,109,250,0.2)', padding: '4px 10px', borderRadius: '6px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Humor Flavor Studio</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text-dimmer)', letterSpacing: '0.1em' }}>v2.0</span>
            </div>
            <h1 style={{ fontFamily: 'var(--sans)', fontSize: '48px', fontWeight: '900', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '12px' }}>
              <span style={{ background: 'linear-gradient(135deg, #f1f0ff 0%, #a78bfa 50%, #7c6dfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Prompt</span>
              {' '}
              <span style={{ color: 'var(--text)' }}>Chains</span>
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-dim)', fontFamily: 'var(--mono)', letterSpacing: '0.02em' }}>
              Build · Test · Iterate → AI humor pipelines
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', padding: '16px 24px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--accent)', fontFamily: 'var(--sans)' }}>{flavors.length}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-dimmer)', fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>Flavors</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px 24px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--green)', fontFamily: 'var(--sans)' }}>{steps.length}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-dimmer)', fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>Steps</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '0', minHeight: 'calc(100vh - 200px)' }}>

        {/* LEFT SIDEBAR */}
        <div style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>All Flavors</div>
              <div style={{ fontSize: '10px', color: 'var(--text-dimmer)', fontFamily: 'var(--mono)', marginTop: '2px' }}>{flavors.length} prompt chains</div>
            </div>
            <button className="btn btn-primary" onClick={openCreateFlavor} style={{ padding: '8px 14px', fontSize: '11px' }}>+ New</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dimmer)', fontSize: '12px', fontFamily: 'var(--mono)' }}>Loading…</div>
            ) : flavors.map((f, idx) => (
              <div key={f.id} onClick={() => setSelectedFlavor(f)} style={{
                padding: '16px 20px', cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                background: selectedFlavor?.id === f.id
                  ? 'linear-gradient(135deg, rgba(124,109,250,0.1) 0%, rgba(167,139,250,0.05) 100%)'
                  : 'transparent',
                borderLeft: selectedFlavor?.id === f.id ? '3px solid var(--accent)' : '3px solid transparent',
                transition: 'all 0.2s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: selectedFlavor?.id === f.id ? 'var(--accent)' : 'var(--text)', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{f.slug}</div>
                  <span style={{ fontSize: '9px', color: 'var(--text-dimmer)', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'var(--mono)', flexShrink: 0 }}>#{f.id}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dimmer)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.description || 'No description'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT CONTENT */}
        {selectedFlavor ? (
          <div style={{ overflowY: 'auto', background: 'var(--bg)' }}>

            {/* Flavor Hero */}
            <div style={{
              padding: '32px 36px',
              background: 'linear-gradient(135deg, rgba(124,109,250,0.06) 0%, rgba(167,139,250,0.03) 50%, transparent 100%)',
              borderBottom: '1px solid var(--border)',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-80px', right: '-40px', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(124,109,250,0.1), transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(124,109,250,0.2)', padding: '3px 10px', borderRadius: '6px', letterSpacing: '0.1em' }}>FLAVOR #{selectedFlavor.id}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', background: 'var(--bg-elevated)', color: 'var(--text-dim)', padding: '3px 10px', borderRadius: '6px' }}>{steps.length} steps</span>
                  </div>
                  <h2 style={{ fontFamily: 'var(--sans)', fontSize: '32px', fontWeight: '800', letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: '8px', lineHeight: 1 }}>{selectedFlavor.slug}</h2>
                  <p style={{ fontSize: '14px', color: 'var(--text-dim)', lineHeight: 1.5, maxWidth: '500px' }}>{selectedFlavor.description || 'No description provided.'}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button className="btn" onClick={() => openEditFlavor(selectedFlavor)}>Edit</button>
                  <button className="btn" onClick={duplicateFlavor} disabled={saving} style={{ color: 'var(--teal)', borderColor: 'rgba(34,211,238,0.25)', background: 'var(--teal-dim)' }}>⎘ Duplicate</button>
                  <button className="btn btn-danger" onClick={openDeleteFlavor}>Delete</button>
                </div>
              </div>
            </div>

            <div style={{ padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Steps Section */}
              <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(124,109,250,0.04), transparent)' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)' }}>Prompt Steps</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dimmer)', fontFamily: 'var(--mono)', marginTop: '2px' }}>Executed sequentially — {steps.length} step{steps.length !== 1 ? 's' : ''}</div>
                  </div>
                  <button className="btn btn-primary" onClick={openCreateStep}>+ Add Step</button>
                </div>

                {steps.length === 0 ? (
                  <div style={{ padding: '60px', textAlign: 'center' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>⛓</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-dim)', marginBottom: '6px' }}>No steps yet</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dimmer)', fontFamily: 'var(--mono)' }}>Add your first prompt step to start building</div>
                  </div>
                ) : (
                  <div>
                    {steps.map((s, idx) => (
                      <div key={s.id} style={{ padding: '24px', borderBottom: idx < steps.length - 1 ? '1px solid var(--border)' : 'none', position: 'relative' }}>
                        {/* Step connector line */}
                        {idx < steps.length - 1 && (
                          <div style={{ position: 'absolute', left: '47px', bottom: '-12px', width: '2px', height: '24px', background: 'linear-gradient(180deg, var(--accent-dim), transparent)', zIndex: 1 }} />
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{
                              width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '16px', fontWeight: '800', color: '#fff',
                              boxShadow: '0 4px 16px var(--accent-glow)'
                            }}>{s.order_by}</div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>{s.description || 'Untitled step'}</div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--teal)', background: 'var(--teal-dim)', padding: '2px 8px', borderRadius: '4px' }}>temp {s.llm_temperature}</span>
                                <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--accent)', background: 'var(--accent-dim)', padding: '2px 8px', borderRadius: '4px' }}>model {s.llm_model_id}</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn" onClick={() => moveStep(s, 'up')} disabled={idx === 0} style={{ padding: '5px 9px' }}>↑</button>
                            <button className="btn" onClick={() => moveStep(s, 'down')} disabled={idx === steps.length - 1} style={{ padding: '5px 9px' }}>↓</button>
                            <button className="btn" onClick={() => openEditStep(s)}>Edit</button>
                            <button className="btn btn-danger" onClick={() => openDeleteStep(s)}>Del</button>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginLeft: '54px' }}>
                          {s.llm_system_prompt && (
                            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', borderTop: '2px solid rgba(124,109,250,0.3)' }}>
                              <div style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--accent)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>⚙ System</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-dim)', whiteSpace: 'pre-wrap', maxHeight: '80px', overflow: 'auto', lineHeight: 1.6 }}>{s.llm_system_prompt}</div>
                            </div>
                          )}
                          {s.llm_user_prompt && (
                            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', borderTop: '2px solid rgba(34,211,238,0.3)' }}>
                              <div style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--teal)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>◎ User</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-dim)', whiteSpace: 'pre-wrap', maxHeight: '80px', overflow: 'auto', lineHeight: 1.6 }}>{s.llm_user_prompt}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Test Section */}
              <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(52,211,153,0.05), transparent)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)', animation: 'pulse 2s infinite' }} />
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)' }}>Live Test</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dimmer)', fontFamily: 'var(--mono)', marginTop: '1px' }}>Generate captions in real time</div>
                  </div>
                </div>
                <div style={{ padding: '24px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--text-dimmer)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Select Test Image</div>
                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {images.slice(0, 10).map(img => (
                        <div key={img.id} onClick={() => setSelectedImageId(img.id)} style={{
                          flexShrink: 0, width: '76px', height: '76px', borderRadius: '12px', overflow: 'hidden',
                          border: selectedImageId === img.id ? '2px solid var(--accent)' : '2px solid var(--border)',
                          cursor: 'pointer', transition: 'all 0.15s',
                          boxShadow: selectedImageId === img.id ? '0 0 16px var(--accent-glow)' : 'none',
                          transform: selectedImageId === img.id ? 'scale(1.05)' : 'scale(1)'
                        }}>
                          <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={testFlavor} disabled={testLoading || !selectedImageId} style={{ marginBottom: '16px', padding: '12px 24px', fontSize: '12px', borderRadius: '10px', width: '100%', justifyContent: 'center' }}>
                    {testLoading ? '⟳ Generating captions…' : `▶  Run "${selectedFlavor.slug}"`}
                  </button>
                  {testError && (
                    <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--red)', padding: '14px 16px', borderRadius: '10px', fontSize: '12px', marginBottom: '12px', fontFamily: 'var(--mono)' }}>⚠ {testError}</div>
                  )}
                  {testResults.length > 0 && (
                    <div>
                      <div style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--green)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>✓</span> {testResults.length} captions generated
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {testResults.map((r, i) => (
                          <div key={i} style={{
                            padding: '16px 20px',
                            background: 'linear-gradient(135deg, rgba(124,109,250,0.06), rgba(167,139,250,0.03))',
                            border: '1px solid rgba(124,109,250,0.15)',
                            borderRadius: '12px', fontSize: '14px', color: 'var(--text)',
                            fontFamily: 'var(--sans)', lineHeight: 1.6, fontStyle: 'italic',
                            position: 'relative'
                          }}>
                            <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--accent)', position: 'absolute', top: '10px', right: '14px' }}>#{i+1}</span>
                            "{r.content ?? r}"
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Captions from this flavor */}
              {flavorCaptions.length > 0 && (
                <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)' }}>Saved Captions</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dimmer)', fontFamily: 'var(--mono)', marginTop: '2px' }}>{flavorCaptions.length} from this flavor</div>
                  </div>
                  {captionsLoading ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dimmer)', fontSize: '12px' }}>Loading…</div>
                  ) : flavorCaptions.map((c, i) => (
                    <div key={c.id} style={{ padding: '14px 24px', borderBottom: i < flavorCaptions.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '13px', color: 'var(--text-dim)', fontFamily: 'var(--sans)', lineHeight: 1.5 }}>
                      {c.content}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(124,109,250,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.15 }}>⛓</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text)', marginBottom: '10px', letterSpacing: '-0.02em' }}>Select a Flavor</div>
              <div style={{ fontSize: '13px', color: 'var(--text-dimmer)', fontFamily: 'var(--mono)', maxWidth: '280px', margin: '0 auto', lineHeight: 1.7 }}>Choose a humor flavor from the left panel to view and edit its prompt chain</div>
              <div style={{ marginTop: '24px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--accent)', fontFamily: 'var(--mono)', background: 'var(--accent-dim)', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(124,109,250,0.2)' }}>
                ← pick one from the list
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {(flavorModal === 'create' || flavorModal === 'edit') && (
        <div style={overlay}>
          <div style={{ ...modalBox, width: '480px' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '4px' }}>{flavorModal === 'create' ? '✦ New Humor Flavor' : 'Edit Flavor'}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-dimmer)', fontFamily: 'var(--mono)' }}>Define your AI humor personality</div>
            </div>
            {error && <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '12px 16px', marginBottom: '16px', fontSize: '12px', borderRadius: '10px', fontFamily: 'var(--mono)' }}>{error}</div>}
            {[['slug', 'Flavor Slug'], ['description', 'Description']].map(([k, l]) => (
              <div key={k} style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dimmer)', marginBottom: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>{l}</div>
                <input className="input" value={(flavorForm as any)[k]} onChange={e => setFlavorForm(v => ({ ...v, [k]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn" onClick={() => setFlavorModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveFlavor} disabled={saving}>{saving ? 'Saving…' : 'Save Flavor'}</button>
            </div>
          </div>
        </div>
      )}

      {flavorModal === 'delete' && selectedFlavor && (
        <div style={overlay}>
          <div style={{ ...modalBox, width: '420px' }}>
            <div style={{ fontSize: '36px', marginBottom: '16px' }}>⚠️</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>Delete Flavor?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '24px', lineHeight: 1.6 }}>
              This will permanently delete <span style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{selectedFlavor.slug}</span> and all {steps.length} of its steps. This cannot be undone.
            </div>
            {error && <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '12px 16px', marginBottom: '16px', fontSize: '12px', borderRadius: '10px' }}>{error}</div>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setFlavorModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={deleteFlavor} disabled={saving}>{saving ? 'Deleting…' : 'Delete Forever'}</button>
            </div>
          </div>
        </div>
      )}

      {(stepModal === 'create' || stepModal === 'edit') && (
        <div style={overlay}>
          <div style={{ ...modalBox, width: '580px', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '4px' }}>{stepModal === 'create' ? '+ New Step' : 'Edit Step'}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-dimmer)', fontFamily: 'var(--mono)' }}>Configure this prompt chain step</div>
            </div>
            {error && <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '12px 16px', marginBottom: '16px', fontSize: '12px', borderRadius: '10px', fontFamily: 'var(--mono)' }}>{error}</div>}
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
              <div key={k} style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dimmer)', marginBottom: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>{l}</div>
                {isTextarea
                  ? <textarea className="input" value={(stepForm as any)[k]} onChange={e => setStepForm(v => ({ ...v, [k]: e.target.value }))} style={{ minHeight: '110px' }} />
                  : <input className="input" value={(stepForm as any)[k]} onChange={e => setStepForm(v => ({ ...v, [k]: e.target.value }))} />
                }
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn" onClick={() => setStepModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveStep} disabled={saving}>{saving ? 'Saving…' : 'Save Step'}</button>
            </div>
          </div>
        </div>
      )}

      {stepModal === 'delete' && selectedStep && (
        <div style={overlay}>
          <div style={{ ...modalBox, width: '400px' }}>
            <div style={{ fontSize: '36px', marginBottom: '16px' }}>🗑️</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>Delete Step?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '24px' }}>
              Delete <span style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>Step {selectedStep.order_by}</span>? This cannot be undone.
            </div>
            {error && <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '12px 16px', marginBottom: '16px', fontSize: '12px', borderRadius: '10px' }}>{error}</div>}
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