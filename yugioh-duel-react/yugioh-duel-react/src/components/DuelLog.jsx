import { useState, useRef, useEffect } from 'react'
import { useDuel } from '../contexts/DuelContext'

export default function DuelLog() {
  const { instruction } = useDuel()
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState([])
  const prevRef = useRef(instruction)
  const listRef = useRef(null)

  useEffect(() => {
    if (instruction && instruction !== prevRef.current) {
      prevRef.current = instruction
      setEntries(prev => {
        const next = [...prev, { text: instruction, time: Date.now() }]
        return next.slice(-100)
      })
    }
  }, [instruction])

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [entries, open])

  return (
    <div className={`duel-log ${open ? 'duel-log--open' : ''}`}>
      <button className="duel-log-toggle" type="button" onClick={() => setOpen(o => !o)}>
        LOG ({entries.length})
      </button>
      {open && (
        <div className="duel-log-panel" ref={listRef}>
          {entries.length === 0 && (
            <div className="duel-log-empty">Nenhuma acao registrada</div>
          )}
          {entries.map((e, i) => (
            <div key={i} className="duel-log-entry">
              <span className="duel-log-time">
                {new Date(e.time).toLocaleTimeString('pt-BR', { minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="duel-log-text">{e.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
