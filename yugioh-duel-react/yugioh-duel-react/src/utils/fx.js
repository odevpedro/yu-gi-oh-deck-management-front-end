// ═══════════════════════════════════════════════════════════
// fx.js — Canvas FX: Summon, Spell, Attack, LP, Sobel, Parallax
// ═══════════════════════════════════════════════════════════

// ── Dominant color ───────────────────────────────────────
function dominantColor(px, W, H) {
  let rSum = 0, gSum = 0, bSum = 0, count = 0
  const step = Math.max(1, Math.floor(W / 20))
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const i = (y * W + x) * 4
      const r = px[i], g = px[i+1], b = px[i+2]
      const br = (r + g + b) / 3
      if (br < 25 || br > 230) continue
      rSum += r; gSum += g; bSum += b; count++
    }
  }
  if (!count) return [0, 200, 255]
  let r = rSum/count, g = gSum/count, b = bSum/count
  const avg = (r + g + b) / 3
  const sat = 2.2
  r = Math.min(255, Math.max(0, avg + (r - avg) * sat))
  g = Math.min(255, Math.max(0, avg + (g - avg) * sat))
  b = Math.min(255, Math.max(0, avg + (b - avg) * sat))
  return [Math.round(r), Math.round(g), Math.round(b)]
}

// ── Sobel edge glow ──────────────────────────────────────
export async function sobelEdgeGlow(zoneEl, dataUrl) {
  const W = zoneEl.clientWidth
  const H = zoneEl.clientHeight

  const src = document.createElement('canvas')
  src.width = W; src.height = H
  const sCtx = src.getContext('2d')
  await new Promise((res, rej) => {
    const im = new Image()
    im.onload  = () => { sCtx.drawImage(im, 0, 0, W, H); res() }
    im.onerror = rej
    im.src = dataUrl
  })

  const { data: px } = sCtx.getImageData(0, 0, W, H)
  const [dr, dg, db] = dominantColor(px, W, H)

  const edge = new Float32Array(W * H)
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const luma = (r, g, b) => 0.299*r + 0.587*g + 0.114*b
      const p = (dx, dy) => {
        const i = ((y + dy) * W + (x + dx)) * 4
        return luma(px[i], px[i+1], px[i+2])
      }
      const gx = -p(-1,-1) - 2*p(-1,0) - p(-1,1) + p(1,-1) + 2*p(1,0) + p(1,1)
      const gy = -p(-1,-1) - 2*p(0,-1) - p(1,-1) + p(-1,1) + 2*p(0,1) + p(1,1)
      edge[y * W + x] = Math.min(255, Math.sqrt(gx*gx + gy*gy))
    }
  }

  const glowCanvas = document.createElement('canvas')
  glowCanvas.width = W; glowCanvas.height = H
  glowCanvas.style.cssText = `position:absolute;inset:0;z-index:5;pointer-events:none;mix-blend-mode:screen;border-radius:5px;`
  const gCtx = glowCanvas.getContext('2d')
  const out  = gCtx.createImageData(W, H)

  for (let i = 0; i < W * H; i++) {
    const v = edge[i]
    if (v < 18) continue
    const t = v / 255
    out.data[i*4+0] = Math.round(dr * t)
    out.data[i*4+1] = Math.round(dg * t)
    out.data[i*4+2] = Math.round(db * t)
    out.data[i*4+3] = Math.round(t * 255)
  }
  gCtx.putImageData(out, 0, 0)
  gCtx.filter = 'blur(2px)'
  gCtx.drawImage(glowCanvas, 0, 0)
  gCtx.filter = 'none'

  zoneEl.appendChild(glowCanvas)
  glowCanvas.animate([
    { opacity: 0, filter: 'blur(6px)' },
    { opacity: 1, filter: 'blur(2px)', offset: 0.15 },
    { opacity: 0.85, filter: 'blur(2px)', offset: 0.6 },
    { opacity: 0, filter: 'blur(8px)' },
  ], { duration: 2400, easing: 'ease-in-out', fill: 'forwards' })
    .finished.then(() => glowCanvas.remove())
}

// ── Normal Summon FX ─────────────────────────────────────
export function normalSummonFX(zoneEl) {
  const ZW = zoneEl.clientWidth  || 85
  const ZH = zoneEl.clientHeight || 124
  const PAD = 80, CW = ZW+PAD*2, CH = ZH+PAD*2
  const cx = CW/2, cy = CH/2
  const cv = document.createElement('canvas')
  cv.width = CW; cv.height = CH
  cv.style.cssText = `position:absolute;left:${-PAD}px;top:${-PAD}px;width:${CW}px;height:${CH}px;pointer-events:none;z-index:10;mix-blend-mode:screen;`
  zoneEl.appendChild(cv)
  const ctx = cv.getContext('2d')
  const PARTICLE_COUNT = 28
  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    angle: (i/PARTICLE_COUNT)*Math.PI*2+Math.random()*.3,
    speed: 1.8+Math.random()*2.2, size: 1.5+Math.random()*2.5,
    life: .6+Math.random()*.4,
    color: i%3===0?'255,200,50':i%3===1?'0,220,255':'180,255,180',
    x: cx, y: cy, age: 0,
  }))
  const DURATION = 900; let start = null
  ;(function draw(ts) {
    if (!start) start = ts
    const t = Math.min((ts-start)/DURATION, 1)
    ctx.clearRect(0, 0, CW, CH)
    if (t < .35) {
      const bt = t/.35, brad = ZW*.6*bt
      const alpha = bt<.5?bt*2:(1-(bt-.5)*2)
      const grad = ctx.createRadialGradient(cx,cy,0,cx,cy,brad)
      grad.addColorStop(0,`rgba(255,255,255,${alpha*.9})`)
      grad.addColorStop(.3,`rgba(0,220,255,${alpha*.7})`)
      grad.addColorStop(.7,`rgba(0,180,255,${alpha*.3})`)
      grad.addColorStop(1,'rgba(0,0,0,0)')
      ctx.beginPath(); ctx.arc(cx,cy,brad,0,Math.PI*2)
      ctx.fillStyle = grad; ctx.fill()
    }
    if (t>.12 && t<.82) {
      const rt=(t-.12)/.7, rRad=Math.max(ZW,ZH)*.85*rt
      const rAlpha=rt<.3?rt/.3:1-(rt-.3)/.7
      ctx.beginPath(); ctx.arc(cx,cy,rRad,0,Math.PI*2)
      ctx.strokeStyle=`rgba(0,200,255,${rAlpha*.35})`; ctx.lineWidth=12*(1-rt*.6); ctx.stroke()
      ctx.beginPath(); ctx.arc(cx,cy,rRad*.85,0,Math.PI*2)
      ctx.strokeStyle=`rgba(180,240,255,${rAlpha*.6})`; ctx.lineWidth=2; ctx.stroke()
    }
    particles.forEach(p => {
      p.age = Math.min(p.age+.022*p.speed, p.life)
      const pt=p.age/p.life, dist=pt*ZW*.9
      p.x=cx+Math.cos(p.angle)*dist; p.y=cy+Math.sin(p.angle)*dist
      const palpha=pt<.3?pt/.3:1-(pt-.3)/.7, pSize=p.size*(1-pt*.5)
      ctx.beginPath(); ctx.arc(p.x,p.y,pSize,0,Math.PI*2)
      ctx.fillStyle=`rgba(${p.color},${palpha*.85})`
      ctx.shadowBlur=6; ctx.shadowColor=`rgba(${p.color},.8)`; ctx.fill(); ctx.shadowBlur=0
    })
    if (t<.55) {
      const ct=t/.55, calpha=1-ct
      const cGrad=ctx.createRadialGradient(cx,cy,0,cx,cy,ZW*.25)
      cGrad.addColorStop(0,`rgba(255,255,255,${calpha*.95})`)
      cGrad.addColorStop(.4,`rgba(0,220,255,${calpha*.5})`)
      cGrad.addColorStop(1,'rgba(0,0,0,0)')
      ctx.beginPath(); ctx.arc(cx,cy,ZW*.25,0,Math.PI*2); ctx.fillStyle=cGrad; ctx.fill()
    }
    if (t<1) requestAnimationFrame(draw); else cv.remove()
  })(performance.now())
}

// ── Special Summon FX ────────────────────────────────────
export function specialSummonFX(zoneEl, cardType) {
  const ZW=zoneEl.clientWidth||85, ZH=zoneEl.clientHeight||124
  const PAD=90, CW=ZW+PAD*2, CH=ZH+PAD*2, cx=CW/2, cy=CH/2
  const cv=document.createElement('canvas')
  cv.width=CW; cv.height=CH
  cv.style.cssText=`position:absolute;left:${-PAD}px;top:${-PAD}px;width:${CW}px;height:${CH}px;pointer-events:none;z-index:10;mix-blend-mode:screen;`
  zoneEl.appendChild(cv)
  const ctx=cv.getContext('2d')
  const t=cardType.toUpperCase()
  let drawFn

  if (t.includes('FUSION')) {
    drawFn=p=>{
      [0,1,2].forEach(s=>{
        const off=(s/3)*Math.PI*2
        ctx.beginPath()
        for(let a=0;a<Math.PI*6;a+=.08){
          const r=(Math.PI*6-a)/(Math.PI*6)*(Math.max(CW,CH)/2)*(1-p*.8)
          const x=cx+Math.cos(a*2+off+p*8)*r, y=cy+Math.sin(a*2+off+p*8)*r*.6
          a===0?ctx.moveTo(x,y):ctx.lineTo(x,y)
        }
        ctx.strokeStyle=`rgba(180,0,255,${(1-p)*.6})`; ctx.lineWidth=1.5; ctx.stroke()
      })
      if(p>.5){const pt=(p-.5)/.5;const g=ctx.createRadialGradient(cx,cy,0,cx,cy,ZW*.4*pt);g.addColorStop(0,`rgba(255,200,255,${pt*.9})`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,ZW*.4*pt,0,Math.PI*2);ctx.fill()}
    }
  } else if (t.includes('SYNCHRO')) {
    drawFn=p=>{
      [0,.2,.4].forEach((delay,i)=>{
        const pp=Math.max(0,Math.min(1,(p-delay)/(1-delay)))
        const r=pp*Math.max(CW,CH)*.6, a=pp<.5?pp*2:(1-pp)*2
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2)
        ctx.strokeStyle=`rgba(${['255,255,255','200,240,255','150,200,255'][i]},${a*.7})`
        ctx.lineWidth=(3-i)*(1-pp*.7); ctx.stroke()
      })
      if(p<.3){const pt=p/.3;const g=ctx.createRadialGradient(cx,cy,0,cx,cy,ZW*.5);g.addColorStop(0,`rgba(255,255,255,${(1-pt)*.95})`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,ZW*.5,0,Math.PI*2);ctx.fill()}
    }
  } else if (t.includes('XYZ')) {
    const stars=Array.from({length:20},(_,i)=>({angle:(i/20)*Math.PI*2,dist:.3+Math.random()*.5,size:1+Math.random()*2.5}))
    drawFn=p=>{
      const g=ctx.createRadialGradient(cx,cy,0,cx,cy,ZW*.8)
      g.addColorStop(0,`rgba(0,0,0,${(1-p)*.85})`); g.addColorStop(1,'rgba(0,0,0,0)')
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,ZW*.8,0,Math.PI*2); ctx.fill()
      stars.forEach(s=>{
        const a=s.angle+p*6, r=s.dist*ZW*(1-p*.6)
        const x=cx+Math.cos(a)*r, y=cy+Math.sin(a)*r*.5
        const alpha=p<.7?.8:(1-p)/.3*.8
        ctx.beginPath(); ctx.arc(x,y,s.size*(1-p*.5),0,Math.PI*2)
        ctx.fillStyle=`rgba(255,210,0,${alpha})`; ctx.shadowBlur=8; ctx.shadowColor='rgba(255,210,0,.9)'; ctx.fill(); ctx.shadowBlur=0
      })
    }
  } else if (t.includes('LINK')) {
    const nodes=Array.from({length:6},(_,i)=>({x:cx+Math.cos((i/6)*Math.PI*2)*ZW*.45,y:cy+Math.sin((i/6)*Math.PI*2)*ZH*.45}))
    drawFn=p=>{
      nodes.forEach(n=>{
        const pp=Math.min(1,p*2), x2=cx+(n.x-cx)*pp, y2=cy+(n.y-cy)*pp
        const alpha=p>.7?(1-p)/.3:.7
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(x2,y2)
        ctx.strokeStyle=`rgba(0,160,255,${alpha})`; ctx.lineWidth=1.5; ctx.stroke()
        if(pp>.8){ctx.beginPath();ctx.arc(x2,y2,3,0,Math.PI*2);ctx.fillStyle=`rgba(0,220,255,${alpha})`;ctx.shadowBlur=10;ctx.shadowColor='rgba(0,220,255,1)';ctx.fill();ctx.shadowBlur=0}
      })
      const ha=p<.5?p*2:(1-p)*2
      ctx.beginPath()
      for(let i=0;i<6;i++){const a=(i/6)*Math.PI*2-Math.PI/6,r=ZW*.25;i===0?ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r)}
      ctx.closePath(); ctx.strokeStyle=`rgba(0,220,255,${ha*.8})`; ctx.lineWidth=2; ctx.stroke()
    }
  } else {
    // Ritual
    drawFn=p=>{
      for(let i=0;i<12;i++){const a=(i/12)*Math.PI*2+p*.5,len=ZW*.7*(1-p*.4);ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*len,cy+Math.sin(a)*len);ctx.strokeStyle=`rgba(180,200,255,${(1-p)*.55})`;ctx.lineWidth=1;ctx.stroke()}
      const g=ctx.createRadialGradient(cx,cy,0,cx,cy,ZW*.3);g.addColorStop(0,`rgba(200,220,255,${(1-p)*.7})`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,ZW*.3,0,Math.PI*2);ctx.fill()
    }
  }

  const DUR=1100; let start=null
  ;(function draw(ts){
    if(!start)start=ts
    const p=Math.min((ts-start)/DUR,1)
    ctx.clearRect(0,0,CW,CH); drawFn(p)
    if(p<1)requestAnimationFrame(draw); else cv.remove()
  })(performance.now())
}

// ── Spell/Trap Activation FX ─────────────────────────────
export function spellActivationFX(zoneEl, isSpell) {
  const ZW=zoneEl.clientWidth||85, ZH=zoneEl.clientHeight||124
  const PAD=60, CW=ZW+PAD*2, CH=ZH+PAD*2, cx=CW/2, cy=CH/2
  const cv=document.createElement('canvas')
  cv.width=CW; cv.height=CH
  cv.style.cssText=`position:absolute;left:${-PAD}px;top:${-PAD}px;width:${CW}px;height:${CH}px;pointer-events:none;z-index:10;mix-blend-mode:screen;`
  zoneEl.appendChild(cv)
  const ctx=cv.getContext('2d')
  const color=isSpell?'0,220,100':'180,0,220'
  const sides=isSpell?5:3
  const DUR=800; let start=null
  ;(function draw(ts){
    if(!start)start=ts
    const p=Math.min((ts-start)/DUR,1)
    ctx.clearRect(0,0,CW,CH)
    const r=ZW*.42*(1+p*.3), rot=p*Math.PI*(isSpell?1:2)
    const alpha=p<.4?p/.4:(1-p)/.6
    ctx.beginPath()
    for(let i=0;i<sides;i++){const a=(i/sides)*Math.PI*2+rot-Math.PI/2;i===0?ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r)}
    ctx.closePath()
    ctx.strokeStyle=`rgba(${color},${alpha*.85})`; ctx.lineWidth=2; ctx.stroke()
    ctx.fillStyle=`rgba(${color},${alpha*.12})`; ctx.fill()
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,ZW*.5)
    g.addColorStop(0,`rgba(${color},${alpha*.4})`); g.addColorStop(1,'rgba(0,0,0,0)')
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,ZW*.5,0,Math.PI*2); ctx.fill()
    if(p<1)requestAnimationFrame(draw); else cv.remove()
  })(performance.now())
}

// ── Attack FX ────────────────────────────────────────────
export function attackFX(attackerEl, targetEl, onImpact) {
  const aR=attackerEl.getBoundingClientRect(), tR=targetEl.getBoundingClientRect()
  const x1=aR.left+aR.width/2, y1=aR.top+aR.height/2
  const x2=tR.left+tR.width/2, y2=tR.top+tR.height/2
  const cv=document.createElement('canvas')
  cv.width=window.innerWidth; cv.height=window.innerHeight
  cv.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:500;mix-blend-mode:screen;'
  document.body.appendChild(cv)
  const ctx=cv.getContext('2d')
  const DUR=420; let start=null
  ;(function draw(ts){
    if(!start)start=ts
    const p=Math.min((ts-start)/DUR,1)
    ctx.clearRect(0,0,cv.width,cv.height)
    const px=x1+(x2-x1)*p, py=y1+(y2-y1)*p
    const tx=x1+(x2-x1)*Math.max(0,p-.18), ty=y1+(y2-y1)*Math.max(0,p-.18)
    const g=ctx.createLinearGradient(tx,ty,px,py)
    g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(.5,'rgba(0,200,255,.5)'); g.addColorStop(1,'rgba(255,255,255,.95)')
    ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(px,py)
    ctx.strokeStyle=g; ctx.lineWidth=3; ctx.stroke()
    ctx.beginPath(); ctx.arc(px,py,5,0,Math.PI*2)
    ctx.fillStyle='rgba(255,255,255,.95)'; ctx.shadowBlur=16; ctx.shadowColor='rgba(0,200,255,1)'; ctx.fill(); ctx.shadowBlur=0
    if(p<1){requestAnimationFrame(draw)}
    else{
      cv.remove()
      const ic=document.createElement('canvas')
      ic.width=window.innerWidth; ic.height=window.innerHeight
      ic.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:500;mix-blend-mode:screen;'
      document.body.appendChild(ic)
      const ictx=ic.getContext('2d')
      const R=Math.max(tR.width,tR.height)*.9
      let is=null
      ;(function idraw(ts2){
        if(!is)is=ts2
        const ip=Math.min((ts2-is)/500,1), ia=1-ip
        ictx.clearRect(0,0,ic.width,ic.height)
        ictx.beginPath(); ictx.arc(x2,y2,R*ip,0,Math.PI*2)
        ictx.strokeStyle=`rgba(255,200,50,${ia*.8})`; ictx.lineWidth=3*(1-ip)+1; ictx.stroke()
        ictx.beginPath(); ictx.arc(x2,y2,R*ip*.6,0,Math.PI*2)
        ictx.strokeStyle=`rgba(255,255,255,${ia*.5})`; ictx.lineWidth=1.5; ictx.stroke()
        if(ip<.2){const fg=ictx.createRadialGradient(x2,y2,0,x2,y2,R*.4);fg.addColorStop(0,`rgba(255,255,255,${(.2-ip)/.2*.9})`);fg.addColorStop(1,'rgba(0,0,0,0)');ictx.fillStyle=fg;ictx.beginPath();ictx.arc(x2,y2,R*.4,0,Math.PI*2);ictx.fill()}
        if(ip<1)requestAnimationFrame(idraw); else ic.remove()
      })(performance.now())
      if(onImpact) onImpact()
    }
  })(performance.now())
}

// ── LP Damage FX ─────────────────────────────────────────
export function lpDamageFX(amount, barEl, valEl, newLpPct) {
  if (!barEl || !valEl) return
  const rect = valEl.getBoundingClientRect()
  const num  = document.createElement('div')
  num.textContent = '-' + amount
  num.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;color:#ff4466;font-family:'Orbitron',monospace;font-size:.85rem;font-weight:700;pointer-events:none;z-index:600;text-shadow:0 0 12px rgba(255,50,80,.9);`
  document.body.appendChild(num)
  num.animate([
    {opacity:1,transform:'translateY(0) scale(1.2)'},
    {opacity:1,transform:'translateY(-24px) scale(1.4)',offset:.3},
    {opacity:0,transform:'translateY(-48px) scale(.9)'},
  ],{duration:900,easing:'ease-out',fill:'forwards'}).finished.then(()=>num.remove())
  barEl.animate([
    {transform:'translateX(0)'},{transform:'translateX(-4px)'},
    {transform:'translateX(4px)'},{transform:'translateX(-3px)'},{transform:'translateX(0)'},
  ],{duration:300,easing:'ease-out'})
  const fillEl = barEl.querySelector('.lp-fill')
  if (fillEl){fillEl.style.transition='width .6s ease-out'; fillEl.style.width=Math.max(0,newLpPct)+'%'}
}

// ── Phase transition overlay (DOM-based) ─────────────────
export function phaseTransitionFX(phase) {
  const overlay = document.createElement('div')
  overlay.className = 'phase-overlay'
  overlay.innerHTML = `<div class="phase-overlay-name">${phase.label}</div><div class="phase-overlay-sub">PHASE</div>`
  document.body.appendChild(overlay)
  overlay.animate([
    {opacity:0,transform:'translateY(-12px) scale(.96)'},
    {opacity:1,transform:'translateY(0) scale(1)',offset:.2},
    {opacity:1,transform:'translateY(0) scale(1)',offset:.7},
    {opacity:0,transform:'translateY(8px) scale(.98)'},
  ],{duration:900,easing:'ease-in-out',fill:'forwards'}).finished.then(()=>overlay.remove())
}

// ── Phase block toast ────────────────────────────────────
export function showPhaseBlock(anchorEl, msg) {
  document.getElementById('__phaseBlock')?.remove()
  const el = document.createElement('div')
  el.id = '__phaseBlock'
  el.textContent = msg
  el.style.cssText = `position:fixed;pointer-events:none;z-index:9999;font-family:'Orbitron',monospace;font-size:.55rem;letter-spacing:.1em;color:rgba(255,80,80,.9);background:rgba(20,0,0,.85);border:1px solid rgba(255,50,50,.4);border-radius:4px;padding:5px 10px;text-shadow:0 0 8px rgba(255,50,50,.6);`
  document.body.appendChild(el)
  const r = anchorEl.getBoundingClientRect()
  el.style.left = (r.left + r.width/2 - el.offsetWidth/2) + 'px'
  el.style.top  = (r.top - 36) + 'px'
  el.animate([
    {opacity:0,transform:'translateY(4px)'},
    {opacity:1,transform:'translateY(0)',offset:.15},
    {opacity:1,transform:'translateY(0)',offset:.7},
    {opacity:0,transform:'translateY(-6px)'},
  ],{duration:1200,fill:'forwards'}).finished.then(()=>el.remove())
}

// ── Draw card animation (deck → hand) ────────────────────
export function drawCardAnimation(card, deckZoneEl, handEl, onComplete) {
  if (!deckZoneEl || !handEl) { onComplete?.(); return }
  const zR = deckZoneEl.getBoundingClientRect()
  const hR = handEl.getBoundingClientRect()

  const ghost = document.createElement('div')
  ghost.className = 'draw-ghost'
  const rawImg = card?.card_images?.[0]?.image_url ?? ''
  const img    = rawImg ? `https://corsproxy.io/?url=${encodeURIComponent(rawImg)}` : ''
  ghost.innerHTML = img
    ? `<img src="${img}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:5px;">`
    : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a0a3a,#0a0a1a);border-radius:5px;"></div>`
  ghost.style.cssText = `position:fixed;left:${zR.left+zR.width/2-37}px;top:${zR.top}px;width:74px;height:108px;pointer-events:none;z-index:8000;border-radius:5px;border:1px solid rgba(0,200,255,.6);box-shadow:0 0 20px rgba(0,200,255,.5);`
  document.body.appendChild(ghost)

  const destX = hR.left + hR.width*.7 - 37
  const destY = hR.top  + 20
  ghost.animate([
    {transform:'scale(1) rotate(0deg)',opacity:1},
    {transform:'scale(1.15) rotate(-8deg)',opacity:1,offset:.4},
    {transform:`translateX(${destX-(zR.left+zR.width/2-37)}px) translateY(${destY-zR.top}px) scale(.85) rotate(0deg)`,opacity:.8},
  ],{duration:520,easing:'cubic-bezier(.23,1,.32,1)',fill:'forwards'}).finished.then(()=>{
    ghost.remove()
    handEl.animate([{filter:'brightness(1)'},{filter:'brightness(1.6)'},{filter:'brightness(1)'}],{duration:300})
    onComplete?.()
  })
}
