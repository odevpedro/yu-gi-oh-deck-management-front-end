import { useState, useRef, useEffect } from 'react'

export default function DuelChat({ messages = [], onSend }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function handleSend(e) {
    e.preventDefault()
    if (!input.trim()) return
    onSend?.(input.trim())
    setInput('')
    inputRef.current?.focus()
  }

  return (
    <div className={`duel-chat ${open ? 'duel-chat--open' : ''}`} role="complementary" aria-label="Chat do duelo">
      <button className="duel-chat-toggle" type="button" onClick={() => setOpen(p => !p)}
        aria-label={open ? 'Fechar chat' : 'Abrir chat'} aria-expanded={open}>
        {open ? '✕' : '💬'}
      </button>
      {open && (
        <div className="duel-chat-panel" role="region" aria-label="Mensagens do chat">
          <div className="duel-chat-messages" role="log" aria-live="polite" aria-label="Mensagens">
            {messages.map((m, i) => (
              <div key={i} className={`duel-chat-msg ${m.playerId === 'local' || m.playerId === 'me' ? 'duel-chat-msg--self' : ''}`}>
                <span className="duel-chat-msg-author">{m.playerId?.slice(0, 8) || '???'}</span>
                <span className="duel-chat-msg-text">{m.message}</span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form className="duel-chat-input" onSubmit={handleSend} aria-label="Formulario de envio">
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              placeholder="Digite sua mensagem..." maxLength={200}
              aria-label="Mensagem" />
            <button type="submit" aria-label="Enviar mensagem">Enviar</button>
          </form>
        </div>
      )}
    </div>
  )
}