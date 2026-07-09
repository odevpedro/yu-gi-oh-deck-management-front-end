import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function SideDeckPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const duelId = params.get('duelId')

  const [sideDeck, setSideDeck] = useState(
    Array.from({ length: 5 }, (_, i) => ({ id: `side-${i}`, name: `Side Deck Card ${i + 1}`, selected: false }))
  )

  function toggleCard(index) {
    setSideDeck(prev => prev.map((c, i) => i === index ? { ...c, selected: !c.selected } : c))
  }

  function confirmSwap() {
    navigate(`/duel/${duelId}`)
  }

  return (
    <main className="auth-shell">
      <section className="lobby-panel">
        <header className="lobby-header">
          <span>SIDE DECK</span>
          <strong>Troque cartas entre o deck principal e o side deck</strong>
        </header>

        <div className="auth-form">
          <p style={{ color: '#888', fontSize: '0.75rem', marginBottom: 16 }}>
            Selecione ate 5 cartas para trocar. As cartas selecionadas serao trocadas com cartas do side deck.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
            {sideDeck.map((card, i) => (
              <div
                key={card.id}
                onClick={() => toggleCard(i)}
                style={{
                  width: 80, height: 116,
                  background: card.selected
                    ? 'linear-gradient(145deg, #2a1a4a, #1a0a3a)'
                    : 'linear-gradient(145deg, #1a1a2a, #0e0e1e)',
                  border: card.selected
                    ? '2px solid rgba(180, 100, 255, 0.7)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 6, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 4, textAlign: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{
                  fontSize: '0.45rem', color: card.selected ? '#c8a0ff' : '#888',
                  fontFamily: 'Orbitron, monospace', lineHeight: 1.3,
                }}>
                  {card.name}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button className="auth-submit" onClick={confirmSwap}>
              CONFIRMAR E DUELAR
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}