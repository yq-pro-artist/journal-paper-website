'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { trackSubmit } from '../lib/logsnag'
import { RATINGS, calcScore, isToday, isLastWeek, isLastMonth } from '../lib/utils'
import PaperCard from '../components/PaperCard'

export default function Home() {
  const [page, setPage] = useState('home')
  const [papers, setPapers] = useState([])
  const [votes, setVotes] = useState({})
  const [userVotes, setUserVotes] = useState({})
  const [filter, setFilter] = useState('all')
  const [authTab, setAuthTab] = useState('login')
  const [authMsg, setAuthMsg] = useState('')
  const [form, setForm] = useState({ title: '', author: '', category: '', abstract: '' })
  const [pdfFile, setPdfFile] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [refNum, setRefNum] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [today, setToday] = useState('')
  const [user, setUser] = useState(null)

  useEffect(() => {
    setToday(new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    loadPapers()

    supabase.auth.getSession().then(({ data }) => {
      const u = data?.session?.user || null
      setUser(u)
      if (u) loadVotes(u.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user || null
      setUser(u)
      if (u) loadVotes(u.id)
    })
    return () => subscription?.unsubscribe()
  }, [])

  async function loadPapers() {
    const { data } = await supabase.from('papers').select('*').order('created_at', { ascending: false })
    if (data) setPapers(data)
  }

  /**
   * Fix 3 & 5: Load votes and build userVotes from the database using the real user ID,
   * not random tokens or localStorage.
   */
  async function loadVotes(userId) {
    const { data } = await supabase.from('votes').select('*')
    if (!data) return

    // Aggregate vote counts per paper
    const grouped = {}
    data.forEach(v => {
      if (!grouped[v.paper_id]) grouped[v.paper_id] = { h: 0, d: 0, r: 0, n: 0, l: 0 }
      grouped[v.paper_id][v.rating] = (grouped[v.paper_id][v.rating] || 0) + 1
    })
    setVotes(grouped)

    // Find the current user's votes from the database (not localStorage)
    if (userId) {
      const uv = {}
      data.forEach(v => {
        if (v.user_id === userId) {
          uv[v.paper_id] = v.rating
        }
      })
      setUserVotes(uv)
    }
  }

  /**
   * Fix 2 & 3: Use user.id as the voter identifier.
   * The database should have a UNIQUE constraint on (paper_id, user_id).
   */
  async function castVote(paperId, ratingKey) {
    if (!user) { setPage('auth'); return }
    if (userVotes[paperId]) return // already voted — locked

    // Optimistic UI update
    setUserVotes(u => ({ ...u, [paperId]: ratingKey }))
    setVotes(v => {
      const nv = { ...v, [paperId]: { ...(v[paperId] || { h: 0, d: 0, r: 0, n: 0, l: 0 }) } }
      nv[paperId][ratingKey] = (nv[paperId][ratingKey] || 0) + 1
      return nv
    })

    // Write to database with user.id
    const { error } = await supabase.from('votes').insert({
      paper_id: paperId,
      user_id: user.id,
      rating: ratingKey,
    })

    if (error) {
      // Rollback on failure (e.g. unique constraint violation)
      console.error('Vote failed:', error.message)
      setUserVotes(u => { const copy = { ...u }; delete copy[paperId]; return copy })
      setVotes(v => {
        const nv = { ...v, [paperId]: { ...(v[paperId] || {}) } }
        nv[paperId][ratingKey] = Math.max((nv[paperId][ratingKey] || 1) - 1, 0)
        return nv
      })
    }
  }

  async function handleAuth(e) {
    e.preventDefault()
    if (authTab === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setAuthMsg('❌ ' + error.message)
      else { setAuthMsg('✅ Login successful!'); setTimeout(() => setPage('home'), 800) }
    } else {
      if (password !== confirmPassword) { setAuthMsg('❌ Passwords do not match'); return }
      if (password.length < 6) { setAuthMsg('❌ Password must be at least 6 characters'); return }
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) setAuthMsg('❌ ' + error.message)
      else if (data?.user?.identities?.length === 0) setAuthMsg('❌ Email already registered. Please sign in.')
      else setAuthMsg('✅ Registration successful! Please check your email to verify your account before signing in.')
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: 'https://journal-paper-website.vercel.app/reset-password',
    })
    if (error) setResetMsg('❌ ' + error.message)
    else setResetMsg('✅ Password reset email sent! Please check your inbox.')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user) { setPage('auth'); return }
    let pdfUrl = null
    if (pdfFile) {
      const fileName = `${Date.now()}-${pdfFile.name}`
      const { error: fe } = await supabase.storage.from('papers').upload(fileName, pdfFile)
      if (!fe) { const { data: ud } = supabase.storage.from('papers').getPublicUrl(fileName); pdfUrl = ud.publicUrl }
    }
    const { error } = await supabase.from('papers').insert({
      title: form.title, author: form.author,
      summary: form.abstract,
      tags: form.category ? [form.category] : [],
      pdf_url: pdfUrl,
    })
    if (!error) {
      setRefNum('JKR-' + Date.now().toString(36).toUpperCase().slice(-8))
      setSubmitted(true)
      loadPapers()
      trackSubmit(form.title, form.author)
    }
  }

  /* ── Derived data ──────────────────────────────── */
  const todayPapers = papers.filter(p => isToday(p.created_at))
  const todaySorted = [...todayPapers].sort((a, b) => calcScore(votes[b.id]).score - calcScore(votes[a.id]).score)

  const yesterdayTop3 = [...papers]
    .filter(p => p.collected === true)
    .sort((a, b) => new Date(b.collected_date) - new Date(a.collected_date))
    .slice(0, 3)

  const categories = [...new Set(papers.map(p => p.tags?.[0]).filter(Boolean))]
  const allSorted = [...papers].sort((a, b) => calcScore(votes[b.id]).score - calcScore(votes[a.id]).score)
  const filtered = filter === 'all' ? allSorted : allSorted.filter(p => p.tags?.[0] === filter)

  const lastWeekTop5 = [...papers]
    .filter(p => isLastWeek(p.created_at))
    .sort((a, b) => calcScore(votes[b.id]).score - calcScore(votes[a.id]).score)
    .slice(0, 5)

  const lastMonthTop10 = [...papers]
    .filter(p => isLastMonth(p.created_at))
    .sort((a, b) => calcScore(votes[b.id]).score - calcScore(votes[a.id]).score)
    .slice(0, 10)

  /* ── Responsive inline helper ──────────────────── */
  const rPad = 'clamp(16px, 4vw, 48px)'

  return (
    <>
      {/* ─── MASTHEAD ─── */}
      <header style={{ borderBottom: '3px double #0f0d0a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `10px ${rPad}`, borderBottom: '1px solid #0f0d0a', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.08em', color: '#6b6560', flexWrap: 'wrap', gap: 8 }}>
          <span>{today}</span>
          <span>创立于 2026</span>
          <span>开放获取 · 同行评审</span>
        </div>
        <div style={{ textAlign: 'center', padding: `24px ${rPad} 20px` }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(42px,8vw,96px)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1, animation: 'fadeDown 0.8s ease both' }}>Joker</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6b6560', marginTop: 8 }}>全民审核员</div>
        </div>
        <nav style={{ display: 'flex', flexWrap: 'wrap', borderTop: '1px solid #0f0d0a', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {[['home', 'Main'], ['today', "Today's Paper"], ['archive', 'Archive'], ['submit', 'Submit'], ['auth', 'Register/Sign In']].map(([id, label]) => (
            <a key={id} onClick={() => setPage(id)} style={{ flex: '1 1 auto', minWidth: 100, textAlign: 'center', padding: 10, borderRight: id !== 'auth' ? '1px solid #0f0d0a' : 'none', cursor: 'pointer', background: page === id ? '#c1121f' : 'transparent', color: page === id ? 'white' : '#0f0d0a', transition: 'background 0.2s' }}>{label}</a>
          ))}
        </nav>
      </header>

      {/* ─── HOME ─── */}
      {page === 'home' && (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
          {/* Hero — Fix 12: responsive grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', borderBottom: '3px double #0f0d0a' }}>
            <div style={{ padding: `48px ${rPad}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid #0f0d0a' }}>
              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#c1121f', marginBottom: 20, fontWeight: 600 }}>Featured</div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px,5vw,72px)', fontWeight: 900, lineHeight: 1.1 }}>
                  <span>Where </span><em style={{ fontStyle: 'italic', color: '#c1121f' }}>independent</em><span> voices find their place in print</span>
                </h2>
              </div>
              <p style={{ fontSize: 17, lineHeight: 1.8, color: '#6b6560', marginTop: 32 }}>Joker is an open-access platform for journalists, researchers, and writers.</p>
            </div>
            <div style={{ padding: `48px ${rPad}`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 36, borderRight: '1px solid #0f0d0a' }}>
              {[
                [papers.length.toString(), 'Papers Submitted'],
                ['9', 'Subject Categories'],
                ['48h', 'Avg. Review Time'],
              ].map(([val, label]) => (
                <div key={label} style={{ borderLeft: '3px solid #c1121f', paddingLeft: 20 }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 900, lineHeight: 1 }}>{val}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6b6560', marginTop: 6 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: '#0f0d0a', color: '#f5f0e8', padding: '32px 28px' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#b8860b', borderBottom: '1px solid #333', paddingBottom: 10, marginBottom: 16 }}>评分说明</div>
              {RATINGS.map(r => (
                <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>{r.emoji}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, flex: 1 }}>{r.label}</span>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 900, color: '#b8860b' }}>{r.points}分</span>
                </div>
              ))}
            </div>
          </div>

          {/* 昨日前三 */}
          <div style={{ padding: rPad, paddingTop: 48, paddingBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700 }}>昨日收录 Top 3</h2>
              <div style={{ flex: 1, height: 1, background: '#0f0d0a', minWidth: 40 }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#6b6560' }}>{new Date(Date.now() - 86400000).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</span>
            </div>

            {yesterdayTop3.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#6b6560', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📰</div>
                昨日暂无收录作品<br />
                <button onClick={() => setPage('submit')} style={{ marginTop: 20, padding: '10px 24px', background: '#c1121f', color: 'white', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>立即投稿</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', border: '1px solid #0f0d0a' }}>
                {yesterdayTop3.map((p, i) => (
                  <PaperCard key={p.id} p={p} rank={i} votes={votes[p.id]} userVote={userVotes[p.id]} onVote={castVote} totalCount={yesterdayTop3.length} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TODAY ─── */}
      {page === 'today' && (
        <div style={{ padding: rPad, paddingTop: 48, paddingBottom: 48, animation: 'fadeIn 0.4s ease' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700 }}>今日评选</h2>
            <div style={{ flex: 1, height: 1, background: '#0f0d0a', minWidth: 40 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ede8db', border: '1px solid #0f0d0a', padding: '3px 10px', fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c1121f', animation: 'pulse 2s infinite' }} />
              实时更新
            </div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#6b6560' }}>{todayPapers.length} 篇参评</span>
          </div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#6b6560', marginBottom: 32, letterSpacing: '0.05em' }}>评分前 10 名将在今日 24:00 收录</p>

          {todaySorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#6b6560', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🃏</div>
              今日暂无投稿<br />
              <button onClick={() => setPage('submit')} style={{ marginTop: 20, padding: '10px 24px', background: '#c1121f', color: 'white', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>成为今日第一位</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', border: '1px solid #0f0d0a' }}>
              {todaySorted.map((p, i) => (
                <PaperCard key={p.id} p={p} rank={i} votes={votes[p.id]} userVote={userVotes[p.id]} onVote={castVote} showBadge={i < 10} totalCount={todaySorted.length} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ARCHIVE ─── */}
      {page === 'archive' && (
        <div style={{ padding: rPad, paddingTop: 48, paddingBottom: 48, animation: 'fadeIn 0.4s ease' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 32 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700 }}>Archive</h2>
            <div style={{ flex: 1, height: 1, background: '#0f0d0a' }} />
          </div>

          {lastWeekTop5.length > 0 && (
            <div style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700 }}>Last Week — Top 5</h3>
                <div style={{ flex: 1, height: 1, background: '#d4cfc6' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', border: '1px solid #0f0d0a' }}>
                {lastWeekTop5.map((p, i) => (
                  <PaperCard key={p.id} p={p} rank={i} votes={votes[p.id]} userVote={userVotes[p.id]} onVote={castVote} totalCount={lastWeekTop5.length} />
                ))}
              </div>
            </div>
          )}

          {lastMonthTop10.length > 0 && (
            <div style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700 }}>Last Month — Top 10</h3>
                <div style={{ flex: 1, height: 1, background: '#d4cfc6' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', border: '1px solid #0f0d0a' }}>
                {lastMonthTop10.map((p, i) => (
                  <PaperCard key={p.id} p={p} rank={i} votes={votes[p.id]} userVote={userVotes[p.id]} onVote={castVote} totalCount={lastMonthTop10.length} />
                ))}
              </div>
            </div>
          )}

          {/* All papers — list view */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700 }}>All Papers</h3>
            <div style={{ flex: 1, height: 1, background: '#d4cfc6' }} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
            {['all', ...categories].map(c => (
              <button key={c} onClick={() => setFilter(c)} style={{ padding: '8px 18px', border: '1px solid #0f0d0a', background: filter === c ? '#0f0d0a' : 'none', color: filter === c ? '#f5f0e8' : '#0f0d0a', fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>{c === 'all' ? 'All' : c}</button>
            ))}
          </div>
          <div>
            {filtered.map((p, i) => {
              const { score, total } = calcScore(votes[p.id])
              return (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: 16, alignItems: 'start', padding: '24px 0', borderBottom: '1px solid #0f0d0a' }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 900, color: '#d4cfc6', lineHeight: 1 }}>{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c1121f', marginBottom: 6 }}>{p.tags?.[0] || '未分类'}</div>
                    {p.pdf_url ? (
                      <a href={p.pdf_url} target="_blank" rel="noreferrer" style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 6, lineHeight: 1.3, display: 'block', color: '#0f0d0a', textDecoration: 'none' }}>{p.title}</a>
                    ) : (
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>{p.title}</div>
                    )}
                    <div style={{ fontSize: 13, color: '#6b6560' }}>作者：{p.author}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#6b6560', marginBottom: 6 }}>{new Date(p.created_at).toLocaleDateString('zh-CN')}</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, color: '#b8860b' }}>{score.toFixed(1)}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#6b6560' }}>{total} 票</div>
                    {p.pdf_url && (
                      <a href={p.pdf_url} target="_blank" rel="noreferrer" style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#c1121f', display: 'block', marginTop: 4 }}>📄 PDF</a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── SUBMIT ─── */}
      {page === 'submit' && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: rPad, paddingTop: 48, paddingBottom: 48, animation: 'fadeIn 0.4s ease' }}>
          <div style={{ border: '1px solid #0f0d0a', background: '#fffdf9' }}>
            <div style={{ textAlign: 'center', borderBottom: '3px double #0f0d0a', padding: '28px 20px 16px' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px,6vw,56px)', fontWeight: 900, marginBottom: 4 }}>Submit</h2>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(16px,2.5vw,28px)', fontWeight: 400, color: '#6b6560', marginBottom: 12 }}>投稿</h3>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b6560' }}>今日投稿参与24小时评选 · 前10名收录</p>
            </div>
            {!user ? (
              <div style={{ textAlign: 'center', padding: '60px 48px' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, marginBottom: 12 }}>Login Required</h3>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#6b6560', marginBottom: 24 }}>请登录后再投稿</p>
                <button onClick={() => setPage('auth')} style={{ padding: '12px 32px', background: '#c1121f', color: 'white', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>Register / Sign In → 登录</button>
              </div>
            ) : !submitted ? (
              <form onSubmit={handleSubmit} style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label>Paper Title <span style={{ color: '#6b6560', fontWeight: 400, fontSize: 12 }}>论文标题</span> <span style={{ color: '#c1121f' }}>*</span></label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Your paper title / 你的作品标题" required />
                  </div>
                  <div>
                    <label>Author <span style={{ color: '#6b6560', fontWeight: 400, fontSize: 12 }}>作者姓名</span> <span style={{ color: '#c1121f' }}>*</span></label>
                    <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="Author name" required />
                  </div>
                  <div>
                    <label>Category <span style={{ color: '#6b6560', fontWeight: 400, fontSize: 12 }}>学科分类</span> <span style={{ color: '#c1121f' }}>*</span></label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required>
                      <option value="" disabled>Select category</option>
                      {['AI与机器学习', '自然语言处理', '计算机视觉', '数据科学', '量子计算', '生物信息', '社会科学', '人文艺术', '其他'].map(zh => (
                        <option key={zh} value={zh}>{zh}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label>Abstract <span style={{ color: '#6b6560', fontWeight: 400, fontSize: 12 }}>摘要</span> <span style={{ color: '#c1121f' }}>*</span></label>
                    <textarea value={form.abstract} onChange={e => setForm(f => ({ ...f, abstract: e.target.value }))} placeholder="Brief description of your work..." required style={{ minHeight: 120 }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1', border: '2px dashed #d4cfc6', padding: 32, textAlign: 'center', position: 'relative', cursor: 'pointer' }}>
                    <input type="file" accept=".pdf,.doc,.docx" onChange={e => setPdfFile(e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: pdfFile ? '#c1121f' : '#0f0d0a' }}>{pdfFile ? `✓ ${pdfFile.name}` : '拖拽文件或点击上传'}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#6b6560' }}>PDF · 最大 10MB</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <button type="submit" style={{ width: '100%', padding: 18, background: '#0f0d0a', color: '#f5f0e8', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer' }}>Submit / 提交 →</button>
                  </div>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px clamp(16px, 4vw, 48px)' }}>
                <div style={{ fontSize: 64, marginBottom: 24 }}>🃏</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 900, marginBottom: 16 }}>投稿成功！</h3>
                <p style={{ fontSize: 15, color: '#6b6560', lineHeight: 1.6, maxWidth: 440, margin: '0 auto 24px' }}>你的作品已加入今日评选，24小时后揭晓是否收录。</p>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, background: '#ede8db', border: '1px solid #0f0d0a', padding: '12px 24px', display: 'inline-block', marginBottom: 32 }}>{refNum}</div>
                <br />
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => setPage('today')} style={{ padding: '12px 24px', background: '#c1121f', color: 'white', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>查看今日排名</button>
                  <button onClick={() => { setSubmitted(false); setForm({ title: '', author: '', category: '', abstract: '' }); setPdfFile(null) }} style={{ padding: '12px 24px', background: 'none', border: '2px solid #0f0d0a', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>再次投稿</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── AUTH ─── */}
      {page === 'auth' && (
        <div style={{ maxWidth: 600, margin: '0 auto', padding: `56px ${rPad}`, animation: 'fadeIn 0.4s ease' }}>
          <div style={{ border: '1px solid #0f0d0a', background: '#fffdf9' }}>
            <div style={{ borderBottom: '3px double #0f0d0a', textAlign: 'center', padding: '28px 16px 18px' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, marginBottom: 4 }}>{authTab === 'login' ? 'Sign In' : 'Register'}</h2>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b6560' }}>Login required to submit and vote</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #0f0d0a' }}>
              {[['login', 'Sign In'], ['signup', 'Register']].map(([tab, label]) => (
                <button key={tab} onClick={() => { setAuthTab(tab); setAuthMsg(''); setShowReset(false); setConfirmPassword('') }} style={{ border: 'none', borderRight: tab === 'login' ? '1px solid #0f0d0a' : 'none', background: authTab === tab ? '#0f0d0a' : '#f5f0e8', color: authTab === tab ? '#f5f0e8' : '#0f0d0a', fontFamily: "'DM Mono', monospace", letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 11, padding: 12, cursor: 'pointer' }}>{label}</button>
              ))}
            </div>
            {showReset ? (
              <form onSubmit={handleResetPassword} style={{ padding: 26 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Reset Password</div>
                <div style={{ marginBottom: 16 }}>
                  <label>Email Address <span style={{ color: '#c1121f' }}>*</span></label>
                  <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="your@email.com" required />
                </div>
                {resetMsg && <div style={{ border: resetMsg.startsWith('✅') ? '1px solid #b7dfc7' : '1px solid #edb4ae', background: resetMsg.startsWith('✅') ? '#eaf8f1' : '#fff1ef', color: resetMsg.startsWith('✅') ? '#1d7f56' : '#9d2c21', fontFamily: "'DM Mono', monospace", fontSize: 11, padding: '10px 12px', marginBottom: 12 }}>{resetMsg}</div>}
                <button type="submit" style={{ width: '100%', padding: 14, background: '#0f0d0a', color: '#f5f0e8', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 12 }}>Send Reset Email →</button>
                <button type="button" onClick={() => { setShowReset(false); setResetMsg('') }} style={{ width: '100%', padding: 10, background: 'none', border: '1px solid #0f0d0a', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>← Back to Sign In</button>
              </form>
            ) : (
              <form onSubmit={handleAuth} style={{ padding: 26 }}>
                <div style={{ marginBottom: 12 }}>
                  <label>Email Address <span style={{ color: '#c1121f' }}>*</span></label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label>Password <span style={{ color: '#c1121f' }}>*</span></label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} required />
                </div>
                {authTab === 'signup' && (
                  <div style={{ marginBottom: 12 }}>
                    <label>Confirm Password <span style={{ color: '#c1121f' }}>*</span></label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" required />
                  </div>
                )}
                {authMsg && <div style={{ border: authMsg.startsWith('✅') ? '1px solid #b7dfc7' : '1px solid #edb4ae', background: authMsg.startsWith('✅') ? '#eaf8f1' : '#fff1ef', color: authMsg.startsWith('✅') ? '#1d7f56' : '#9d2c21', fontFamily: "'DM Mono', monospace", fontSize: 11, padding: '10px 12px', marginBottom: 12 }}>{authMsg}</div>}
                <button type="submit" style={{ width: '100%', padding: 16, background: '#0f0d0a', color: '#f5f0e8', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 12 }}>{authTab === 'login' ? 'Sign In →' : 'Create Account →'}</button>
                {authTab === 'login' && (
                  <button type="button" onClick={() => { setShowReset(true); setAuthMsg('') }} style={{ width: '100%', padding: 10, background: 'none', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#6b6560', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Forgot Password?</button>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─── FOOTER ─── */}
      <footer style={{ borderTop: '3px double #0f0d0a', padding: `24px ${rPad}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#6b6560', letterSpacing: '0.08em', textTransform: 'uppercase', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 900, color: '#0f0d0a', letterSpacing: 0, textTransform: 'none' }}>Joker</span>
        <span>开放获取 · 每日评选 · 创立于 2026</span>
        <span>别人笑我太疯癫</span>
      </footer>
    </>
  )
}
