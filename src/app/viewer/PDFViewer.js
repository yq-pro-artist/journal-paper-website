'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

function ViewerContent() {
  const searchParams = useSearchParams()
  const url = searchParams.get('url')
  const containerRef = useRef(null)
  const [numPages, setNumPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!url) return

    async function renderPDF() {
      try {
        const pdf = await pdfjsLib.getDocument(url).promise
        setNumPages(pdf.numPages)
        const container = containerRef.current
        container.innerHTML = ''

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const scale = 1.5
          const viewport = page.getViewport({ scale })

          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.width = '100%'
          canvas.style.height = 'auto'
          canvas.style.display = 'block'
          canvas.style.marginBottom = '20px'

          const ctx = canvas.getContext('2d')
          await page.render({ canvasContext: ctx, viewport }).promise

          ctx.save()
          ctx.globalAlpha = 0.1
          ctx.fillStyle = '#c1121f'
          ctx.font = 'bold 48px monospace'
          for (let y = 80; y < viewport.height; y += 200) {
            for (let x = -100; x < viewport.width; x += 400) {
              ctx.save()
              ctx.translate(x, y)
              ctx.rotate(-Math.PI / 6)
              ctx.fillText('JOKER EXCLUSIVE', 0, 0)
              ctx.restore()
            }
          }
          ctx.restore()

          container.appendChild(canvas)
        }
        setLoading(false)
      } catch (err) {
        console.error('PDF render error:', err)
        setError('PDF 加载失败: ' + err.message)
        setLoading(false)
      }
    }

    renderPDF()
  }, [url])

  if (!url) return <div style={{ padding: 48, textAlign: 'center' }}>No PDF URL provided</div>

  return (
    <div onContextMenu={e => e.preventDefault()} style={{ background: '#2a2a2a', minHeight: '100vh' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(15, 13, 10, 0.97)',
        color: '#f5f0e8',
        padding: '10px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
        letterSpacing: '0.1em',
      }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 900, letterSpacing: 0 }}>Joker</span>
        <span style={{ color: '#c1121f' }}>JOKER EXCLUSIVE · 仅供阅览 · 禁止下载</span>
        <a href="/" style={{ color: '#f5f0e8', textDecoration: 'none' }}>← 返回</a>
      </div>

      {loading && !error && (
        <div style={{ textAlign: 'center', padding: 48, color: '#f5f0e8', fontFamily: "'DM Mono', monospace" }}>
          加载中...
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', padding: 48, color: '#c1121f', fontFamily: "'DM Mono', monospace" }}>
          {error}
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '20px',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      />

      {!loading && numPages > 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#6b6560', fontFamily: "'DM Mono', monospace", fontSize: 10 }}>
          共 {numPages} 页 · © Joker · 未经授权禁止转载
        </div>
      )}
    </div>
  )
}

export default function PDFViewer() {
  return (
    <Suspense fallback={<div style={{ padding: 48, textAlign: 'center', color: '#f5f0e8', background: '#2a2a2a', minHeight: '100vh' }}>Loading...</div>}>
      <ViewerContent />
    </Suspense>
  )
}
