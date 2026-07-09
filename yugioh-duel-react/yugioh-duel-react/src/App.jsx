import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DuelProvider } from './contexts/DuelContext'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import LobbyPage from './pages/LobbyPage'
import DuelPage from './pages/DuelPage'
import NotFoundPage from './pages/NotFoundPage'
import HistoryPage from './pages/HistoryPage'

export default function App() {
  const [lightTheme, setLightTheme] = useState(() => localStorage.getItem('duel-theme') === 'light')

  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', lightTheme)
    localStorage.setItem('duel-theme', lightTheme ? 'light' : 'dark')
  }, [lightTheme])

  return (
    <ErrorBoundary>
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <DuelProvider>
            <Routes>
              <Route path="/" element={
                <ProtectedRoute requireAuth={false}><LoginPage /></ProtectedRoute>
              } />
              <Route path="/lobby" element={
                <ProtectedRoute><LobbyPage /></ProtectedRoute>
              } />
              <Route path="/duel/:duelId" element={
                <ProtectedRoute><DuelPage /></ProtectedRoute>
              } />
              <Route path="/duel/local" element={
                <ProtectedRoute><DuelPage /></ProtectedRoute>
              } />
              <Route path="/history" element={
                <ProtectedRoute><HistoryPage /></ProtectedRoute>
              } />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </DuelProvider>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
    </ErrorBoundary>
  )
}
