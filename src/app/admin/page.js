'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminPage() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [suspended, setSuspended] = useState([])
  const [inputId, setInputId] = useState('')
  const [inputReason, setInputReason] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data?.session?.user
      setUser(u)
      if (u) checkAdmin(u.id)
      else setLoading(false)
    })
  }, [])

  async function checkAdmin(userId) {
    const { data } = await supabase
      .from('admins')
      .select('id')
      .eq('id', userId)
      .single()
    setIsAdmin(!!data)
    if (data) loadSuspended()
    setLoading(false)
  }

  async function loadSuspended() {
    const { data } = await supabase.from('suspended_users').select('*')
    if (data) setSuspended(data)
  }

  async function suspendUser() {
    if (!inputId) return
    const { error } = await supabase.from('suspended_users').upsert({
      user_id: inputId,
      reason: inputReason || 'Violation of platform terms',
      suspended_by: user.id,
    })
    if (error) setMsg('Error: ' + error.message)
    else { setMsg('User suspended successfully'); setInputId(''); setInputReason(''); loadSuspended() }
  }

  async function unsuspendUser(userId) {
    const { error } = await supabase.from('suspended_users').delete().eq('user_id', userId)
    if (error) setMsg('Error: ' + error.message)
    else { setMsg('User unsuspended'); loadSuspended() }
  }

  if (loading) return <div style={{ padding: 48, textAlign: 'center', fontFamily: "'DM Mono', monospace" }}>Loading...</div>
  if (!user) return <div style={{ padding: 48, textAlign: 'center', fontFamily: "'DM Mono', monospace" }}>Please <a href="/" style={{ color: '#c1121f' }}>sign in</a> first.</div>
  if (!isAdmin) return <div style={{ padding: 48, textAlign: 'center', fontFamily: "'DM Mono', monospace", color: '#c1121f' }}>Access denied.</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 48, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ borderBottom: '3px double #0f0d0a', paddingBottom: 20, marginBottom: 32 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 900 }}>Joker Admin</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#6b6560', marginTop: 4 }}>Logged in as {user.email}</div>
      </div>

      {msg && (
        <div style={{ padding: '10px 16px', background: msg.startsWith('Error') ? '#fff1ef' : '#eaf8f1', border: msg.startsWith('Error') ? '1px solid #edb4ae' : '1px solid #b7dfc7', marginBottom: 24, fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{msg}</div>
      )}

      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Suspend a User</h2>
        <div style={{ border: '1px solid #0f0d0a', padding: 24 }}>
          <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, display: 'block', marginBottom: 6 }}>USER ID (from Supabase auth.users)</label>
          <input value={inputId} onChange={e => setInputId(e.target.value)} placeholder="e.g. 9ae63db2-55d3-41cc-a777-..." style={{ width: '100%', padding: '10px 14px', border: '1px solid #d4cfc6', marginBottom: 12, fontFamily: "'DM Mono', monospace", fontSize: 12, boxSizing: 'border-box' }} />
          <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, display: 'block', marginBottom: 6 }}>REASON</label>
          <input value={inputReason} onChange={e => setInputReason(e.target.value)} placeholder="Reason for suspension..." style={{ width: '100%', padding: '10px 14px', border: '1px solid #d4cfc6', marginBottom: 16, fontFamily: "'DM Mono', monospace", fontSize: 12, boxSizing: 'border-box' }} />
          <button onClick={suspendUser} style={{ padding: '10px 24px', background: '#c1121f', color: 'white', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.15em', cursor: 'pointer' }}>SUSPEND USER</button>
        </div>
      </div>

      <div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Suspended Users ({suspended.length})</h2>
        {suspended.length === 0 ? (
          <div style={{ color: '#6b6560', fontFamily: "'DM Mono', monospace", fontSize: 11 }}>No suspended users</div>
        ) : (
          suspended.map(s => (
            <div key={s.user_id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #d4cfc6' }}>
              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{s.user_id}</div>
                <div style={{ fontSize: 12, color: '#6b6560', marginTop: 4 }}>Reason: {s.reason}</div>
                <div style={{ fontSize: 11, color: '#6b6560' }}>{new Date(s.suspended_at).toLocaleString('zh-CN')}</div>
              </div>
              <button onClick={() => unsuspendUser(s.user_id)} style={{ padding: '6px 16px', background: 'none', border: '1px solid #0f0d0a', fontFamily: "'DM Mono', monospace", fontSize: 10, cursor: 'pointer', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>UNSUSPEND</button>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 48, textAlign: 'center' }}>
        <a href="/" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#c1121f' }}>Back to Joker</a>
      </div>
    </div>
  )
}
