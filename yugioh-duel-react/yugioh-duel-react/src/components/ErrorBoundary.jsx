import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="auth-shell">
          <section className="auth-panel" style={{ textAlign: 'center' }}>
            <div className="auth-brand">
              <span>DUEL SYSTEM</span>
              <strong>ERRO INESPERADO</strong>
            </div>
            <p style={{ margin: '16px 0', color: 'rgba(200,60,60,.8)', fontSize: '.75rem', fontFamily: 'monospace' }}>
              {this.state.error.message}
            </p>
            <button className="auth-submit" type="button" onClick={() => window.location.reload()}>
              RECARREGAR
            </button>
          </section>
        </div>
      )
    }
    return this.props.children
  }
}
