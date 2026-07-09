export default function LoadingSpinner({ message = 'Carregando...' }) {
  return (
    <div className="loading-shell">
      <div className="loading-spinner">
        <div className="loading-ring" />
        <div className="loading-ring loading-ring--inner" />
      </div>
      <div className="loading-text">{message}</div>
    </div>
  )
}
