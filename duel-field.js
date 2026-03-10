// ═══════════════════════════════════════════════════════
// duel-field.js — Yu-Gi-Oh! Duel Field POC
// ═══════════════════════════════════════════════════════

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';

env.allowLocalModels = false;
const THREE = window.THREE;

// ── Loading UI ────────────────────────────────────────────
function setLoad(pct, text, log) {
  document.getElementById('loadFill').style.width = pct + '%';
  document.getElementById('loadStatusPct').textContent = pct + '%';
  if (text) document.getElementById('loadStatusText').textContent = text;
  if (log)  document.getElementById('loadLog').textContent = log;
}

// ── Depth model ───────────────────────────────────────────
let depthPipe = null;
const depthCache = new Map();

async function loadDepthModel() {
  setLoad(5, 'Baixando Depth Anything V2...', 'Conectando HuggingFace CDN');
  depthPipe = await pipeline('depth-estimation', 'Xenova/depth-anything-small-hf', {
    progress_callback: (p) => {
      if (p.status === 'downloading') {
        const pct = p.total ? Math.round((p.loaded / p.total) * 60) + 5 : 20;
        setLoad(pct, 'Baixando modelo...', `${Math.round((p.loaded || 0) / 1024 / 1024)}MB / ${Math.round((p.total || 0) / 1024 / 1024)}MB`);
      }
      if (p.status === 'loading') setLoad(68, 'Carregando WASM...', 'Inicializando runtime');
    },
  });
}

/**
 * Load a cross-origin image as a data URL so Transformers.js
 * can process it without CORS issues.
 * Uses corsproxy.io as a relay for remote URLs.
 */
async function imageToDataURL(url) {
  // If it's already a data URL or blob, return as-is
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  // Proxy through corsproxy.io to bypass CORS on image CDNs
  const proxied = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;

  const res = await fetch(proxied);
  if (!res.ok) throw new Error(`Falha ao carregar imagem (${res.status})`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function getDepthMap(id, imageUrl) {
  if (depthCache.has(id)) return depthCache.get(id);

  // Convert to data URL first — avoids CORS issues in Transformers.js
  const dataUrl = await imageToDataURL(imageUrl);

  const result = await depthPipe(dataUrl);
  const { width: w, height: h, data: raw } = result.depth;

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(w, h);

  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] < mn) mn = raw[i];
    if (raw[i] > mx) mx = raw[i];
  }
  const rng = mx - mn || 1;
  for (let i = 0; i < raw.length; i++) {
    const v = Math.round(((raw[i] - mn) / rng) * 255);
    imgData.data[i * 4] = imgData.data[i * 4 + 1] = imgData.data[i * 4 + 2] = v;
    imgData.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  depthCache.set(id, canvas);
  return canvas;
}

// ── Three.js parallax shader ──────────────────────────────
function mountParallax(zoneEl, colorDataUrl, depthCanvas) {
  const W = zoneEl.clientWidth;
  const H = zoneEl.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.domElement.style.cssText = 'position:absolute;inset:0;';

  const wrap = document.createElement('div');
  wrap.className = 'zone-canvas-wrap';
  wrap.appendChild(renderer.domElement);
  zoneEl.appendChild(wrap);

  const scene  = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-.5, .5, .5, -.5, .1, 10);
  camera.position.z = 1;

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor:     { value: new THREE.TextureLoader().load(colorDataUrl) },
      uDepth:     { value: new THREE.CanvasTexture(depthCanvas) },
      uMouse:     { value: new THREE.Vector2(0, 0) },
      uIntensity: { value: 18.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
    `,
    fragmentShader: `
      uniform sampler2D uColor, uDepth;
      uniform vec2 uMouse;
      uniform float uIntensity;
      varying vec2 vUv;
      void main(){
        float d = texture2D(uDepth, vUv).r;
        vec2 uv = clamp(vUv - uMouse * d * uIntensity * .01, .001, .999);
        gl_FragColor = texture2D(uColor, uv);
      }
    `,
  });

  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat));

  const state = { t: { x:0, y:0 }, c: { x:0, y:0 }, u: mat.uniforms.uMouse };

  zoneEl.addEventListener('mousemove', e => {
    const r = zoneEl.getBoundingClientRect();
    state.t.x =  ((e.clientX - r.left) / r.width  - .5) * 2;
    state.t.y = -((e.clientY - r.top)  / r.height - .5) * 2;
  });
  zoneEl.addEventListener('mouseleave', () => { state.t.x = 0; state.t.y = 0; });

  (function loop() {
    requestAnimationFrame(loop);
    state.c.x += (state.t.x - state.c.x) * .1;
    state.c.y += (state.t.y - state.c.y) * .1;
    state.u.value.set(state.c.x, state.c.y);
    renderer.render(scene, camera);
  })();
}

// ── Dominant color extractor ─────────────────────────────
// Samples a grid of pixels, skips near-black/near-white, returns [r,g,b]
function dominantColor(px, W, H) {
  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  const step = Math.max(1, Math.floor(W / 20));
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const i = (y * W + x) * 4;
      const r = px[i], g = px[i+1], b = px[i+2];
      const brightness = (r + g + b) / 3;
      if (brightness < 25 || brightness > 230) continue; // skip black/white
      rSum += r; gSum += g; bSum += b; count++;
    }
  }
  if (!count) return [0, 200, 255]; // fallback cyan
  // boost saturation: push away from grey
  let r = rSum/count, g = gSum/count, b = bSum/count;
  const avg = (r + g + b) / 3;
  const sat = 2.2;
  r = Math.min(255, Math.max(0, avg + (r - avg) * sat));
  g = Math.min(255, Math.max(0, avg + (g - avg) * sat));
  b = Math.min(255, Math.max(0, avg + (b - avg) * sat));
  return [Math.round(r), Math.round(g), Math.round(b)];
}

// ── Sobel Edge Glow ───────────────────────────────────────
// Edges glow with the dominant color of the card art
async function sobelEdgeGlow(zoneEl, dataUrl) {
  const W = zoneEl.clientWidth;
  const H = zoneEl.clientHeight;

  const src = document.createElement('canvas');
  src.width = W; src.height = H;
  const sCtx = src.getContext('2d');
  await new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => { sCtx.drawImage(im, 0, 0, W, H); res(); };
    im.onerror = rej;
    im.src = dataUrl;
  });

  const { data: px } = sCtx.getImageData(0, 0, W, H);

  // extract dominant color BEFORE Sobel
  const [dr, dg, db] = dominantColor(px, W, H);

  // Sobel kernel
  const edge = new Float32Array(W * H);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const luma = (r, g, b) => 0.299*r + 0.587*g + 0.114*b;
      const p = (dx, dy) => {
        const i = ((y + dy) * W + (x + dx)) * 4;
        return luma(px[i], px[i+1], px[i+2]);
      };
      const gx = -p(-1,-1) - 2*p(-1,0) - p(-1,1) + p(1,-1) + 2*p(1,0) + p(1,1);
      const gy = -p(-1,-1) - 2*p(0,-1) - p(1,-1) + p(-1,1) + 2*p(0,1) + p(1,1);
      edge[y * W + x] = Math.min(255, Math.sqrt(gx*gx + gy*gy));
    }
  }

  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = W; glowCanvas.height = H;
  glowCanvas.style.cssText = `
    position:absolute; inset:0; z-index:5; pointer-events:none;
    mix-blend-mode:screen; border-radius:5px;
  `;
  const gCtx = glowCanvas.getContext('2d');
  const out  = gCtx.createImageData(W, H);

  for (let i = 0; i < W * H; i++) {
    const v = edge[i];
    if (v < 18) continue;
    const t = v / 255;
    out.data[i*4+0] = Math.round(dr * t);
    out.data[i*4+1] = Math.round(dg * t);
    out.data[i*4+2] = Math.round(db * t);
    out.data[i*4+3] = Math.round(t * 255);
  }
  gCtx.putImageData(out, 0, 0);

  gCtx.filter = 'blur(2px)';
  gCtx.drawImage(glowCanvas, 0, 0);
  gCtx.filter = 'none';

  zoneEl.appendChild(glowCanvas);

  glowCanvas.animate([
    { opacity: 0,    filter: 'blur(6px)'  },
    { opacity: 1,    filter: 'blur(2px)',  offset: 0.15 },
    { opacity: 0.85, filter: 'blur(2px)',  offset: 0.6  },
    { opacity: 0,    filter: 'blur(8px)'  },
  ], { duration: 2400, easing: 'ease-in-out', fill: 'forwards' })
    .finished.then(() => glowCanvas.remove());
}


// ── Normal Summon FX ─────────────────────────────────────
// Canvas procedural: burst de luz + anel expansivo + partículas
function normalSummonFX(zoneEl) {
  const ZW = zoneEl.clientWidth;
  const ZH = zoneEl.clientHeight;

  // canvas maior que a zona para o efeito vazar pelas bordas
  const PAD = 80;
  const CW  = ZW + PAD * 2;
  const CH  = ZH + PAD * 2;
  const cx  = CW / 2;
  const cy  = CH / 2;

  const cv  = document.createElement('canvas');
  cv.width  = CW;
  cv.height = CH;
  cv.style.cssText = `
    position:absolute;
    left:${-PAD}px; top:${-PAD}px;
    width:${CW}px; height:${CH}px;
    pointer-events:none; z-index:10;
    mix-blend-mode:screen;
  `;
  zoneEl.appendChild(cv);
  const ctx = cv.getContext('2d');

  // ── partículas ──
  const PARTICLE_COUNT = 28;
  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle  = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.3;
    const speed  = 1.8 + Math.random() * 2.2;
    const size   = 1.5 + Math.random() * 2.5;
    const life   = 0.6 + Math.random() * 0.4;
    // alternate cyan and gold
    const color  = i % 3 === 0
      ? `255,200,50`   // gold
      : i % 3 === 1
        ? `0,220,255`  // cyan
        : `180,255,180`; // pale green
    return { angle, speed, size, life, color, x: cx, y: cy, age: 0 };
  });

  // ── timeline state ──
  const DURATION = 900; // ms total
  let start = null;

  function draw(ts) {
    if (!start) start = ts;
    const t  = Math.min((ts - start) / DURATION, 1); // 0 → 1
    const t2 = t * t;

    ctx.clearRect(0, 0, CW, CH);

    // ─ 1. Burst de luz radial (primeiros 30% do tempo) ─
    if (t < 0.35) {
      const bt   = t / 0.35;               // 0→1 dentro do burst
      const brad = (ZW * 0.6) * bt;
      const alpha = bt < 0.5
        ? bt * 2                            // fade in
        : 1 - (bt - 0.5) * 2;              // fade out

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, brad);
      grad.addColorStop(0,   `rgba(255,255,255,${alpha * 0.9})`);
      grad.addColorStop(0.3, `rgba(0,220,255,${alpha * 0.7})`);
      grad.addColorStop(0.7, `rgba(0,180,255,${alpha * 0.3})`);
      grad.addColorStop(1,   `rgba(0,0,0,0)`);

      ctx.beginPath();
      ctx.arc(cx, cy, brad, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // ─ 2. Anel expansivo (começa em 15%, termina em 80%) ─
    if (t > 0.12 && t < 0.82) {
      const rt    = (t - 0.12) / 0.7;     // 0→1
      const rRad  = (Math.max(ZW, ZH) * 0.85) * rt;
      const rAlpha = rt < 0.3
        ? rt / 0.3
        : 1 - (rt - 0.3) / 0.7;

      // anel externo — difuso
      ctx.beginPath();
      ctx.arc(cx, cy, rRad, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,200,255,${rAlpha * 0.35})`;
      ctx.lineWidth   = 12 * (1 - rt * 0.6);
      ctx.stroke();

      // anel interno — nítido
      ctx.beginPath();
      ctx.arc(cx, cy, rRad * 0.85, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(180,240,255,${rAlpha * 0.6})`;
      ctx.lineWidth   = 2;
      ctx.stroke();
    }

    // ─ 3. Partículas ─
    particles.forEach(p => {
      p.age = Math.min(p.age + 0.022 * p.speed, p.life);
      const pt    = p.age / p.life;
      const dist  = pt * (ZW * 0.9);
      p.x = cx + Math.cos(p.angle) * dist;
      p.y = cy + Math.sin(p.angle) * dist;
      const palpha = pt < 0.3 ? pt / 0.3 : 1 - (pt - 0.3) / 0.7;
      const pSize  = p.size * (1 - pt * 0.5);

      ctx.beginPath();
      ctx.arc(p.x, p.y, pSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${palpha * 0.85})`;
      ctx.shadowBlur   = 6;
      ctx.shadowColor  = `rgba(${p.color},0.8)`;
      ctx.fill();
      ctx.shadowBlur   = 0;
    });

    // ─ 4. Brilho central persistente (primeiros 50%) ─
    if (t < 0.55) {
      const ct   = t / 0.55;
      const calpha = 1 - ct;
      const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ZW * 0.25);
      cGrad.addColorStop(0,   `rgba(255,255,255,${calpha * 0.95})`);
      cGrad.addColorStop(0.4, `rgba(0,220,255,${calpha * 0.5})`);
      cGrad.addColorStop(1,   `rgba(0,0,0,0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, ZW * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = cGrad;
      ctx.fill();
    }

    if (t < 1) {
      requestAnimationFrame(draw);
    } else {
      cv.remove();
    }
  }

  requestAnimationFrame(draw);
}

// ── Special Summon FX ────────────────────────────────────
function specialSummonFX(zoneEl, cardType) {
  const ZW = zoneEl.clientWidth, ZH = zoneEl.clientHeight;
  const PAD = 90, CW = ZW+PAD*2, CH = ZH+PAD*2;
  const cx = CW/2, cy = CH/2;

  const cv = document.createElement('canvas');
  cv.width=CW; cv.height=CH;
  cv.style.cssText=`position:absolute;left:${-PAD}px;top:${-PAD}px;
    width:${CW}px;height:${CH}px;pointer-events:none;z-index:10;mix-blend-mode:screen;`;
  zoneEl.appendChild(cv);
  const ctx = cv.getContext('2d');
  const t = cardType.toUpperCase();
  let drawFn;

  if (t.includes('FUSION')) {
    drawFn = p => {
      [0,1,2].forEach(s => {
        const off = (s/3)*Math.PI*2;
        ctx.beginPath();
        for(let a=0;a<Math.PI*6;a+=0.08){
          const r=(Math.PI*6-a)/(Math.PI*6)*(Math.max(CW,CH)/2)*(1-p*0.8);
          const x=cx+Math.cos(a*2+off+p*8)*r, y=cy+Math.sin(a*2+off+p*8)*r*0.6;
          a===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
        }
        ctx.strokeStyle=`rgba(180,0,255,${(1-p)*0.6})`; ctx.lineWidth=1.5; ctx.stroke();
      });
      if(p>0.5){
        const pt=(p-0.5)/0.5;
        const g=ctx.createRadialGradient(cx,cy,0,cx,cy,ZW*0.4*pt);
        g.addColorStop(0,`rgba(255,200,255,${pt*0.9})`); g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,ZW*0.4*pt,0,Math.PI*2); ctx.fill();
      }
    };
  } else if (t.includes('SYNCHRO')) {
    drawFn = p => {
      [0,0.2,0.4].forEach((delay,i) => {
        const pp=Math.max(0,Math.min(1,(p-delay)/(1-delay)));
        const r=pp*Math.max(CW,CH)*0.6;
        const a=pp<0.5?pp*2:(1-pp)*2;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
        ctx.strokeStyle=`rgba(${['255,255,255','200,240,255','150,200,255'][i]},${a*0.7})`;
        ctx.lineWidth=(3-i)*(1-pp*0.7); ctx.stroke();
      });
      if(p<0.3){
        const pt=p/0.3;
        const g=ctx.createRadialGradient(cx,cy,0,cx,cy,ZW*0.5);
        g.addColorStop(0,`rgba(255,255,255,${(1-pt)*0.95})`); g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,ZW*0.5,0,Math.PI*2); ctx.fill();
      }
    };
  } else if (t.includes('XYZ')) {
    const stars=Array.from({length:20},(_,i)=>({angle:(i/20)*Math.PI*2,dist:.3+Math.random()*.5,size:1+Math.random()*2.5}));
    drawFn = p => {
      const g=ctx.createRadialGradient(cx,cy,0,cx,cy,ZW*0.8);
      g.addColorStop(0,`rgba(0,0,0,${(1-p)*0.85})`); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,ZW*0.8,0,Math.PI*2); ctx.fill();
      stars.forEach(s=>{
        const a=s.angle+p*6, r=s.dist*ZW*(1-p*0.6);
        const x=cx+Math.cos(a)*r, y=cy+Math.sin(a)*r*0.5;
        const alpha=p<0.7?.8:(1-p)/.3*.8;
        ctx.beginPath(); ctx.arc(x,y,s.size*(1-p*.5),0,Math.PI*2);
        ctx.fillStyle=`rgba(255,210,0,${alpha})`;
        ctx.shadowBlur=8; ctx.shadowColor='rgba(255,210,0,0.9)'; ctx.fill(); ctx.shadowBlur=0;
      });
    };
  } else if (t.includes('LINK')) {
    const nodes=Array.from({length:6},(_,i)=>({
      x:cx+Math.cos((i/6)*Math.PI*2)*ZW*.45,
      y:cy+Math.sin((i/6)*Math.PI*2)*ZH*.45,
    }));
    drawFn = p => {
      nodes.forEach(n=>{
        const pp=Math.min(1,p*2);
        const x2=cx+(n.x-cx)*pp, y2=cy+(n.y-cy)*pp;
        const alpha=p>.7?(1-p)/.3:.7;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(x2,y2);
        ctx.strokeStyle=`rgba(0,160,255,${alpha})`; ctx.lineWidth=1.5; ctx.stroke();
        if(pp>.8){
          ctx.beginPath(); ctx.arc(x2,y2,3,0,Math.PI*2);
          ctx.fillStyle=`rgba(0,220,255,${alpha})`;
          ctx.shadowBlur=10; ctx.shadowColor='rgba(0,220,255,1)'; ctx.fill(); ctx.shadowBlur=0;
        }
      });
      const ha=p<.5?p*2:(1-p)*2;
      ctx.beginPath();
      for(let i=0;i<6;i++){const a=(i/6)*Math.PI*2-Math.PI/6,r=ZW*.25;i===0?ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}
      ctx.closePath(); ctx.strokeStyle=`rgba(0,220,255,${ha*.8})`; ctx.lineWidth=2; ctx.stroke();
    };
  } else {
    // Ritual
    drawFn = p => {
      for(let i=0;i<12;i++){
        const a=(i/12)*Math.PI*2+p*.5, len=ZW*.7*(1-p*.4);
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*len,cy+Math.sin(a)*len);
        ctx.strokeStyle=`rgba(180,200,255,${(1-p)*.55})`; ctx.lineWidth=1; ctx.stroke();
      }
      const g=ctx.createRadialGradient(cx,cy,0,cx,cy,ZW*.3);
      g.addColorStop(0,`rgba(200,220,255,${(1-p)*.7})`); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,ZW*.3,0,Math.PI*2); ctx.fill();
    };
  }

  const DUR=1100; let start=null;
  (function draw(ts){
    if(!start)start=ts;
    const p=Math.min((ts-start)/DUR,1);
    ctx.clearRect(0,0,CW,CH); drawFn(p);
    if(p<1)requestAnimationFrame(draw); else cv.remove();
  })(performance.now());
}

// ── Spell / Trap Activation FX ───────────────────────────
function spellActivationFX(zoneEl, isSpell) {
  const ZW=zoneEl.clientWidth, ZH=zoneEl.clientHeight;
  const PAD=60, CW=ZW+PAD*2, CH=ZH+PAD*2, cx=CW/2, cy=CH/2;
  const cv=document.createElement('canvas');
  cv.width=CW; cv.height=CH;
  cv.style.cssText=`position:absolute;left:${-PAD}px;top:${-PAD}px;
    width:${CW}px;height:${CH}px;pointer-events:none;z-index:10;mix-blend-mode:screen;`;
  zoneEl.appendChild(cv);
  const ctx=cv.getContext('2d');
  const color=isSpell?'0,220,100':'180,0,220';
  const sides=isSpell?5:3;
  const DUR=800; let start=null;
  (function draw(ts){
    if(!start)start=ts;
    const p=Math.min((ts-start)/DUR,1);
    ctx.clearRect(0,0,CW,CH);
    const r=ZW*.42*(1+p*.3);
    const rot=p*Math.PI*(isSpell?1:2);
    const alpha=p<.4?p/.4:(1-p)/.6;
    ctx.beginPath();
    for(let i=0;i<sides;i++){const a=(i/sides)*Math.PI*2+rot-Math.PI/2;i===0?ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}
    ctx.closePath();
    ctx.strokeStyle=`rgba(${color},${alpha*.85})`; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle=`rgba(${color},${alpha*.12})`; ctx.fill();
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,ZW*.5);
    g.addColorStop(0,`rgba(${color},${alpha*.4})`); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,ZW*.5,0,Math.PI*2); ctx.fill();
    if(p<1)requestAnimationFrame(draw); else cv.remove();
  })(performance.now());
}

// ── Attack FX ────────────────────────────────────────────
function attackFX(attackerEl, targetEl, onImpact) {
  const aR=attackerEl.getBoundingClientRect(), tR=targetEl.getBoundingClientRect();
  const x1=aR.left+aR.width/2, y1=aR.top+aR.height/2;
  const x2=tR.left+tR.width/2, y2=tR.top+tR.height/2;
  const cv=document.createElement('canvas');
  cv.width=window.innerWidth; cv.height=window.innerHeight;
  cv.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:500;mix-blend-mode:screen;';
  document.body.appendChild(cv);
  const ctx=cv.getContext('2d');
  const DUR=420; let start=null;
  (function draw(ts){
    if(!start)start=ts;
    const p=Math.min((ts-start)/DUR,1);
    ctx.clearRect(0,0,cv.width,cv.height);
    const px=x1+(x2-x1)*p, py=y1+(y2-y1)*p;
    const tx=x1+(x2-x1)*Math.max(0,p-.18), ty=y1+(y2-y1)*Math.max(0,p-.18);
    const g=ctx.createLinearGradient(tx,ty,px,py);
    g.addColorStop(0,'rgba(255,255,255,0)');
    g.addColorStop(.5,'rgba(0,200,255,.5)');
    g.addColorStop(1,'rgba(255,255,255,.95)');
    ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(px,py);
    ctx.strokeStyle=g; ctx.lineWidth=3; ctx.stroke();
    ctx.beginPath(); ctx.arc(px,py,5,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,.95)';
    ctx.shadowBlur=16; ctx.shadowColor='rgba(0,200,255,1)'; ctx.fill(); ctx.shadowBlur=0;
    if(p<1){requestAnimationFrame(draw);}
    else{
      cv.remove();
      // impact shockwave
      const ic=document.createElement('canvas');
      ic.width=window.innerWidth; ic.height=window.innerHeight;
      ic.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:500;mix-blend-mode:screen;';
      document.body.appendChild(ic);
      const ictx=ic.getContext('2d');
      const R=Math.max(tR.width,tR.height)*.9;
      let is=null;
      (function idraw(ts2){
        if(!is)is=ts2;
        const ip=Math.min((ts2-is)/500,1);
        ictx.clearRect(0,0,ic.width,ic.height);
        const ia=1-ip;
        ictx.beginPath(); ictx.arc(x2,y2,R*ip,0,Math.PI*2);
        ictx.strokeStyle=`rgba(255,200,50,${ia*.8})`; ictx.lineWidth=3*(1-ip)+1; ictx.stroke();
        ictx.beginPath(); ictx.arc(x2,y2,R*ip*.6,0,Math.PI*2);
        ictx.strokeStyle=`rgba(255,255,255,${ia*.5})`; ictx.lineWidth=1.5; ictx.stroke();
        if(ip<.2){
          const fg=ictx.createRadialGradient(x2,y2,0,x2,y2,R*.4);
          fg.addColorStop(0,`rgba(255,255,255,${(.2-ip)/.2*.9})`); fg.addColorStop(1,'rgba(0,0,0,0)');
          ictx.fillStyle=fg; ictx.beginPath(); ictx.arc(x2,y2,R*.4,0,Math.PI*2); ictx.fill();
        }
        if(ip<1)requestAnimationFrame(idraw); else ic.remove();
      })(performance.now());
      if(onImpact) onImpact();
    }
  })(performance.now());
}

// ── LP Damage FX ─────────────────────────────────────────
function lpDamageFX(amount, barId, valId, newLpPct) {
  const barEl=document.getElementById(barId);
  const valEl=document.getElementById(valId);
  if(!barEl||!valEl) return;
  const rect=valEl.getBoundingClientRect();
  const num=document.createElement('div');
  num.textContent='-'+amount;
  num.style.cssText=`position:fixed;left:${rect.left}px;top:${rect.top}px;
    color:#ff4466;font-family:'Orbitron',monospace;font-size:.85rem;font-weight:700;
    pointer-events:none;z-index:600;text-shadow:0 0 12px rgba(255,50,80,.9);`;
  document.body.appendChild(num);
  num.animate([
    {opacity:1,transform:'translateY(0) scale(1.2)'},
    {opacity:1,transform:'translateY(-24px) scale(1.4)',offset:.3},
    {opacity:0,transform:'translateY(-48px) scale(.9)'},
  ],{duration:900,easing:'ease-out',fill:'forwards'}).finished.then(()=>num.remove());
  barEl.animate([
    {transform:'translateX(0)'},{transform:'translateX(-4px)'},
    {transform:'translateX(4px)'},{transform:'translateX(-3px)'},
    {transform:'translateX(0)'},
  ],{duration:300,easing:'ease-out'});
  const fillEl=barEl.querySelector('.lp-fill');
  if(fillEl){fillEl.style.transition='width .6s ease-out'; fillEl.style.width=Math.max(0,newLpPct)+'%';}
}

async function summonToField(wrapEl, card, zoneEl) {
  zoneEl.classList.add('occupied');
  const lbl = zoneEl.querySelector('.zone-label');
  if (lbl) lbl.style.display = 'none';

  wrapEl.style.transition = 'opacity .2s, transform .2s';
  wrapEl.style.opacity = '0';
  setTimeout(() => wrapEl.remove(), 220);

  zoneEl.classList.add('flash');
  setTimeout(() => zoneEl.classList.remove('flash'), 600);

  try {
    let imageUrl = card.url;
    if (!imageUrl) {
      const c=document.createElement('canvas'); c.width=200; c.height=290;
      const ctx=c.getContext('2d');
      const g=ctx.createLinearGradient(0,0,0,290);
      g.addColorStop(0,'#1a0a3a'); g.addColorStop(1,'#0a0a1a');
      ctx.fillStyle=g; ctx.fillRect(0,0,200,290);
      ctx.font='80px serif'; ctx.textAlign='center'; ctx.fillText('🃏',100,170);
      imageUrl=c.toDataURL();
    }

    const dataUrl = await imageToDataURL(imageUrl);

    const imgEl = document.createElement('img');
    imgEl.src = dataUrl;
    imgEl.style.cssText=`position:absolute;inset:0;width:100%;height:100%;
      object-fit:cover;object-position:top center;border-radius:4px;z-index:1;`;
    zoneEl.appendChild(imgEl);

    zoneEl.classList.add('card-landing');
    setTimeout(() => zoneEl.classList.remove('card-landing'), 500);

    // ── Pick summon FX based on card type ──
    const fullType = (card.type || '').toUpperCase();
    const isSpell  = fullType.includes('SPELL');
    const isTrap   = fullType.includes('TRAP');
    const isExtra  = ['FUSION','SYNCHRO','XYZ','LINK','RITUAL']
                       .some(k => fullType.includes(k));

    if (isSpell || isTrap) {
      spellActivationFX(zoneEl, isSpell);
    } else if (isExtra) {
      specialSummonFX(zoneEl, card.type);
    } else {
      normalSummonFX(zoneEl);
    }

    // Sobel edge glow after summon FX
    setTimeout(() => requestAnimationFrame(() => sobelEdgeGlow(zoneEl, dataUrl)), 1000);

    // ── Registra carta no painel contextual ──
    if (window.__panelRegisterCard) {
      window.__panelRegisterCard(zoneEl, {
        id:         card.id,
        name:       card.name      ?? 'Desconhecida',
        type:       card.type      ?? '',
        attribute:  card.attribute ?? '',
        level:      card.level,
        rank:       card.rank,
        linkval:    card.linkval,
        atk:        card.atk,
        def:        card.def,
        desc:       card.desc      ?? '',
        imageUrl:   dataUrl,
        controller: 'Você',
        position:   'Attack Position',
        faceDown:   false,
      });
    }

    // ── Attack click: click occupied monster zone to attack an opponent zone ──
    if (!isSpell && !isTrap) {
      zoneEl.addEventListener('click', () => {
        if (zoneEl.dataset.attacking) return;
        const opponentZones = document.querySelectorAll(
          '.field-side--opponent .zone--monster, .field-side--opponent .zone--spell'
        );
        // highlight targets
        opponentZones.forEach(z => z.classList.add('attack-target'));
        zoneEl.dataset.attacking = '1';
        document.getElementById('instruction').textContent =
          'CLIQUE EM UMA ZONA DO OPONENTE PARA ATACAR';

        const onTarget = e => {
          const target = e.target.closest(
            '.field-side--opponent .zone--monster, .field-side--opponent .zone--spell'
          );
          if (!target) { cancelAttack(); return; }
          opponentZones.forEach(z => z.classList.remove('attack-target'));
          document.removeEventListener('click', onTarget);
          delete zoneEl.dataset.attacking;
          attackFX(zoneEl, target, () => {
            // trigger LP damage on opponent after impact
            const dmg = 800 + Math.floor(Math.random()*1200);
            lpDamageFX(dmg, 'opponentLpBar', 'opponentLpVal', 45);
            document.getElementById('instruction').textContent = `DANO: ${dmg} LP`;
          });
        };

        const cancelAttack = () => {
          opponentZones.forEach(z=>z.classList.remove('attack-target'));
          document.removeEventListener('click', onTarget);
          delete zoneEl.dataset.attacking;
        };

        setTimeout(() => document.addEventListener('click', onTarget), 50);
      }, { once: false });
    }

    document.getElementById('instruction').textContent =
      isSpell || isTrap ? 'CARTA ATIVADA' : 'CLIQUE NA CARTA NO CAMPO PARA ATACAR';

  } catch (err) {
    console.error(err);
  }
}

// ══════════════════════════════════════════════════════════
// HAND STATE
// ══════════════════════════════════════════════════════════
const HandState = {
  hovered:  null,  // index
  selected: null,  // index
  wraps:    [],    // DOM refs
  cards:    [],    // card data
};

const ANGLES  = [-18, -12, -6,  0,  6,  12, 18];
const OFFSETS = [ 38,  18,  6,  0,  6,  18, 38];
const SPREAD  = 34;

function cardType(t = '') {
  const u = t.toUpperCase();
  if (u.includes('SPELL')) return 'SPELL';
  if (u.includes('TRAP'))  return 'TRAP';
  return 'MONSTER';
}

// condição resumida para tooltip
function cardCondition(card) {
  const t = (card.type || '').toUpperCase();
  if (t.includes('SPELL'))         return 'Ativar: coloque na Spell Zone';
  if (t.includes('TRAP'))          return 'Set face-down, ative no turno seguinte';
  if (t.includes('FUSION'))        return 'Invocação de Fusão necessária';
  if (t.includes('SYNCHRO'))       return 'Sincronize: Tuner + não-Tuner';
  if (t.includes('XYZ'))           return 'Sobreponha monstros do mesmo nível';
  if (t.includes('LINK'))          return 'Invocação de Link necessária';
  if (t.includes('RITUAL'))        return 'Ritual Spell + tributo necessário';
  if (card.atk !== undefined) {
    const lvl = card.level ? `Nível ${card.level} · ` : '';
    return `${lvl}Normal/Tribute Summon · ATK ${card.atk ?? '?'}`;
  }
  return '';
}

// aplica estados visuais a todas as cartas
function applyHandStates() {
  const { hovered, selected, wraps } = HandState;
  const focus = hovered ?? selected;

  wraps.forEach((w, i) => {
    const a  = ANGLES[i];
    const oy = OFFSETS[i];
    const ox = (i - 3) * SPREAD;

    w.classList.remove('card-wrap--hovered', 'card-wrap--selected', 'card-wrap--dimmed');

    if (focus === null) {
      // estado normal — leque limpo
      w.style.transform = `rotate(${a}deg) translateY(${oy}px)`;
      w.style.zIndex = '';
      return;
    }

    if (i === focus) {
      w.classList.add(hovered !== null ? 'card-wrap--hovered' : 'card-wrap--selected');
      // levanta mais e centraliza parcialmente
      const liftY  = oy - 72;
      // compressão horizontal: puxa a carta em foco para o centro
      const pullX  = ox * 0.35;
      w.style.transform = `translateX(${pullX - ox}px) rotate(${a * 0.4}deg) translateY(${liftY}px) scale(1.18)`;
      w.style.zIndex = '200';
    } else {
      // cartas vizinhas se afastam da carta em foco
      const dist  = i - focus;
      const pushX = dist * 10;
      w.classList.add('card-wrap--dimmed');
      w.style.transform = `translateX(${pushX}px) rotate(${a}deg) translateY(${oy}px)`;
      w.style.zIndex = '';
    }
  });
}

// tooltip flutuante acima da carta
function showTooltip(wrapEl, card) {
  removeTooltip();
  const cond = cardCondition(card);
  const t = cardType(card.type || '');
  const tip = document.createElement('div');
  tip.className = `hand-tooltip hand-tooltip--${t.toLowerCase()}`;
  tip.id = 'handTooltip';
  tip.innerHTML = `
    <div class="ht-name">${card.name ?? '—'}</div>
    <div class="ht-type">${card.type ?? ''}</div>
    ${cond ? `<div class="ht-cond">${cond}</div>` : ''}
  `;
  document.body.appendChild(tip);

  // posiciona acima da carta
  const rect = wrapEl.getBoundingClientRect();
  tip.style.left = (rect.left + rect.width / 2) + 'px';
  tip.style.top  = (rect.top - 12) + 'px';
}

function removeTooltip() {
  document.getElementById('handTooltip')?.remove();
}

// destaca zonas válidas (hover ou seleção)
function highlightValidZones(type, active) {
  const sel = type === 'SPELL' || type === 'TRAP'
    ? '#playerSpellZones .zone--spell'
    : '#playerZones .zone--monster';
  document.querySelectorAll('.zone').forEach(z => {
    z.classList.remove('drop-target', 'zone--invalid');
  });
  if (active) {
    document.querySelectorAll(sel).forEach(z => {
      if (!z.classList.contains('occupied')) z.classList.add('drop-target');
    });
    // zonas inválidas ficam discretamente apagadas
    const invSel = type === 'SPELL' || type === 'TRAP'
      ? '#playerZones .zone--monster'
      : '#playerSpellZones .zone--spell';
    document.querySelectorAll(invSel).forEach(z => {
      if (!z.classList.contains('occupied')) z.classList.add('zone--invalid');
    });
  }
}

function buildHand(cards) {
  const hand = document.getElementById('hand');
  hand.innerHTML = '';
  HandState.wraps  = [];
  HandState.cards  = [];
  HandState.hovered = null;
  HandState.selected = null;

  cards.slice(0, 7).forEach((c, i) => {
    const a      = ANGLES[i];
    const oy     = OFFSETS[i];
    const ox     = (i - 3) * SPREAD;
    const t      = cardType(c.type || 'MONSTER');
    const rawImg = c.card_images?.[0]?.image_url ?? c.url ?? '';
    const img    = rawImg ? `https://corsproxy.io/?url=${encodeURIComponent(rawImg)}` : '';
    const fan    = `rotate(${a}deg) translateY(${oy}px)`;

    const wrap = document.createElement('div');
    wrap.className = 'card-wrap';
    wrap.dataset.t = t;
    wrap.dataset.i = i;
    wrap.style.cssText = `--i:${i}; --fan:${fan}; left:calc(50% - 74px + ${ox}px);`;

    wrap.innerHTML = `
      <div class="card">
        <div class="art">
          ${img ? `<img src="${img}" alt="" loading="lazy" crossorigin="anonymous">` : ''}
          <div class="sparkles"></div>
        </div>
      </div>`;

    const card = wrap.querySelector('.card');
    let raf;

    // ── Holo / tilt ──
    wrap.addEventListener('pointermove', e => {
      if (wrap.classList.contains('is-dragging')) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r  = card.getBoundingClientRect();
        const x  = e.clientX - r.left;
        const y  = e.clientY - r.top;
        const rx = ((y - r.height / 2) / (r.height / 2)) * -14;
        const ry = ((x - r.width  / 2) / (r.width  / 2)) *  14;
        wrap.style.setProperty('--rx', rx + 'deg');
        wrap.style.setProperty('--ry', ry + 'deg');
        wrap.style.setProperty('--mx', (x / r.width  * 100) + '%');
        wrap.style.setProperty('--my', (y / r.height * 100) + '%');
        wrap.style.setProperty('--o',  '1');
      });
    });

    // ── Hover enter ──
    wrap.addEventListener('pointerenter', () => {
      if (wrap.classList.contains('is-dragging')) return;
      HandState.hovered = i;
      applyHandStates();
      showTooltip(wrap, HandState.cards[i]);
      highlightValidZones(t, true);
    });

    // ── Hover leave ──
    wrap.addEventListener('pointerleave', () => {
      cancelAnimationFrame(raf);
      wrap.style.setProperty('--rx', '0deg');
      wrap.style.setProperty('--ry', '0deg');
      wrap.style.setProperty('--mx', '50%');
      wrap.style.setProperty('--my', '50%');
      wrap.style.setProperty('--o',  '0');
      if (wrap.classList.contains('is-dragging')) return;
      HandState.hovered = null;
      applyHandStates();
      removeTooltip();
      // mantém highlight se houver seleção ativa
      if (HandState.selected === null) highlightValidZones(t, false);
    });

    // ── Click = selecionar ──
    wrap.addEventListener('click', e => {
      if (wrap.classList.contains('is-dragging')) return;
      e.stopPropagation();
      if (HandState.selected === i) {
        // deseleciona
        HandState.selected = null;
        highlightValidZones(t, false);
      } else {
        HandState.selected = i;
        highlightValidZones(t, true);
      }
      applyHandStates();
    });

    // ── Drag & Drop ──
    setupDrag(wrap, {
      id: c.id ?? i, url: rawImg, type: t,
      name: c.name, attribute: c.attribute,
      level: c.level, rank: c.rank, linkval: c.linkval,
      atk: c.atk, def: c.def, desc: c.desc,
    }, a, oy, ox, fan);

    // ── Painel contextual ──
    if (window.__panelRegisterHand) {
      window.__panelRegisterHand(wrap, {
        id: c.id ?? i, name: c.name ?? `Carta ${i+1}`,
        type: c.type ?? '', attribute: c.attribute ?? '',
        level: c.level, rank: c.rank, linkval: c.linkval,
        atk: c.atk, def: c.def, desc: c.desc ?? '',
        imageUrl: img,
      });
    }

    HandState.wraps.push(wrap);
    HandState.cards.push({ ...c, type: c.type ?? t });
    hand.appendChild(wrap);
  });

  // clique fora da mão deseleciona
  document.addEventListener('click', e => {
    if (!e.target.closest('.card-wrap') && HandState.selected !== null) {
      const prevType = cardType(HandState.cards[HandState.selected]?.type || '');
      HandState.selected = null;
      applyHandStates();
      highlightValidZones(prevType, false);
    }
  });
}

// ── Drag & Drop ───────────────────────────────────────────
function setupDrag(wrapEl, card, angle, oy, ox, fan) {
  wrapEl.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    e.preventDefault();

    const rect  = wrapEl.getBoundingClientRect();
    const grabX = e.clientX - rect.left;
    const grabY = e.clientY - rect.top;

    // ghost clone
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.style.left = rect.left + 'px';
    ghost.style.top  = rect.top  + 'px';
    const artImg = wrapEl.querySelector('.art img');
    ghost.innerHTML = `
      <div class="card">
        <div class="art">
          ${artImg ? `<img src="${artImg.src}" alt="">` : ''}
          <div class="sparkles"></div>
        </div>
      </div>`;
    document.body.appendChild(ghost);

    wrapEl.style.opacity = '0';
    wrapEl.classList.add('is-dragging');

    // only highlight zones that match card type
    const validZoneSelector = validZones(card.type);
    const zones = document.querySelectorAll(validZoneSelector);
    zones.forEach(z => z.classList.add('drop-target'));

    const onMove = e => {
      ghost.style.left = (e.clientX - grabX) + 'px';
      ghost.style.top  = (e.clientY - grabY) + 'px';
      const tilt = Math.max(-20, Math.min(20, (e.clientX - rect.left - grabX) * .05));
      ghost.style.transform = `rotate(${tilt}deg) scale(1.05)`;
    };

    const onUp = async e => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      ghost.remove();
      zones.forEach(z => z.classList.remove('drop-target'));
      wrapEl.classList.remove('is-dragging');

      // drop only on valid zone for this card type
      const target = document.elementFromPoint(e.clientX, e.clientY)
        ?.closest(`${validZoneSelector}:not(.occupied)`);

      if (target) {
        await summonToField(wrapEl, card, target);
      } else {
        wrapEl.style.opacity   = '1';
        wrapEl.style.transform = fan;
        wrapEl.style.zIndex    = '';
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// Returns the CSS selector for valid drop zones based on card type
function validZones(type) {
  const t = (type || '').toUpperCase();
  if (t.includes('SPELL') || t.includes('TRAP'))
    return '#playerSpellZones .zone--spell';
  return '#playerZones .zone--monster';
}

// ── Init ──────────────────────────────────────────────────
(async () => {
  try {
    // Busca uma carta de cada tipo para testar todos os FX
    const urls = [
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Fusion+Monster&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Synchro+Monster&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=XYZ+Monster&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Link+Monster&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Effect+Monster&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Spell+Card&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Trap+Card&num=1&offset=0',
    ];
    const results = await Promise.all(urls.map(u => fetch(u).then(r => r.json())));
    const cards = results.map(r => r.data[0]);
    buildHand(cards);
  } catch (e) {
    buildHand(Array.from({ length: 7 }, (_, i) => ({
      id:   i + 1,
      name: `Card ${i + 1}`,
      type: ['Fusion Monster','Synchro Monster','XYZ Monster','Link Monster','Effect Monster','Spell Card','Trap Card'][i],
      card_images: [{ image_url: '' }],
    })));
  }
})();