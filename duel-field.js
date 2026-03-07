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

// ── Summon to field ───────────────────────────────────────
async function summonToField(wrapEl, card, zoneEl) {
  zoneEl.classList.add('occupied');
  const lbl = zoneEl.querySelector('.zone-label');
  if (lbl) lbl.style.display = 'none';

  // Fade out hand card
  wrapEl.style.transition = 'opacity .25s, transform .25s';
  wrapEl.style.opacity = '0';
  setTimeout(() => wrapEl.remove(), 280);

  // Flash zone
  zoneEl.classList.add('flash');
  setTimeout(() => zoneEl.classList.remove('flash'), 600);

  const overlay = document.getElementById('loadingOverlay');
  overlay.classList.remove('hidden');
  setLoad(5, 'Gerando depth map...', 'Preparando parallax in-duel');

  try {
    let imageUrl = card.url;

    // Fallback: generate a canvas placeholder if no real image
    if (!imageUrl) {
      const c = document.createElement('canvas');
      c.width = 200; c.height = 290;
      const ctx = c.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 0, 290);
      g.addColorStop(0, '#1a0a3a');
      g.addColorStop(1, '#0a0a1a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 200, 290);
      ctx.font = '80px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🃏', 100, 170);
      imageUrl = c.toDataURL();
    }

    if (!depthPipe) await loadDepthModel();
    setLoad(75, 'Gerando depth map...', 'Executando Depth Anything V2');

    const dc = await getDepthMap(card.id, imageUrl);
    setLoad(95, 'Montando shader...', 'Compilando Three.js');

    // The colorDataUrl is either already a data URL or gets proxied in getDepthMap
    const colorDataUrl = imageUrl.startsWith('data:')
      ? imageUrl
      : await imageToDataURL(imageUrl);

    mountParallax(zoneEl, colorDataUrl, dc);

    // card-drop thud animation
    zoneEl.classList.add('card-landing');
    setTimeout(() => zoneEl.classList.remove('card-landing'), 500);

    setLoad(100, 'Carta invocada!', 'Shader ativo — mova o mouse');
    setTimeout(() => {
      overlay.classList.add('hidden');
      document.getElementById('instruction').textContent = 'MOVA O MOUSE SOBRE A CARTA NO CAMPO';
    }, 700);

  } catch (err) {
    console.error(err);
    document.getElementById('loadLog').textContent = '⚠️ ' + err.message;
    setTimeout(() => overlay.classList.add('hidden'), 3000);
  }
}

// ══════════════════════════════════════════════════════════
// POC3 HAND — exact implementation
// ══════════════════════════════════════════════════════════
const ANGLES  = [-18, -12, -6,  0,  6,  12, 18];
const OFFSETS = [ 38,  18,  6,  0,  6,  18, 38];
const SPREAD  = 34;

function cardType(t = '') {
  const u = t.toUpperCase();
  if (u.includes('SPELL')) return 'SPELL';
  if (u.includes('TRAP'))  return 'TRAP';
  return 'MONSTER';
}

function buildHand(cards) {
  const hand = document.getElementById('hand');
  hand.innerHTML = '';

  cards.slice(0, 7).forEach((c, i) => {
    const a   = ANGLES[i];
    const oy  = OFFSETS[i];
    const ox  = (i - 3) * SPREAD;
    const t   = cardType(c.type || 'MONSTER');
    const rawImg = c.card_images?.[0]?.image_url ?? c.url ?? '';
    const img = rawImg ? `https://corsproxy.io/?url=${encodeURIComponent(rawImg)}` : '';
    const fan = `rotate(${a}deg) translateY(${oy}px)`;

    const wrap = document.createElement('div');
    wrap.className = 'card-wrap';
    wrap.dataset.t = t;
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

    // ── Holo / tilt effect (exact poc3) ──
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

    wrap.addEventListener('pointerenter', () => {
      if (wrap.classList.contains('is-dragging')) return;
      wrap.style.transform = `rotate(${a}deg) translateY(${oy - 32}px) scale(1.09)`;
    });

    wrap.addEventListener('pointerleave', () => {
      cancelAnimationFrame(raf);
      wrap.style.setProperty('--rx', '0deg');
      wrap.style.setProperty('--ry', '0deg');
      wrap.style.setProperty('--mx', '50%');
      wrap.style.setProperty('--my', '50%');
      wrap.style.setProperty('--o',  '0');
      if (!wrap.classList.contains('is-dragging')) {
        wrap.style.transform = fan;
      }
    });

    // ── Drag & Drop ──
    setupDrag(wrap, { id: c.id ?? i, url: rawImg, type: t }, a, oy, ox, fan);

    hand.appendChild(wrap);
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
    const res  = await fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php?num=7&offset=10');
    const data = await res.json();
    buildHand(data.data);
  } catch (e) {
    buildHand(Array.from({ length: 7 }, (_, i) => ({
      id:   i + 1,
      name: `Card ${i + 1}`,
      type: ['Monster', 'Spell', 'Trap'][i % 3],
      card_images: [{ image_url: '' }],
    })));
  }
})();