// ═══════════════════════════════════════════════════════════
// ContextPanel.jsx — Painel lateral contextual
// ═══════════════════════════════════════════════════════════
import { useDuel } from '../contexts/DuelContext'

const ZONE_INFO = {
  monster: { name: 'Main Monster Zone',  desc: 'Zona para invocar monstros. Até 5 monstros simultâneos. Cartas em Defense Position são giradas 90°.' },
  spell:   { name: 'Spell & Trap Zone',  desc: 'Ativa Spells e coloca Traps. 5 zonas disponíveis. Spells resolvem imediatamente; Traps ficam face-down.' },
  field:   { name: 'Field Zone',         desc: 'Uma Field Spell pode ser ativada aqui. Cada jogador tem sua própria zona.' },
  gy:      { name: 'Graveyard',          desc: 'Cemitério. Cartas descartadas ou destruídas vão aqui. Ambos os jogadores podem verificar o conteúdo.' },
  extra:   { name: 'Extra Deck',         desc: 'Contém Fusion, Synchro, XYZ e Link Monsters. Máximo 15 cartas.' },
  deck:    { name: 'Main Deck',          desc: 'O deck principal. Mínimo 40, máximo 60 cartas. Compre 1 carta por turno na Draw Phase.' },
}

export default function ContextPanel() {
  const { panelMode, panelData, panelLastData } = useDuel()
  const payload = panelData ?? panelLastData

  return (
    <aside id="contextPanel" className={`context-panel context-panel--${panelMode}`}>
      {panelMode === 'card'  && payload && <CardView  card={payload} />}
      {panelMode === 'zone'  && payload && <ZoneView  zone={payload} />}
      {panelMode === 'stack' && payload && <StackView stack={payload} />}
      {panelMode === 'idle'  && <IdleView last={payload} />}
    </aside>
  )
}

// ── Idle ─────────────────────────────────────────────────
function IdleView({ last }) {
  return (
    <div className="cp-idle">
      <div className="cp-logo">
        <span className="cp-logo-icon">◈</span>
        <span className="cp-logo-text">CONTEXT</span>
      </div>
      <div className="cp-idle-hint">
        Passe o mouse sobre uma<br />carta ou zona do campo
      </div>
      {last && (
        <div className="cp-last">
          <div className="cp-last-label">ÚLTIMO VISUALIZADO</div>
          <div className="cp-last-name">{last.name ?? last.zoneName ?? '—'}</div>
        </div>
      )}
    </div>
  )
}

// ── Card ─────────────────────────────────────────────────
function CardView({ card }) {
  const stars = card.level
    ? <div className="cp-stars">{'★'.repeat(Math.min(card.level, 12))}</div>
    : card.rank
    ? <div className="cp-stars rank">{'✦'.repeat(Math.min(card.rank, 13))}</div>
    : card.linkval
    ? <div className="cp-tag cp-tag--link">LINK {card.linkval}</div>
    : null

  return (
    <div className="cp-card">
      <div className="cp-section cp-section--header">
        <div className="cp-label">CARTA</div>
        <div className="cp-card-name">{card.name}</div>
        <div className="cp-card-type">{card.type ?? ''}</div>
        <div className="cp-tags">
          {card.attribute && (
            <div className={`cp-tag cp-tag--attr cp-attr--${card.attribute.toLowerCase()}`}>
              {card.attribute}
            </div>
          )}
          {card.position && <div className="cp-tag cp-tag--pos">{card.position}</div>}
          {card.faceDown && <div className="cp-tag cp-tag--facedown">FACE-DOWN</div>}
        </div>
        {stars}
      </div>

      {card.imageUrl && (
        <div className="cp-section cp-section--art">
          <img className="cp-art" src={card.imageUrl} alt={card.name} loading="lazy" />
        </div>
      )}

      {card.atk !== undefined && (
        <div className="cp-stats">
          <div className="cp-stat">
            <span className="cp-stat-label">ATK</span>
            <span className="cp-stat-val atk">{card.atk ?? '?'}</span>
          </div>
          {card.def !== undefined && (
            <div className="cp-stat">
              <span className="cp-stat-label">DEF</span>
              <span className="cp-stat-val def">{card.def ?? '?'}</span>
            </div>
          )}
        </div>
      )}

      {card.desc && (
        <div className="cp-section cp-section--effect">
          <div className="cp-label">EFEITO</div>
          <div className="cp-effect-text">{card.desc}</div>
        </div>
      )}

      <div className="cp-section cp-section--meta">
        {card.controller && (
          <div className="cp-meta-row"><span>Controlador</span><span>{card.controller}</span></div>
        )}
        {card.zone && (
          <div className="cp-meta-row"><span>Zona</span><span>{card.zone}</span></div>
        )}
      </div>
    </div>
  )
}

// ── Zone ─────────────────────────────────────────────────
function ZoneView({ zone }) {
  const info = ZONE_INFO[zone.type] ?? { name: zone.type, desc: '' }
  return (
    <div className="cp-zone">
      <div className="cp-section cp-section--header">
        <div className="cp-label">ZONA</div>
        <div className="cp-zone-name">{info.name}</div>
        <div className={`cp-tag ${zone.occupied ? 'cp-tag--occupied' : 'cp-tag--empty'}`}>
          {zone.occupied ? 'OCUPADA' : 'VAZIA'}
        </div>
      </div>
      <div className="cp-section">
        <div className="cp-label">FUNÇÃO</div>
        <div className="cp-zone-desc">{info.desc}</div>
      </div>
    </div>
  )
}

// ── Stack ─────────────────────────────────────────────────
function StackView({ stack }) {
  const info = ZONE_INFO[stack.type] ?? { name: stack.type, desc: '' }
  return (
    <div className="cp-stack">
      <div className="cp-section cp-section--header">
        <div className="cp-label">PILHA</div>
        <div className="cp-zone-name">{info.name}</div>
        <div className="cp-count">
          <span className="cp-count-num">{stack.count}</span>
          <span className="cp-count-label">cartas</span>
        </div>
      </div>
      <div className="cp-section">
        <div className="cp-label">REGRA</div>
        <div className="cp-zone-desc">{info.desc}</div>
      </div>
      {stack.topCard && (
        <div className="cp-section">
          <div className="cp-label">TOPO</div>
          <div className="cp-last-name">{stack.topCard}</div>
        </div>
      )}
    </div>
  )
}
