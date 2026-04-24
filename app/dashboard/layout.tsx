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
      <div style={{
        position: 'fixed', top: '-100px', left: '50%', transform: 'translateX(-50%)',
        width: '500px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(124,109,250,0.05), transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 24px', height: '52px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-panel)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '26px', height: '26px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            borderRadius: '7px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px'
          }}>⚗</div>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '600', color: 'var(--text)', letterSpacing: '-0.02em' }}>
              <span style={{ color: 'var(--accent)' }}>humor</span> lab
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text-dimmer)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '-1px' }}>flavor studio</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '5px 12px' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '5px', background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{initial}</div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-dim)' }}>{profile?.email}</span>
          </div>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </nav>
      <main style={{ position: 'relative', zIndex: 1 }}>{children}</main>
    </div>
  )
}