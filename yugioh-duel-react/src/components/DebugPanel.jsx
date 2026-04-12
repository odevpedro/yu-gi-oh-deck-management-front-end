// ═══════════════════════════════════════════════════════════
// DebugPanel.jsx — Painel de logs in-app (DEV only)
// Toggle com tecla ` (backtick) ou botão no canto
// ═══════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react'
import { logger, TAGS_META } from '../utils/logger'

export default function DebugPanel() {
  const [open,    setOpen]    = useState(false)
  const [entries, setEntries] = useState([])
  const [filter,  setFilter]  = useState('ALL')
  const bottomRef = useRef(null)

  useEffect(() => {
    const unsub = logger.subscribe(setEntries)
    return unsub
  }, [])

  // Toggle com backtick
  useEffect(() => {
    const handler = (e) => { if (e.key === '`') setOpen(o => !o) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [open, entries])

  if (!import.meta.env.DEV) return null

  const tags = ['ALL', 'ATTACK', 'ENGINE', 'STATE', 'FX', 'PHASE', 'SUMMON', 'ERROR']
  const visible = filter === 'ALL' ? entries : entries.filter(e => e.tag === filter)

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 8, left: 8, zIndex: 9999,
          fontFamily: 'monospace', fontSize: '10px',
          padding: '3px 8px', cursor: 'pointer',
          background: open ? '#1a0a0a' : '#0a0a0a',
          color: open ? '#ff6644' : '#666',
          border: `1px solid ${open ? '#ff4422' : '#333'}`,
          borderRadius: '3px',
        }}
      >
        {open ? '▼ LOG' : '▶ LOG'} {entries.length > 0 && `(${entries.length})`}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 36, left: 8, zIndex: 9998,
          width: '420px', height: '320px',
          background: 'rgba(6,6,10,0.97)',
          border: '1px solid rgba(255,80,40,.3)',
          borderRadius: '4px',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'monospace', fontSize: '10px',
          boxShadow: '0 0 24px rgba(0,0,0,.8)',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 6px', borderBottom: '1px solid #222',
            flexShrink: 0,
          }}>
            <span style={{ color: '#ff6644', fontWeight: 'bold', marginRight: 4 }}>DUEL LOG</span>
            {tags.map(t => (
              <button key={t} onClick={() => setFilter(t)} style={{
                padding: '1px 5px', fontSize: '9px', cursor: 'pointer',
                background: filter === t ? (TAGS_META[t]?.bg ?? '#222') : 'transparent',
                color: filter === t ? (TAGS_META[t]?.color ?? '#fff') : '#555',
                border: `1px solid ${filter === t ? (TAGS_META[t]?.color ?? '#666') : '#333'}`,
                borderRadius: '2px',
              }}>{t}</button>
            ))}
            <button onClick={() => logger.clear()} style={{
              marginLeft: 'auto', padding: '1px 6px', fontSize: '9px',
              cursor: 'pointer', background: 'transparent',
              color: '#444', border: '1px solid #333', borderRadius: '2px',
            }}>CLEAR</button>
          </div>

          {/* Entries */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {visible.length === 0 && (
              <div style={{ color: '#333', padding: '8px 10px' }}>Nenhum log ainda.</div>
            )}
            {[...visible].reverse().map(e => {
              const meta = TAGS_META[e.tag] ?? TAGS_META.INFO
              return (
                <div key={e.id} style={{
                  display: 'flex', gap: 6, padding: '2px 8px',
                  borderBottom: '1px solid rgba(255,255,255,.03)',
                  alignItems: 'baseline',
                }}>
                  <span style={{ color: '#444', flexShrink: 0, fontSize: '9px' }}>{e.ts}</span>
                  <span style={{
                    background: meta.bg, color: meta.color,
                    padding: '0 4px', borderRadius: '2px',
                    fontSize: '9px', fontWeight: 'bold', flexShrink: 0,
                  }}>{e.tag}</span>
                  <span style={{ color: '#ccc', wordBreak: 'break-all' }}>{e.msg}</span>
                  {e.data && (
                    <span style={{ color: '#555', marginLeft: 'auto', flexShrink: 0 }}>
                      {typeof e.data === 'object'
                        ? JSON.stringify(e.data).slice(0, 60)
                        : String(e.data)}
                    </span>
                  )}
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </>
  )
}