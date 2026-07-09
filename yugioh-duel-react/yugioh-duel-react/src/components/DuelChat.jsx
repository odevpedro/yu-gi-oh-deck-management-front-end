import { useState, useRef, useEffect } from 'react'

export default function DuelChat({ messages = [], onSend }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend(e) {
    e.preventDefault()
    if (!input.trim()) return
    onSend?.(input.trim())
    setInput('')
  }

  return (
    <div className={`duel-chat ${open ? 'duel-chat--open' : ''}`}>
      <button className="duel-chat-toggle" type="button" onClick={() => setOpen(p => !p)}>
        {open ? '✕' : '💬'}
      </button>
      {open && (
        <div className="duel-chat-panel">
          <div className="duel-chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`duel-chat-msg ${m.playerId === 'local' || m.playerId === 'me' ? 'duel-chat-msg--self' : ''}`}>
                <span className="duel-chat-msg-author">{m.playerId?.slice(0, 8) || '???'}</span>
                <span className="duel-chat-msg-text">{m.message}</span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form className="duel-chat-input" onSubmit={handleSend}>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Digite sua mensagem..." maxLength={200} />
            <button type="submit">Enviar</button>
          </form>
        </div>
      )}
    </div>
  )
}