import { StrictMode } from 'react'
import { createRoot }  from 'react-dom/client'
import './styles/duel-field.css'
import './styles/context-panel.css'
import './styles/card-context-menu.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
