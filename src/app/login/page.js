'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    setMessage('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage('❌ ' + error.message)
      else setMessage('✅ 注册成功！请检查邮箱确认链接')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage('❌ 邮箱或密码错误')
      else {
        setMessage('✅ 登录成功！')
        setTimeout(() => window.location.href = '/', 1000)
      }
    }
    setLoading(false)
  }

  return (
    <main style={{ maxWidth: '420px', margin: '80px auto', padding: '0 20px' }}>
      <div style={{
        border: '1px solid #e8e8e8', borderRadius: '16px',
        padding: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '8px' }}>
          {isSignUp ? '创建账号' : '欢迎回来'}
        </h1>
        <p style={{ color: '#888', marginBottom: '32px', fontSize: '0.9rem' }}>
          {isSignUp ? '注册 Paper Hub 账号' : '登录继续使用'}
        </p>

        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#444' }}>邮箱</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          style={{ width: '100%', padding: '10px 14px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box', marginBottom: '16px' }}
        />

        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#444' }}>密码</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="至少 6 位"
          style={{ width: '100%', padding: '10px 14px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box', marginBottom: '24px' }}
        />

        {message && (
          <div style={{ padding: '10px 14px', background: '#f8f9ff', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', color: '#444' }}>
            {message}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          style={{
            width: '100%', padding: '12px', background: '#4a6cf7',
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold',
          }}>
          {loading ? '处理中...' : (isSignUp ? '注册' : '登录')}
        </button>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem', color: '#888' }}>
          {isSignUp ? '已有账号？' : '没有账号？'}
          <button onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', color: '#4a6cf7', cursor: 'pointer', fontWeight: 'bold' }}>
            {isSignUp ? '去登录' : '去注册'}
          </button>
        </p>
      </div>
    </main>
  )
}