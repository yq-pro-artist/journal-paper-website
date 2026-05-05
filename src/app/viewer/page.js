'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ViewerContent() {
  const searchParams = useSearchParams()
  const url = searchParams.get('url')

  if (!url) return <div style={{ padding: 48, textAlign: 'center' }}>No PDF URL provided</div>

  return (
    <div onContextMenu={e => e.preventDefault()} style={{ position: 'relative', width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        background: 'rgba(15, 13, 10, 0.95)',
        color: '#f5f0e8',
        padding: '10px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
        letterSpacing: '0.1em',
        flexShrink: 0,
        zIndex: 30,
      }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 900, letterSpacing: 0 }}>Joker</span>
        <span style={{ color: '#c1121f' }}>JOKER EXCLUSIVE · 仅供阅览 · 禁止下载</span>
        <a href="/" style={{ color: '#f5f0e8', textDecoration: 'none' }}>← 返回</a>
      </div>

      {/* PDF area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <iframe
          src={url + '#toolbar=0&navpanes=0&scrollbar=1'}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="PDF Viewer"
        />

        {/* Watermark layer — pointer-events none so PDF can scroll */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 10,
          pointerEvents: 'none',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridAutoRows: 180,
        }}>
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(-30deg)',
              fontFamily: "'DM Mono', monospace",
              fontSize: 18,
              fontWeight: 600,
              color: 'rgba(193, 18, 31, 0.13)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}>
              Joker Exclusive
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ViewerPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, textAlign: 'center' }}>Loading...</div>}>
      <ViewerContent />
    </Suspense>
  )
}
