import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { login, register, startLocalSession } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          throw new Error('As senhas nao conferem')
        }
        await register(username, email, password)
      } else {
        await login(username, password)
      }
    } catch (err) {
      setError(err.message || 'Falha na autenticacao')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-brand">
          <span>DUEL SYSTEM</span>
          <strong>{mode === 'login' ? 'Login' : 'Registro'}</strong>
        </div>

        <div className="auth-tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Registrar</button>
        </div>

        <form onSubmit={submit} className="auth-form">
          <label>
            Usuario
            <input value={username} onChange={(event) => setUsername(event.target.value)} required autoComplete="username" />
          </label>

          {mode === 'register' && (
            <label>
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
            </label>
          )}

          <label>
            Senha
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </label>

          {mode === 'register' && (
            <label>
              Confirmar senha
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required autoComplete="new-password" />
            </label>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Registrar'}
          </button>
          <button className="ghost-button" type="button" onClick={() => { startLocalSession(); navigate('/lobby') }}>
            Modo local
          </button>
        </form>
      </section>
    </main>
  )
}
