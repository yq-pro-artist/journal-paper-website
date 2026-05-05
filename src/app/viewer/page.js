'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ViewerContent() {
  const searchParams = useSearchParams()
  const url = searchParams.get('url')

  if (!url) return <div style={{ padding: 48, textAlign: 'center' }}>No PDF URL provided</div>

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* PDF iframe — hide toolbar */}
      <iframe
        src={url + '#toolbar=0&navpanes=0'}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="PDF Viewer"
      />

      {/* Watermark overlay — blocks right-click and covers content */}
      <div
        onContextMenu={e => e.preventDefault()}
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          pointerEvents: 'none',
          zIndex: 10,
          background: 'repeating-linear-gradient(45deg, transparent, transparent 200px, rgba(193,18,31,0.06) 200px, rgba(193,18,31,0.06) 201px)',
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'flex-start',
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} style={{
            width: '33.33%',
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'rotate(-30deg)',
            fontFamily: "'DM Mono', monospace",
            fontSize: 16,
            fontWeight: 600,
            color: 'rgba(193, 18, 31, 0.12)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}>
            Joker Exclusive
          </div>
        ))}
      </div>

      {/* Block right-click on the whole page */}
      <div
        onContextMenu={e => e.preventDefault()}
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 20,
          cursor: 'default',
        }}
      />

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        zIndex: 30,
        background: 'rgba(15, 13, 10, 0.95)',
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
