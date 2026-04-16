'use client'
import { RATINGS, calcScore } from '../lib/utils'

export default function PaperCard({ p, rank, votes, userVote, onVote, showBadge, totalCount }) {
  const { score, total } = calcScore(votes)
  const rankIcons = ['🥇', '🥈', '🥉']
  const rankColors = ['#d4a017', '#a0a0a0', '#b87333']

  // Fix 6: correct border logic — show right border unless last column, bottom border unless last row
  const cols = 3
  const isLastCol = (rank % cols) === cols - 1
  const totalRows = Math.ceil((totalCount || rank + 1) / cols)
  const currentRow = Math.floor(rank / cols)
  const isLastRow = currentRow === totalRows - 1

  return (
    <div style={{
      padding: 22,
      borderRight: isLastCol ? 'none' : '1px solid #0f0d0a',
      borderBottom: isLastRow ? 'none' : '1px solid #0f0d0a',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      background: rank === 0 ? '#fffdf5' : 'white',
    }}>
      <div style={{
        position: 'absolute', top: 14, right: 14,
        fontFamily: "'Playfair Display', serif",
        fontSize: rank < 3 ? 28 : 22,
        fontWeight: 900,
        color: rank < 3 ? rankColors[rank] : '#d4cfc6',
        lineHeight: 1,
      }}>
        {rank < 3 ? rankIcons[rank] : `#${rank + 1}`}
      </div>

      {showBadge && rank < 10 && (
        <div style={{
          position: 'absolute', top: 14, left: 14,
          background: '#c1121f', color: 'white',
          fontFamily: "'DM Mono', monospace", fontSize: 8,
          letterSpacing: '0.1em', padding: '2px 6px',
        }}>收录</div>
      )}

      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 9,
        letterSpacing: '0.2em', textTransform: 'uppercase',
        color: '#c1121f', marginBottom: 7,
        marginTop: showBadge ? 20 : 0,
      }}>{p.tags?.[0] || '未分类'}</div>

      <div style={{
        fontFamily: "'Playfair Display', serif", fontSize: 16,
        fontWeight: 700, lineHeight: 1.3, marginBottom: 7, paddingRight: 34,
      }}>{p.title}</div>

      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 9,
        color: '#6b6560', marginBottom: 9,
      }}>{p.author} · {new Date(p.created_at).toLocaleDateString('zh-CN')}</div>

      <div style={{
        fontSize: 12, lineHeight: 1.6, color: '#6b6560', marginBottom: 12, flex: 1,
      }}>{p.summary}</div>

      {/* Score box */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 10, padding: '8px 10px',
        background: '#ffffff', border: '1px solid #0f0d0a',
      }}>
        <div>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontSize: 42,
            fontWeight: 900, lineHeight: 1,
          }}>{score.toFixed(1)}</div>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 8,
            color: '#6b6560', textTransform: 'uppercase',
          }}>综合评分</div>
        </div>
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: 9,
          color: '#6b6560', marginLeft: 'auto',
        }}>{total} 票</span>
      </div>

      {userVote && (
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 9,
          color: '#6b6560', textAlign: 'center', marginBottom: 6,
          letterSpacing: '0.08em',
        }}>✓ 已投票 · 一票定终身</div>
      )}

      {/* Rating buttons */}
      <div style={{ display: 'flex', gap: 3, borderTop: '1px solid #0f0d0a', paddingTop: 10 }}>
        {RATINGS.map(r => (
          <button
            key={r.key}
            onClick={() => onVote(p.id, r.key)}
            disabled={!!userVote}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 2, padding: '6px 2px',
              border: userVote === r.key ? '1px solid #0f0d0a' : '1px solid #d4cfc6',
              background: userVote === r.key ? '#0f0d0a' : 'white',
              cursor: userVote ? 'default' : 'pointer',
              opacity: userVote && userVote !== r.key ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 14 }}>{r.emoji}</span>
            <span style={{
              fontFamily: "'DM Mono', monospace", fontSize: 7,
              color: userVote === r.key ? '#f5f0e8' : '#6b6560',
              textAlign: 'center', lineHeight: 1.2,
            }}>{r.label}</span>
            <span style={{
              fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 600,
              color: userVote === r.key ? '#f5f0e8' : '#0f0d0a',
            }}>{(votes || {})[r.key] || 0}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
