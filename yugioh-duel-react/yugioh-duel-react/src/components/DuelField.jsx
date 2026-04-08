// ═══════════════════════════════════════════════════════════
// DuelField.jsx — Layout completo do campo de duelo
// ═══════════════════════════════════════════════════════════
import Zone       from './Zone'
import DeckZone   from './DeckZone'
import PlayerHand from './PlayerHand'
import { useDuel, PHASES } from '../contexts/DuelContext'

export default function DuelField() {
  const { instruction, turn, phase, phaseIndex, nextPhase } = useDuel()

  return (
    <>
      <main className="duel-field" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>

        {/* ── Opponent side ── */}
        <section className="field-side field-side--opponent">
          <div className="field-grid">
            <Zone type="field" side="opponent" label="FIELD" />
            {[0,1,2,3,4].map(i => (
              <Zone key={`om${i}`} zoneKey={`om${i}`} type="monster" side="opponent" dataZone={i} />
            ))}
            <Zone type="gy" side="opponent" label="GRAVEYARD" />
          </div>
          <div className="field-grid">
            <Zone type="extra" side="opponent" label="EXTRA DECK" />
            {[0,1,2,3,4].map(i => (
              <Zone key={`os${i}`} zoneKey={`os${i}`} type="spell" side="opponent"
                label={i===0||i===4 ? 'PENDULUM' : 'SPELL/TRAP'} />
            ))}
            <Zone type="deck" side="opponent" label="DECK" />
          </div>
        </section>

        {/* ── Center phase bar ── */}
        <div className="field-center" id="turnBlock">
          <div className="instruction" id="instruction">{instruction}</div>
          <div className="fc-turn">TURN {turn}</div>
          <div className="fc-phase-track">
            {PHASES.map((p, i) => (
              <div
                key={p.id}
                className={`fc-pip ${i === phaseIndex ? 'active' : ''} ${i < phaseIndex ? 'done' : ''}`}
                title={p.label}
              >
                <span className="fc-pip-label">{p.short}</span>
              </div>
            ))}
          </div>
          <div className="fc-phase-name">{phase.label}</div>
          <button className="fc-next-btn" onClick={nextPhase}>
            {phaseIndex === PHASES.length - 1 ? 'END TURN' : 'NEXT ›'}
          </button>
        </div>

        {/* ── Player side ── */}
        <section className="field-side field-side--player">
          <div className="field-grid">
            <Zone type="field" side="player" label="FIELD" />
            <div id="playerZones" style={{ display: 'contents' }}>
              {[0,1,2,3,4].map(i => (
                <Zone key={`pm${i}`} zoneKey={`pm${i}`} type="monster" side="player" dataZone={i} />
              ))}
            </div>
            <Zone type="gy" side="player" label="GRAVEYARD" />
          </div>
          <div className="field-grid" id="playerSpellRow">
            <Zone type="extra" side="player" label="EXTRA DECK" />
            <div id="playerSpellZones" style={{ display: 'contents' }}>
              {[0,1,2,3,4].map(i => (
                <Zone key={`ps${i}`} zoneKey={`ps${i}`} type="spell" side="player"
                  dataZone={`s${i}`} label={i===0||i===4 ? 'PENDULUM' : 'SPELL/TRAP'} />
              ))}
            </div>
            <DeckZone />
          </div>
          <PlayerHand />
        </section>

      </main>
    </>
  )
}