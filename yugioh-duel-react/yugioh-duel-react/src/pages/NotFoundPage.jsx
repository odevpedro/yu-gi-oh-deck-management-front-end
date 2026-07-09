import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <main className="auth-shell">
      <section className="auth-panel" style={{ textAlign: 'center' }}>
        <div className="auth-brand">
          <span>DUEL SYSTEM</span>
          <strong>404 — DUELO NAO ENCONTRADO</strong>
        </div>
        <p style={{ margin: '24px 0', color: 'rgba(160,180,220,.7)', fontSize: '.9rem' }}>
          A pagina que voce procura nao existe ou foi movida.
        </p>
        <button className="auth-submit" type="button" onClick={() => navigate('/lobby')}>
          VOLTAR AO LOBBY
        </button>
      </section>
    </main>
  )
}
