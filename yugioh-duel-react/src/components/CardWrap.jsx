// ═══════════════════════════════════════════════════════════
// CardWrap.jsx — Carta na mão: tilt, hover, drag, tooltip
// ═══════════════════════════════════════════════════════════
import { useRef, useEffect, useCallback } from 'react'
import { useDuel }         from '../contexts/DuelContext'
import { cardType, proxiedUrl } from '../utils/cardHelpers'
import { showPhaseBlock }  from '../utils/fx'

const ANGLES  = [-18, -12, -6, 0,  6,  12, 18]
const OFFSETS = [ 38,  18,  6, 0,  6,  18, 38]
const SPREAD  = 34

export default function CardWrap({ card, index, total, hovered, selected, onHover, onLeave, onSelect }) {
  const { canSummon, startDrag, endDrag, dragState, updatePanel, selectCard } = useDuel()

  const wrapRef  = useRef(null)
  const cardRef  = useRef(null)
  const rafRef   = useRef(null)

  const count   = Math.min(total, 7)
  const i       = index
  const a       = ANGLES[i]  ?? 0
  const oy      = OFFSETS[i] ?? 0
  const ox      = (i - Math.floor(count / 2)) * SPREAD
  const t       = cardType(card?.type || 'MONSTER')
  const rawImg  = card?.card_images?.[0]?.image_url ?? card?.url ?? ''
  const img     = proxiedUrl(rawImg)
  const fan     = `rotate(${a}deg) translateY(${oy}px)`

  // ── Compute transform from state ──────────────────────
  const focus = hovered ?? selected
  let transform = fan
  let zIdx = ''
  let dimmed = false

  if (focus !== null) {
    if (i === focus) {
      const liftY = oy - 72
      const pullX = ox * 0.35
      transform = `translateX(${pullX - ox}px) rotate(${a * 0.4}deg) translateY(${liftY}px) scale(1.18)`
      zIdx = '200'
    } else {
      const dist  = i - focus
      const pushX = dist * 10
      transform = `translateX(${pushX}px) rotate(${a}deg) translateY(${oy}px)`
      dimmed = true
    }
  }

  const cls = [
    'card-wrap',
    i === hovered  ? 'card-wrap--hovered'  : '',
    i === selected ? 'card-wrap--selected' : '',
    dimmed         ? 'card-wrap--dimmed'   : '',
  ].filter(Boolean).join(' ')

  // ── Pointer tilt / holo ───────────────────────────────
  const onPointerMove = useCallback(e => {
    if (!cardRef.current || dragState.active) return
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      if (!cardRef.current) return
      const r  = cardRef.current.getBoundingClientRect()
      const x  = e.clientX - r.left
      const y  = e.clientY - r.top
      const rx = ((y - r.height/2) / (r.height/2)) * -14
      const ry = ((x - r.width /2) / (r.width /2)) *  14
      const wrap = wrapRef.current
      wrap?.style.setProperty('--rx', rx + 'deg')
      wrap?.style.setProperty('--ry', ry + 'deg')
      wrap?.style.setProperty('--mx', (x / r.width  * 100) + '%')
      wrap?.style.setProperty('--my', (y / r.height * 100) + '%')
      wrap?.style.setProperty('--o',  '1')
    })
  }, [dragState.active])

  const onPointerLeave = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const wrap = wrapRef.current
    wrap?.style.setProperty('--rx', '0deg')
    wrap?.style.setProperty('--ry', '0deg')
    wrap?.style.setProperty('--mx', '50%')
    wrap?.style.setProperty('--my', '50%')
    wrap?.style.setProperty('--o',  '0')
    onLeave(i, t)
  }, [i, t, onLeave])

  // ── Panel on hover ────────────────────────────────────
  const onPointerEnter = useCallback(() => {
    onHover(i, t)
    updatePanel('card', {
      id: card?.id, name: card?.name ?? `Carta ${i+1}`,
      type: card?.type ?? '', attribute: card?.attribute ?? '',
      level: card?.level, rank: card?.rank, linkval: card?.linkval,
      atk: card?.atk, def: card?.def, desc: card?.desc ?? '',
      imageUrl: img,
    })
  }, [i, t, card, img, onHover, updatePanel])

  // ── Drag (native mouse events for precise control) ────
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    const onMouseDown = e => {
      if (e.button !== 0) return
      if (!canSummon) {
        showPhaseBlock(wrap, 'Só na Main Phase')
        return
      }
      e.preventDefault()

      const rect  = wrap.getBoundingClientRect()
      const grabX = e.clientX - rect.left
      const grabY = e.clientY - rect.top

      const ghost = document.createElement('div')
      ghost.className = 'drag-ghost'
      ghost.style.left = rect.left + 'px'
      ghost.style.top  = rect.top  + 'px'
      const artImg = wrap.querySelector('.art img')
      ghost.innerHTML = `
        <div class="card"><div class="art">
          ${artImg ? `<img src="${artImg.src}" alt="">` : ''}
          <div class="sparkles"></div>
        </div></div>`
      document.body.appendChild(ghost)

      wrap.style.opacity = '0'
      startDrag(index, {
        id: card?.id ?? index, url: rawImg, type: t,
        name: card?.name, attribute: card?.attribute,
        level: card?.level, rank: card?.rank, linkval: card?.linkval,
        atk: card?.atk, def: card?.def, desc: card?.desc,
        card_images: card?.card_images,
      })

      const onMove = ev => {
        ghost.style.left = (ev.clientX - grabX) + 'px'
        ghost.style.top  = (ev.clientY - grabY) + 'px'
        const tilt = Math.max(-20, Math.min(20, (ev.clientX - rect.left - grabX) * .05))
        ghost.style.transform = `rotate(${tilt}deg) scale(1.05)`
      }

      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        ghost.remove()
        wrap.style.opacity = '1'
        endDrag()
      }

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    }

    wrap.addEventListener('mousedown', onMouseDown)
    return () => wrap.removeEventListener('mousedown', onMouseDown)
  }, [index, card, rawImg, t, canSummon, startDrag, endDrag])

  return (
    <div
      ref={wrapRef}
      className={cls}
      data-t={t}
      data-i={i}
      style={{
        '--i': i,
        '--fan': fan,
        left: `calc(50% - 74px + ${ox}px)`,
        transform,
        zIndex: zIdx,
      }}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={e => {
        if (dragState.active) return
        e.stopPropagation()
        onSelect(i, t)
        // Pass bounding rect so context menu knows where to appear
        const rect = wrapRef.current?.getBoundingClientRect()
        selectCard({
          card, location: 'hand', index: i,
          menuAnchor: rect ? { x: rect.left, y: rect.top, w: rect.width, h: rect.height } : null,
        })
      }}
    >
      <div className="card" ref={cardRef}>
        <div className="art">
          {img && (
            <img src={img} alt="" loading="lazy" />
          )}
          <div className="sparkles" />
        </div>
      </div>

    </div>
  )
}