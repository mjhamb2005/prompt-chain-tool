'use client'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', position: 'relative', overflow: 'hidden'
    }}>
      {/* Grid background */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'linear-gradient(var(--text) 1px, transparent 1px), linear-gradient(90deg, var(--text) 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />

      {/* Radial glow */}
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '300px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(124,109,250,0.08), transparent 70%)', pointerEvents: 'none' }} />

      {/* Floating emojis */}
      <div style={{ position: 'absolute', top: '15%', left: '10%', fontSize: '28px', opacity: 0.15, pointerEvents: 'none', animation: 'float1 6s ease-in-out infinite' }}>⚗️</div>
      <div style={{ position: 'absolute', top: '70%', left: '8%', fontSize: '24px', opacity: 0.12, pointerEvents: 'none', animation: 'float2 8s ease-in-out infinite' }}>🧪</div>
      <div style={{ position: 'absolute', top: '20%', right: '10%', fontSize: '26px', opacity: 0.15, pointerEvents: 'none', animation: 'float3 7s ease-in-out infinite' }}>😂</div>
      <div style={{ position: 'absolute', top: '65%', right: '8%', fontSize: '22px', opacity: 0.12, pointerEvents: 'none', animation: 'float1 9s ease-in-out infinite' }}>🔬</div>
      <div style={{ position: 'absolute', top: '45%', left: '5%', fontSize: '20px', opacity: 0.1, pointerEvents: 'none', animation: 'float2 5s ease-in-out infinite' }}>🤣</div>

      {/* Login card */}
      <div style={{
        textAlign: 'center', padding: '48px 40px',
        border: '1px solid var(--border-light)',
        borderRadius: '20px',
        background: 'var(--bg-panel)',
        maxWidth: '380px', width: '100%',
        position: 'relative',
        boxShadow: '0 24px 80px rgba(0,0,0,0.3)'
      }}>
        {/* Logo */}
        <div style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', borderRadius: '14px', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', boxShadow: '0 4px 20px var(--accent-glow)' }}>⚗</div>

        <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.3em', color: 'var(--text-dimmer)', textTransform: 'uppercase', marginBottom: '8px' }}>experiment dashboard</div>

        <h1 style={{ fontFamily: 'var(--sans)', fontSize: '28px', fontWeight: '800', marginBottom: '6px', letterSpacing: '-0.03em', lineHeight: 1 }}>
          <span style={{ color: 'var(--accent)' }}>humor</span>{' '}
          <span style={{ color: 'var(--text)' }}>lab</span>
        </h1>

        <p style={{ color: 'var(--text-dim)', fontSize: '12px', marginBottom: '32px', fontFamily: 'var(--mono)', lineHeight: 1.6 }}>
          Superadmin & matrix admin access only
        </p>

        <button onClick={signIn} style={{
          width: '100%', padding: '13px',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          color: '#fff', border: 'none', borderRadius: '10px',
          fontFamily: 'var(--mono)', fontSize: '12px',
          fontWeight: '600', letterSpacing: '0.05em',
          cursor: 'pointer',
          boxShadow: '0 4px 20px var(--accent-glow)',
          transition: 'all 0.15s'
        }}>
          Sign in with Google →
        </button>

        <div style={{ marginTop: '16px', fontSize: '10px', color: 'var(--text-dimmer)', fontFamily: 'var(--mono)' }}>
          build · test · iterate → ai humor pipelines
        </div>
      </div>
    </div>
  )
}