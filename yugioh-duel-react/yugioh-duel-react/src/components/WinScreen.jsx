// ═══════════════════════════════════════════════════════════
// WinScreen.jsx — Tela de vitória/derrota
// ═══════════════════════════════════════════════════════════
import { useCallback } from 'react'
import { useDuel }     from '../contexts/DuelContext'

export default function WinScreen() {
  const { winner, resetDuel } = useDuel()

  const handleReset = useCallback(() => {
    resetDuel()
    // Reload hand from API after reset
    const urls = [
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Fusion+Monster&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Synchro+Monster&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=XYZ+Monster&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Link+Monster&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Effect+Monster&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Spell+Card&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Trap+Card&num=1&offset=0',
    ]
    Promise.all(urls.map(u => fetch(u).then(r => r.json())))
      .then(results => {
        // setHandCards is called inside resetDuel → hand is empty
        // We need to fire this after resetDuel clears state
        // Use a small delay so React has flushed the reset
        setTimeout(() => {
          window.__reloadHand?.(results.map(r => r.data[0]))
        }, 50)
      })
      .catch(() => {})
  }, [resetDuel])

  if (!winner) return null

  const isVictory = winner === 'player'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: isVictory
        ? 'radial-gradient(ellipse at center, rgba(30,80,30,.92) 0%, rgba(0,0,0,.96) 70%)'
        : 'radial-gradient(ellipse at center, rgba(80,10,10,.92) 0%, rgba(0,0,0,.96) 70%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '24px',
    }}>
      {/* Main text */}
      <div style={{
        fontFamily: 'Orbitron, monospace',
        fontSize: isVictory ? '2.8rem' : '2.2rem',
        fontWeight: 900,
        letterSpacing: '.18em',
        textAlign: 'center',
        color: isVictory ? 'rgba(80,220,120,1)' : 'rgba(220,60,50,1)',
        textShadow: isVictory
          ? '0 0 40px rgba(50,200,80,.8), 0 0 80px rgba(30,180,60,.4)'
          : '0 0 40px rgba(200,40,30,.8), 0 0 80px rgba(160,20,10,.4)',
        animation: 'pulse-win 1.8s ease-in-out infinite',
      }}>
        {isVictory ? 'VICTORY' : 'DEFEAT'}
      </div>

      <div style={{
        fontFamily: 'Orbitron, monospace', fontSize: '.55rem',
        letterSpacing: '.2em', color: 'rgba(200,220,240,.4)',
      }}>
        {isVictory ? 'OPPONENT LP REACHED 0' : 'YOUR LP REACHED 0'}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <button
          onClick={handleReset}
          style={{
            fontFamily: 'Orbitron, monospace', fontSize: '.45rem',
            fontWeight: 700, letterSpacing: '.14em',
            background: 'linear-gradient(180deg, #1a3a60, #0f2040)',
            border: '1px solid rgba(46,143,212,.7)',
            borderRadius: '2px', color: 'rgba(90,180,240,.9)',
            padding: '10px 28px', cursor: 'pointer',
            clipPath: 'polygon(8px 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 8px 100%, 0% 50%)',
            transition: 'all .15s',
          }}
          onMouseEnter={e => e.target.style.borderColor = 'rgba(90,180,240,1)'}
          onMouseLeave={e => e.target.style.borderColor = 'rgba(46,143,212,.7)'}
        >
          ↺ DUEL AGAIN
        </button>
      </div>

      <style>{`
        @keyframes pulse-win {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .85; transform: scale(1.02); }
        }
      `}</style>
    </div>
  )
}