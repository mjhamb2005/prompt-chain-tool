import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ThemeToggle from './ThemeToggle'
import SignOutButton from './SignOutButton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('is_superadmin, is_matrix_admin, email, first_name').eq('id', user.id).single()
  if (!profile?.is_superadmin && !profile?.is_matrix_admin) redirect('/unauthorized')

  const initial = (profile?.first_name || profile?.email || 'A')[0].toUpperCase()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: '-200px', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(124,109,250,0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 28px', height: '56px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(5,5,7,0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '28px', height: '28px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', boxShadow: '0 2px 12px var(--accent-glow)',
            animation: 'glow 3s ease-in-out infinite'
          }}>⛓</div>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '700', color: 'var(--text)', letterSpacing: '-0.01em' }}>prompt-chain-tool</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text-dimmer)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '-1px' }}>humor flavor studio</div>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--bg-elevated)', border: '1px solid var(--border-light)',
            borderRadius: '8px', padding: '6px 12px'
          }}>
            <div style={{
              width: '22px', height: '22px', borderRadius: '6px',
              background: 'linear-gradient(135deg, var(--accent-dim), var(--bg-elevated))',
              border: '1px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: '700', color: 'var(--accent)',
              fontFamily: 'var(--mono)'
            }}>{initial}</div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-dim)' }}>
              {profile?.email}
            </span>
          </div>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </nav>

      <main style={{ position: 'relative', zIndex: 1 }}>{children}</main>
    </div>
  )
}