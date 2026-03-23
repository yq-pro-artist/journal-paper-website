'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { trackSubmit, trackEvent } from '../lib/logsnag'

const RATINGS = [
  { key: 'h',  label: '夯',    emoji: '🔥', points: 5 },
  { key: 'd',  label: '顶级',  emoji: '⭐', points: 4 },
  { key: 'r',  label: '人上人',emoji: '👑', points: 3 },
  { key: 'n',  label: 'NPC',   emoji: '🤖', points: 2 },
  { key: 'l',  label: '拉完了',emoji: '👎', points: 1 },
]

function calcScore(votes) {
  let ws = 0, total = 0
  RATINGS.forEach(r => { const c = votes?.[r.key] || 0; ws += r.points * c; total += c })
  return total === 0 ? { score: 0, total } : { score: Math.round(ws / total * 10) / 10, total }
}

function isToday(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function isYesterday(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  return d.getFullYear() === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate()
}

function isLastWeek(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(now.getDate() - 7)
  const twoWeeksAgo = new Date(now)
  twoWeeksAgo.setDate(now.getDate() - 14)
  return d >= twoWeeksAgo && d < weekAgo
}

function isLastMonth(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return d >= lastMonth && d < thisMonth
}

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
  const [today, setToday] = useState('')

  useEffect(() => {
    setToday(new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    loadPapers()
    loadVotes()
  }, [])

  async function loadPapers() {
    const { data } = await supabase.from('papers').select('*').order('created_at', { ascending: false })
    if (data) setPapers(data)
  }

  async function loadVotes() {
    const { data } = await supabase.from('votes').select('*')
    if (data) {
      const grouped = {}
      data.forEach(v => {
        if (!grouped[v.paper_id]) grouped[v.paper_id] = { h: 0, d: 0, r: 0, n: 0, l: 0 }
        grouped[v.paper_id][v.rating] = (grouped[v.paper_id][v.rating] || 0) + 1
      })
      setVotes(grouped)

      // 读取本地已投票记录
      const uv = {}
      data.forEach(v => {
        const local = localStorage.getItem('uv_' + v.paper_id)
        if (local) uv[v.paper_id] = local
      })
      setUserVotes(uv)
    }
  }

  async function castVote(paperId, ratingKey) {
    const prev = userVotes[paperId]
    if (prev) return // 已投过，锁定不能改

    // 本地记录
    localStorage.setItem('uv_' + paperId, ratingKey)
    setUserVotes(u => ({ ...u, [paperId]: ratingKey }))

    // 更新本地显示
    setVotes(v => {
      const nv = { ...v, [paperId]: { ...(v[paperId] || {}) } }
      nv[paperId][ratingKey] = (nv[paperId][ratingKey] || 0) + 1
      return nv
    })

    // 写入数据库
    await supabase.from('votes').insert({ paper_id: paperId, user_token: getToken(), rating: ratingKey })
  }

  function getToken() {
    let t = localStorage.getItem('user_token')
    if (!t) { t = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('user_token', t) }
    return t
  }

  async function handleAuth(e) {
    e.preventDefault()
    if (authTab === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setAuthMsg('❌ ' + error.message)
      else { setAuthMsg('✅ 登录成功'); setTimeout(() => setPage('home'), 800) }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setAuthMsg('❌ ' + error.message)
      else { setAuthMsg('✅ 注册成功，请查收确认邮件'); setAuthTab('login') }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    let pdfUrl = null
    if (pdfFile) {
      const fileName = `${Date.now()}-${pdfFile.name}`
      const { error: fe } = await supabase.storage.from('papers').upload(fileName, pdfFile)
      if (!fe) { const { data: ud } = supabase.storage.from('papers').getPublicUrl(fileName); pdfUrl = ud.publicUrl }
    }
    const { error } = await supabase.from('papers').insert({ title: form.title, author: form.author, summary: form.abstract, tags: form.category ? [form.category] : [], pdf_url: pdfUrl })
    if (!error) {
      setRefNum('JKR-' + Date.now().toString(36).toUpperCase().slice(-8))
      setSubmitted(true)
      loadPapers()
      trackSubmit(form.title, form.author)
    }
  }

  // 今日参与评分的论文（今天上传的）
  const todayPapers = papers.filter(p => isToday(p.created_at))
  const todaySorted = [...todayPapers].sort((a, b) => calcScore(votes[b.id]).score - calcScore(votes[a.id]).score)
  // 今日收录前10
  const todayTop10 = todaySorted.slice(0, 10)

  // 昨日收录前3（主页展示）—— 使用数据库真实收录标记
  const yesterdayTop3 = [...papers]
    .filter(p => p.collected === true)
    .sort((a, b) => new Date(b.collected_date) - new Date(a.collected_date))
    .slice(0, 3)

  // 存档用
  const categories = [...new Set(papers.map(p => p.tags?.[0]).filter(Boolean))]
  const allSorted = [...papers].sort((a, b) => calcScore(votes[b.id]).score - calcScore(votes[a.id]).score)
  const filtered = filter === 'all' ? allSorted : allSorted.filter(p => p.tags?.[0] === filter)

  // 上周Top5 / 上月Top10
  const lastWeekTop5 = [...papers]
    .filter(p => isLastWeek(p.created_at))
    .sort((a, b) => calcScore(votes[b.id]).score - calcScore(votes[a.id]).score)
    .slice(0, 5)
  const lastMonthTop10 = [...papers]
    .filter(p => isLastMonth(p.created_at))
    .sort((a, b) => calcScore(votes[b.id]).score - calcScore(votes[a.id]).score)
    .slice(0, 10)

  return (
    <>
      {/* MASTHEAD */}
      <header style={{ borderBottom: '3px double #0f0d0a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 48px', borderBottom: '1px solid #0f0d0a', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.08em', color: '#6b6560' }}>
          <span>{today}</span>
          <span>创立于 2026</span>
          <span>开放获取 · 同行评审</span>
        </div>
        <div style={{ textAlign: 'center', padding: '24px 48px 20px' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(52px,8vw,96px)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1, animation: 'fadeDown 0.8s ease both' }}>Joker</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6b6560', marginTop: 8 }}>全民审核员</div>
        </div>
        <nav style={{ display: 'flex', borderTop: '1px solid #0f0d0a', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {[['home','Main'], ['today',"Today's Paper"], ['archive','Archive'], ['submit','Submit'], ['auth','Register/Sign In']].map(([id, label]) => (
            <a key={id} onClick={() => setPage(id)} style={{ flex: 1, textAlign: 'center', padding: '10px', borderRight: id !== 'auth' ? '1px solid #0f0d0a' : 'none', cursor: 'pointer', background: page === id ? '#c1121f' : 'transparent', color: page === id ? 'white' : '#0f0d0a', transition: 'background 0.2s' }}>{label}</a>
          ))}
        </nav>
      </header>

      {/* 首页：昨日前三 */}
      {page === 'home' && (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>

          {/* Hero */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 300px', borderBottom: '3px double #0f0d0a', minHeight: 320 }}>
            <div style={{ padding: '40px 40px 40px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c1121f', marginBottom: 12 }}>昨日收录</div>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 700, lineHeight: 1.15 }}>评分最高的<em style={{ fontStyle: 'italic', color: '#c1121f' }}>三篇作品</em></h1>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: '#6b6560' }}>每天24小时内，评分最高的前10篇作品将被收录。主页展示昨日冠亚季军。</p>
            </div>
            <div style={{ background: '#0f0d0a' }} />
            <div style={{ padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#c1121f', marginBottom: 20, fontWeight: 600 }}>Featured</div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px,3vw,42px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 0 }}>
                  <span>Where </span><em style={{ fontStyle: 'italic', color: '#c1121f' }}>independent</em><span> voices find their place in print</span>
                </h2>
              </div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, lineHeight: 1.8, color: '#6b6560', marginTop: 32 }}>Joker is an open-access platform for journalists, researchers, and writers. Submit your investigations, essays, and analyses for peer review and global readership.</p>
            </div>
            <div style={{ background: '#0f0d0a' }} />
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
          <div style={{ padding: 48 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 32 }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700 }}>昨日收录 Top 3</h2>
              <div style={{ flex: 1, height: 1, background: '#0f0d0a' }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#6b6560' }}>{new Date(Date.now() - 86400000).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</span>
            </div>

            {yesterdayTop3.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#6b6560', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📰</div>
                昨日暂无收录作品<br />
                <button onClick={() => setPage('submit')} style={{ marginTop: 20, padding: '10px 24px', background: '#c1121f', color: 'white', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>立即投稿</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', border: '1px solid #0f0d0a' }}>
                {yesterdayTop3.map((p, i) => <PaperCard key={p.id} p={p} rank={i} votes={votes[p.id]} userVote={userVotes[p.id]} onVote={castVote} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 今日评选 */}
      {page === 'today' && (
        <div style={{ padding: 48, animation: 'fadeIn 0.4s ease' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 12 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700 }}>今日评选</h2>
            <div style={{ flex: 1, height: 1, background: '#0f0d0a' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ede8db', border: '1px solid #0f0d0a', padding: '3px 10px', fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c1121f', animation: 'pulse 2s infinite' }} />
              实时更新
            </div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#6b6560' }}>{todayPapers.length} 篇参评</span>
          </div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#6b6560', marginBottom: 32, letterSpacing: '0.05em' }}>评分前 10 名将在今日 24:00 收录 · 现在为排名第 {todaySorted.findIndex(p => p) + 1} 名投票</p>

          {todayTop10.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#6b6560', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🃏</div>
              今日暂无投稿<br />
              <button onClick={() => setPage('submit')} style={{ marginTop: 20, padding: '10px 24px', background: '#c1121f', color: 'white', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>成为今日第一位</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', border: '1px solid #0f0d0a' }}>
              {todaySorted.map((p, i) => <PaperCard key={p.id} p={p} rank={i} votes={votes[p.id]} userVote={userVotes[p.id]} onVote={castVote} showBadge={i < 10} />)}
            </div>
          )}
        </div>
      )}

      {/* 存档 */}
      {page === 'archive' && (
        <div style={{ padding: 48, animation: 'fadeIn 0.4s ease' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 32 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700 }}>Archive</h2>
            <div style={{ flex: 1, height: 1, background: '#0f0d0a' }} />
          </div>

          {/* 上周 Top 5 */}
          {lastWeekTop5.length > 0 && (
            <div style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700 }}>Last Week — Top 5</h3>
                <div style={{ flex: 1, height: 1, background: '#d4cfc6' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', border: '1px solid #0f0d0a' }}>
                {lastWeekTop5.map((p, i) => <PaperCard key={p.id} p={p} rank={i} votes={votes[p.id]} userVote={userVotes[p.id]} onVote={castVote} />)}
              </div>
            </div>
          )}

          {/* 上月 Top 10 */}
          {lastMonthTop10.length > 0 && (
            <div style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700 }}>Last Month — Top 10</h3>
                <div style={{ flex: 1, height: 1, background: '#d4cfc6' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', border: '1px solid #0f0d0a' }}>
                {lastMonthTop10.map((p, i) => <PaperCard key={p.id} p={p} rank={i} votes={votes[p.id]} userVote={userVotes[p.id]} onVote={castVote} />)}
              </div>
            </div>
          )}

          {/* 全部 */}
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
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 24, alignItems: 'start', padding: '24px 0', borderBottom: '1px solid #0f0d0a' }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 900, color: '#d4cfc6', lineHeight: 1 }}>{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c1121f', marginBottom: 6 }}>{p.tags?.[0] || '未分类'}</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>{p.title}</div>
                    <div style={{ fontSize: 13, color: '#6b6560' }}>作者：{p.author}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#6b6560', marginBottom: 6 }}>{new Date(p.created_at).toLocaleDateString('zh-CN')}</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, color: '#b8860b' }}>{score.toFixed(1)}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#6b6560' }}>{total} 票</div>
                    {p.pdf_url && (
                  <div style={{ position: 'relative', marginTop: 4 }}>
                    <a href={p.pdf_url} target="_blank" rel="noreferrer" style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#c1121f', display: 'block' }}>📄 PDF</a>
                    <div style={{ fontSize: 8, color: '#d4cfc6', fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em', marginTop: 2 }}>Joker — 别人笑我太疯癫，我笑他人看不穿</div>
                  </div>
                )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 投稿 */}
      {page === 'submit' && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 48, animation: 'fadeIn 0.4s ease' }}>
          <div style={{ border: '1px solid #0f0d0a', background: '#fffdf9' }}>
            <div style={{ textAlign: 'center', borderBottom: '3px double #0f0d0a', padding: '28px 20px 16px' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(34px,6vw,56px)', fontWeight: 900, marginBottom: 8 }}>投稿</h2>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b6560' }}>今日投稿参与24小时评选 · 前10名收录</p>
            </div>
            {!submitted ? (
              <form onSubmit={handleSubmit} style={{ padding: 32 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label>论文标题 <span style={{ color: '#c1121f' }}>*</span></label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="你的作品标题" required />
                  </div>
                  <div>
                    <label>作者姓名 <span style={{ color: '#c1121f' }}>*</span></label>
                    <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="作者姓名" required />
                  </div>
                  <div>
                    <label>学科分类 <span style={{ color: '#c1121f' }}>*</span></label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%230f0d0a' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36 }}>
                      <option value="" disabled>选择分类</option>
                      {['AI与机器学习', '自然语言处理', '计算机视觉', '数据科学', '量子计算', '生物信息', '社会科学', '人文艺术', '其他'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label>摘要 <span style={{ color: '#c1121f' }}>*</span></label>
                    <textarea value={form.abstract} onChange={e => setForm(f => ({ ...f, abstract: e.target.value }))} placeholder="简短介绍你的作品..." required style={{ minHeight: 120 }} />
                  </div>
                  <div style={{ gridColumn: 'span 2', border: '2px dashed #d4cfc6', padding: 32, textAlign: 'center', position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <input type="file" accept=".pdf,.doc,.docx" onChange={e => setPdfFile(e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 6, color: pdfFile ? '#c1121f' : '#0f0d0a' }}>{pdfFile ? `✓ ${pdfFile.name}` : '拖拽文件或点击上传'}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#6b6560' }}>PDF · 最大 10MB</div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <button type="submit" style={{ width: '100%', padding: 18, background: '#0f0d0a', color: '#f5f0e8', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer' }}>提交参与今日评选 →</button>
                  </div>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 48px' }}>
                <div style={{ fontSize: 64, marginBottom: 24 }}>🃏</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 900, marginBottom: 16 }}>投稿成功！</h3>
                <p style={{ fontSize: 15, color: '#6b6560', lineHeight: 1.6, maxWidth: 440, margin: '0 auto 24px' }}>你的作品已加入今日评选，24小时后揭晓是否收录。</p>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, background: '#ede8db', border: '1px solid #0f0d0a', padding: '12px 24px', display: 'inline-block', marginBottom: 32, letterSpacing: '0.1em' }}>{refNum}</div>
                <br />
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <button onClick={() => setPage('today')} style={{ padding: '12px 24px', background: '#c1121f', color: 'white', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>查看今日排名</button>
                  <button onClick={() => { setSubmitted(false); setForm({ title: '', author: '', category: '', abstract: '' }); setPdfFile(null) }} style={{ padding: '12px 24px', background: 'none', border: '2px solid #0f0d0a', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>再次投稿</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 登录 */}
      {page === 'auth' && (
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '56px 48px', animation: 'fadeIn 0.4s ease' }}>
          <div style={{ border: '1px solid #0f0d0a', background: '#fffdf9' }}>
            <div style={{ borderBottom: '3px double #0f0d0a', textAlign: 'center', padding: '28px 16px 18px' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, marginBottom: 8 }}>账号</h2>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b6560' }}>登录后可管理你的投稿</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #0f0d0a' }}>
              {[['login', '登录'], ['signup', '注册']].map(([tab, label]) => (
                <button key={tab} onClick={() => { setAuthTab(tab); setAuthMsg('') }} style={{ border: 'none', borderRight: tab === 'login' ? '1px solid #0f0d0a' : 'none', background: authTab === tab ? '#0f0d0a' : '#f5f0e8', color: authTab === tab ? '#f5f0e8' : '#0f0d0a', fontFamily: "'DM Mono', monospace", letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 11, padding: 12, cursor: 'pointer' }}>{label}</button>
              ))}
            </div>
            <form onSubmit={handleAuth} style={{ padding: 26 }}>
              <div style={{ marginBottom: 12 }}>
                <label>邮箱 <span style={{ color: '#c1121f' }}>*</span></label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label>密码 <span style={{ color: '#c1121f' }}>*</span></label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="至少 6 位" minLength={6} required />
              </div>
              {authMsg && <div style={{ border: authMsg.startsWith('✅') ? '1px solid #b7dfc7' : '1px solid #edb4ae', background: authMsg.startsWith('✅') ? '#eaf8f1' : '#fff1ef', color: authMsg.startsWith('✅') ? '#1d7f56' : '#9d2c21', fontFamily: "'DM Mono', monospace", fontSize: 11, padding: '10px 12px', marginBottom: 12 }}>{authMsg}</div>}
              <button type="submit" style={{ width: '100%', padding: 18, background: '#0f0d0a', color: '#f5f0e8', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer' }}>{authTab === 'login' ? '登录' : '创建账号'}</button>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer style={{ borderTop: '3px double #0f0d0a', padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#6b6560', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 900, color: '#0f0d0a', letterSpacing: 0, textTransform: 'none' }}>Joker</span>
        <span>开放获取 · 每日评选 · 创立于 2026</span>
        <span>别人笑我太疯癫</span>
      </footer>
    </>
  )
}

function PaperCard({ p, rank, votes, userVote, onVote, showBadge }) {
  const { score, total } = calcScore(votes)
  const rankIcons = ['🥇', '🥈', '🥉']
  const rankColors = ['#d4a017', '#a0a0a0', '#b87333']

  return (
    <div style={{ padding: 22, borderRight: rank % 3 !== 2 ? '1px solid #0f0d0a' : 'none', borderBottom: rank < (Math.floor(rank / 3)) * 3 ? '1px solid #0f0d0a' : 'none', display: 'flex', flexDirection: 'column', position: 'relative', background: rank === 0 ? '#fffdf5' : 'white' }}>
      <div style={{ position: 'absolute', top: 14, right: 14, fontFamily: "'Playfair Display', serif", fontSize: rank < 3 ? 28 : 22, fontWeight: 900, color: rank < 3 ? rankColors[rank] : '#d4cfc6', lineHeight: 1 }}>{rank < 3 ? rankIcons[rank] : `#${rank + 1}`}</div>
      {showBadge && rank < 10 && <div style={{ position: 'absolute', top: 14, left: 14, background: '#c1121f', color: 'white', fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.1em', padding: '2px 6px' }}>收录</div>}
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c1121f', marginBottom: 7, marginTop: showBadge ? 20 : 0 }}>{p.tags?.[0] || '未分类'}</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, lineHeight: 1.3, marginBottom: 7, paddingRight: 34 }}>{p.title}</div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#6b6560', marginBottom: 9 }}>{p.author} · {new Date(p.created_at).toLocaleDateString('zh-CN')}</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, color: '#6b6560', marginBottom: 12, flex: 1 }}>{p.summary}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 10px', background: '#ede8db', border: '1px solid #0f0d0a' }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 900, lineHeight: 1 }}>{score.toFixed(1)}</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#6b6560', textTransform: 'uppercase' }}>综合评分</div>
        </div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#6b6560', marginLeft: 'auto' }}>{total} 票</span>
      </div>
      {userVote && <div style={{ fontFamily: "\'DM Mono\', monospace", fontSize: 9, color: '#6b6560', textAlign: 'center', marginBottom: 6, letterSpacing: '0.08em' }}>✓ 已投票 · 一票定终身</div>}
      <div style={{ display: 'flex', gap: 3, borderTop: '1px solid #0f0d0a', paddingTop: 10 }}>
        {RATINGS.map(r => (
          <button key={r.key} onClick={() => onVote(p.id, r.key)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 2px', border: userVote === r.key ? '1px solid #0f0d0a' : '1px solid #d4cfc6', background: userVote === r.key ? '#0f0d0a' : 'white', cursor: 'pointer', transition: 'all 0.15s' }}>
            <span style={{ fontSize: 14 }}>{r.emoji}</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: userVote === r.key ? '#f5f0e8' : '#6b6560', textAlign: 'center', lineHeight: 1.2 }}>{r.label}</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 600, color: userVote === r.key ? '#f5f0e8' : '#0f0d0a' }}>{(votes || {})[r.key] || 0}</span>
          </button>
        ))}
      </div>
    </div>
  )
}