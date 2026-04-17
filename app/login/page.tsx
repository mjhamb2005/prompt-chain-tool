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
      {/* Ambient */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '500px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(124,109,250,0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{
        textAlign: 'center', padding: '48px',
        border: '1px solid var(--border-light)',
        borderRadius: '16px',
        background: 'var(--bg-panel)',
        maxWidth: '380px', width: '100%',
        position: 'relative',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)'
      }}>
        <div style={{
          width: '48px', height: '48px',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          borderRadius: '12px', margin: '0 auto 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', boxShadow: '0 4px 20px var(--accent-glow)'
        }}>⛓</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.3em', color: 'var(--text-dimmer)', textTransform: 'uppercase', marginBottom: '8px' }}>Humor Flavor Studio</div>
        <h1 style={{ fontFamily: 'var(--sans)', fontSize: '24px', fontWeight: '800', marginBottom: '8px', color: 'var(--text)', letterSpacing: '-0.02em' }}>prompt-chain-tool</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '12px', marginBottom: '32px', fontFamily: 'var(--mono)', lineHeight: 1.6 }}>Superadmin & matrix admin access only</p>
        <button onClick={signIn} style={{
          width: '100%', padding: '13px',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          color: '#fff', border: 'none', borderRadius: '8px',
          fontFamily: 'var(--mono)', fontSize: '12px',
          fontWeight: '600', letterSpacing: '0.05em',
          cursor: 'pointer',
          boxShadow: '0 4px 20px var(--accent-glow)',
          transition: 'all 0.15s'
        }}>
          Sign in with Google →
        </button>
      </div>
    </div>
  )
}