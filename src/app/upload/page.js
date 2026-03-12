'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function UploadPage() {
  const [form, setForm] = useState({ title: '', author: '', summary: '', tags: '' })
  const [pdfFile, setPdfFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleUpload() {
    if (!form.title || !form.author) {
      setMessage('❌ 标题和作者必填')
      return
    }
    setUploading(true)
    setMessage('')

    try {
      let pdfUrl = null

      if (pdfFile) {
        const fileName = `${Date.now()}-${pdfFile.name}`
        const { error: fileError } = await supabase.storage
          .from('papers')
          .upload(fileName, pdfFile)
        if (fileError) throw new Error('PDF 上传失败: ' + fileError.message)
        const { data: urlData } = supabase.storage.from('papers').getPublicUrl(fileName)
        pdfUrl = urlData.publicUrl
      }

      const { error: dbError } = await supabase.from('papers').insert({
        title: form.title,
        author: form.author,
        summary: form.summary,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
        pdf_url: pdfUrl,
      })

      if (dbError) throw new Error('保存失败: ' + dbError.message)

      setMessage('✅ 上传成功！')
      setForm({ title: '', author: '', summary: '', tags: '' })
      setPdfFile(null)
    } catch (err) {
      setMessage('❌ ' + err.message)
    }
    setUploading(false)
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    border: '2px solid #e0e0e0', borderRadius: '8px',
    fontSize: '1rem', boxSizing: 'border-box', marginBottom: '16px',
  }

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '8px' }}>
        上传论文
      </h1>
      <p style={{ color: '#888', marginBottom: '32px' }}>分享你的研究成果</p>

      <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#444' }}>标题 *</label>
      <input value={form.title} onChange={e => updateForm('title', e.target.value)}
        placeholder="论文标题" style={inputStyle} />

      <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#444' }}>作者 *</label>
      <input value={form.author} onChange={e => updateForm('author', e.target.value)}
        placeholder="作者姓名" style={inputStyle} />

      <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#444' }}>摘要</label>
      <textarea value={form.summary} onChange={e => updateForm('summary', e.target.value)}
        placeholder="论文摘要..." rows={4}
        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />

      <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#444' }}>标签（逗号分隔）</label>
      <input value={form.tags} onChange={e => updateForm('tags', e.target.value)}
        placeholder="AI, 深度学习, NLP" style={inputStyle} />

      <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#444' }}>PDF 文件（可选）</label>
      <input type="file" accept=".pdf"
        onChange={e => setPdfFile(e.target.files[0])}
        style={{ ...inputStyle, padding: '8px' }} />

      {message && (
        <div style={{ padding: '12px', background: '#f8f9ff', borderRadius: '8px', marginBottom: '16px', color: '#444' }}>
          {message}
        </div>
      )}

      <button onClick={handleUpload} disabled={uploading}
        style={{
          width: '100%', padding: '14px', background: '#4a6cf7',
          color: 'white', border: 'none', borderRadius: '10px',
          fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold',
        }}>
        {uploading ? '上传中...' : '📤 发布论文'}
      </button>
    </main>
  )
}