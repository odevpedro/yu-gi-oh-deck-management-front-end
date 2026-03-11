// ═══════════════════════════════════════════════════════════
// AttackArrow.js — Seta de ataque fina, cinza, com Sobel dissolve
// ═══════════════════════════════════════════════════════════

const COLORS = {
  blade:  '#aaaaaa',
  glow:   '#cccccc',
  tip:    '#eeeeee',
  charge: '#bbbbbb',
  shards: ['#999999','#cccccc','#eeeeee','#aaaaaa'],
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  return el
}

function createRootSVG() {
  const svg = svgEl('svg', {
    width:  window.innerWidth,
    height: window.innerHeight,
    style: [
      'position:fixed', 'inset:0',
      'width:100vw', 'height:100vh',
      'pointer-events:none', 'z-index:900',
      'overflow:visible',
    ].join(';'),
  })
  document.body.appendChild(svg)
  return svg
}

function ensureFilters(svg) {
  const defs = svgEl('defs')

  // Filtro de glow suave
  const glow = svgEl('filter', { id: 'atkGlow', x: '-80%', y: '-80%', width: '260%', height: '260%' })
  const blur = svgEl('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '2', result: 'b' })
  const merge = svgEl('feMerge')
  merge.append(svgEl('feMergeNode', { in: 'b' }), svgEl('feMergeNode', { in: 'SourceGraphic' }))
  glow.append(blur, merge)

  // Filtro Sobel-like: detecção de borda + dissolve gradual
  // usa feConvolveMatrix para realçar bordas, depois composição
  const sobel = svgEl('filter', { id: 'atkSobel', x: '-20%', y: '-20%', width: '140%', height: '140%' })
  // Blur leve antes do edge
  const sb1 = svgEl('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '0.8', result: 'blurred' })
  // Convolução estilo Sobel (realça bordas)
  const sc = svgEl('feConvolveMatrix', {
    in: 'blurred',
    order: '3',
    kernelMatrix: '-1 -1 -1  -1 8 -1  -1 -1 -1',
    result: 'edges',
    preserveAlpha: 'true',
  })
  // Compõe original + bordas para efeito de diluição
  const scomp = svgEl('feComposite', { in: 'blurred', in2: 'edges', operator: 'over', result: 'sobeled' })
  // Blur final para suavizar dissolução
  const sb2 = svgEl('feGaussianBlur', { in: 'sobeled', stdDeviation: '1.2' })
  sobel.append(sb1, sc, scomp, sb2)

  defs.append(glow, sobel)
  svg.appendChild(defs)
}

function getCtrlPoint(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const nx = -dy / len, ny = dx / len
  const bulge = Math.min(len * 0.12, 40)
  return { mx: (x1 + x2) / 2 + nx * bulge, my: (y1 + y2) / 2 + ny * bulge, len, dx, dy }
}

// ── Fase 1: Charge ───────────────────────────────────────
function doCharge(svg, x1, y1) {
  const g = svgEl('g')
  svg.appendChild(g)
  const orb  = svgEl('circle', { cx: x1, cy: y1, r: 3,  fill: 'none', stroke: COLORS.charge, 'stroke-width': 1.5, opacity: 0 })
  const halo = svgEl('circle', { cx: x1, cy: y1, r: 8,  fill: 'none', stroke: COLORS.glow,   'stroke-width': 0.8, opacity: 0 })
  const core = svgEl('circle', { cx: x1, cy: y1, r: 4,  fill: COLORS.charge, opacity: 0, filter: 'url(#atkGlow)' })
  g.append(halo, orb, core)
  const t = { duration: 180, fill: 'forwards', easing: 'ease-in' }
  orb .animate([{ opacity: 0, r: 3  }, { opacity: 0.7, r: 14 }, { opacity: 0.15, r: 10 }], t)
  halo.animate([{ opacity: 0, r: 8  }, { opacity: 0.4, r: 28 }, { opacity: 0,    r: 36 }], t)
  core.animate([{ opacity: 0 }, { opacity: 0.9, offset: 0.4 }, { opacity: 0.5 }], t)
  return g
}

// ── Fase 2: Travel ───────────────────────────────────────
function doTravel(svg, x1, y1, x2, y2) {
  const g = svgEl('g')
  svg.appendChild(g)
  const { mx, my, dx, dy, len } = getCtrlPoint(x1, y1, x2, y2)
  const d = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`

  // Glow externo fino
  const glowPath = svgEl('path', { d, fill: 'none', stroke: COLORS.glow,
    'stroke-width': 4, opacity: 0, 'stroke-linecap': 'round', filter: 'url(#atkGlow)' })
  // Lâmina fina — cinza
  const blade = svgEl('path', { d, fill: 'none', stroke: COLORS.blade,
    'stroke-width': 1.5, opacity: 0, 'stroke-linecap': 'round' })
  // Núcleo central mínimo
  const corePath = svgEl('path', { d, fill: 'none', stroke: COLORS.tip,
    'stroke-width': 0.6, opacity: 0, 'stroke-linecap': 'round' })

  g.append(glowPath, blade, corePath)

  // Arrowhead menor e mais fino
  const nx = dx / len, ny = dy / len
  const px = -ny,      py = nx
  const sz = 7, bk = 13
  const pts = [
    `${x2},${y2}`,
    `${x2 - nx*bk + px*sz},${y2 - ny*bk + py*sz}`,
    `${x2 - nx*bk*0.5},${y2 - ny*bk*0.5}`,
    `${x2 - nx*bk - px*sz},${y2 - ny*bk - py*sz}`,
  ].join(' ')
  const head = svgEl('polygon', { points: pts, fill: COLORS.blade, opacity: 0 })
  g.appendChild(head)

  const dot = svgEl('circle', { r: 3, fill: COLORS.tip, opacity: 0, filter: 'url(#atkGlow)' })
  g.appendChild(dot)

  const bLen = blade.getTotalLength?.() ?? len
  const setDash = (el) => { el.setAttribute('stroke-dasharray', bLen); el.setAttribute('stroke-dashoffset', bLen) }
  setDash(glowPath); setDash(blade); setDash(corePath)

  const DUR = 340
  const ease = { duration: DUR, fill: 'forwards', easing: 'cubic-bezier(0.16,1,0.3,1)' }
  blade   .animate([{ strokeDashoffset: bLen, opacity: 0.1 }, { strokeDashoffset: 0, opacity: 0.9 }], ease)
  glowPath.animate([{ strokeDashoffset: bLen, opacity: 0   }, { strokeDashoffset: 0, opacity: 0.25 }], ease)
  corePath.animate([{ strokeDashoffset: bLen, opacity: 0   }, { strokeDashoffset: 0, opacity: 0.7  }], ease)
  head    .animate([{ opacity: 0 }, { opacity: 0, offset: 0.65 }, { opacity: 0.9 }], ease)
  dot     .animate([{ opacity: 0 }, { opacity: 0.8, offset: 0.05 }, { opacity: 0.6 }], ease)

  const pathId = `__ap_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
  const motionRefPath = svgEl('path', { d, id: pathId })
  svg.appendChild(motionRefPath)
  const motion = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion')
  motion.setAttribute('dur', `${DUR}ms`)
  motion.setAttribute('fill', 'freeze')
  motion.setAttribute('calcMode', 'spline')
  motion.setAttribute('keySplines', '0.16 1 0.3 1')
  const mpath = document.createElementNS('http://www.w3.org/2000/svg', 'mpath')
  mpath.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${pathId}`)
  motion.appendChild(mpath)
  dot.appendChild(motion)
  motion.beginElement?.()

  return { g, motionRefPath }
}

// ── Fase 3: Impact + Dissolve Sobel ─────────────────────
function doImpact(svg, x2, y2, tw, th) {
  const g = svgEl('g')
  svg.appendChild(g)
  const r = Math.max(tw, th) * 0.5

  // Flash pequeno e frio
  const flash = svgEl('circle', { cx: x2, cy: y2, r: r * 0.2,
    fill: COLORS.tip, opacity: 0 })

  // Anel primário — com filtro Sobel para dissolução de borda
  const ring1 = svgEl('circle', { cx: x2, cy: y2, r: 0,
    fill: 'none', stroke: COLORS.blade, 'stroke-width': 2, opacity: 0.8,
    filter: 'url(#atkSobel)' })

  // Anel secundário fino
  const ring2 = svgEl('circle', { cx: x2, cy: y2, r: 0,
    fill: 'none', stroke: COLORS.glow, 'stroke-width': 0.8, opacity: 0.4 })

  g.append(flash, ring1, ring2)

  const DUR = 420

  flash.animate([
    { opacity: 0.6, r: r * 0.18 },
    { opacity: 0,   r: r * 0.4  },
  ], { duration: 200, fill: 'forwards', easing: 'ease-out' })

  ring1.animate([
    { r: 0,   opacity: 0.8, strokeWidth: 2.5 },
    { r: r * 0.5, opacity: 0.5, strokeWidth: 1.5, offset: 0.4 },
    { r: r,   opacity: 0,   strokeWidth: 0.3 },
  ], { duration: DUR, fill: 'forwards', easing: 'ease-out' })

  ring2.animate([
    { r: 0, opacity: 0 },
    { r: r * 0.3, opacity: 0.4, offset: 0.2 },
    { r: r * 0.6, opacity: 0 },
  ], { duration: DUR, fill: 'forwards', easing: 'ease-out' })

  // Estilhaços finos — cinza, com dissolução gradual
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.35
    const sLen  = r * (0.3 + Math.random() * 0.4)
    const color = COLORS.shards[i % COLORS.shards.length]
    const shard = svgEl('line', { x1: x2, y1: y2, x2, y2,
      stroke: color, 'stroke-width': 0.8, opacity: 0.8,
      'stroke-linecap': 'round', filter: 'url(#atkSobel)' })
    g.appendChild(shard)
    shard.animate([
      { x2,                             y2,                             opacity: 0.8, strokeWidth: 1   },
      { x2: x2 + Math.cos(angle)*sLen*0.6, y2: y2 + Math.sin(angle)*sLen*0.6, opacity: 0.3, strokeWidth: 0.6, offset: 0.5 },
      { x2: x2 + Math.cos(angle)*sLen,  y2: y2 + Math.sin(angle)*sLen,  opacity: 0,   strokeWidth: 0.2 },
    ], { duration: DUR - i * 10, delay: i * 8, fill: 'forwards', easing: 'ease-out' })
  }

  return g
}

// ── API ──────────────────────────────────────────────────
export class AttackArrow {
  fire(attackerEl, targetEl, onImpact) {
    if (!attackerEl) { onImpact?.(); return }
    const aR = attackerEl.getBoundingClientRect()
    const resolvedTarget = targetEl ?? document.querySelector('.field-side--opponent') ?? document.body
    const tR = resolvedTarget.getBoundingClientRect()
    const x1 = aR.left + aR.width  / 2
    const y1 = aR.top  + aR.height / 2
    const x2 = tR.left + tR.width  / 2
    const y2 = tR.top  + tR.height / 2

    const svg = createRootSVG()
    ensureFilters(svg)

    const chargeG = doCharge(svg, x1, y1)

    let travelObjs = null
    setTimeout(() => {
      chargeG.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 100, fill: 'forwards' })
      travelObjs = doTravel(svg, x1, y1, x2, y2)
    }, 180)

    setTimeout(() => {
      // Dissolução Sobel na seta antes do impacto
      if (travelObjs?.g) {
        travelObjs.g.style.filter = 'url(#atkSobel)'
        travelObjs.g.animate([{ opacity: 1 }, { opacity: 0 }],
          { duration: 280, delay: 120, fill: 'forwards' })
      }
      setTimeout(() => travelObjs?.motionRefPath?.remove(), 600)
      doImpact(svg, x2, y2, tR.width, tR.height)
      onImpact?.()
    }, 520)

    setTimeout(() => {
      svg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' })
        .finished.then(() => svg.remove())
    }, 860)
  }
}

export const attackArrow = new AttackArrow()