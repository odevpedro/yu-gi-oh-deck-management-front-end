import { lazy, Suspense, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
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
import MatchmakingPage from './pages/MatchmakingPage'
import SideDeckPage from './pages/SideDeckPage'

const LocalDuelPage = lazy(() => import('./pages/LocalDuelPage'))

const pageVariants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.15, ease: 'easeIn' } },
}

function AnimatedPage({ children }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ width: '100%', height: '100%' }}>
      {children}
    </motion.div>
  )
}

function AppRoutes() {
  const location = useLocation()
  const [lightTheme, setLightTheme] = useState(() => localStorage.getItem('duel-theme') === 'light')

  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', lightTheme)
    localStorage.setItem('duel-theme', lightTheme ? 'light' : 'dark')
  }, [lightTheme])

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <AnimatedPage><ProtectedRoute requireAuth={false}><LoginPage /></ProtectedRoute></AnimatedPage>
        } />
        <Route path="/lobby" element={
          <AnimatedPage><ProtectedRoute><LobbyPage /></ProtectedRoute></AnimatedPage>
        } />
        <Route path="/duel/:duelId" element={
          <AnimatedPage><ProtectedRoute><DuelPage /></ProtectedRoute></AnimatedPage>
        } />
        <Route path="/duel/local" element={
          <AnimatedPage><Suspense fallback={null}><LocalDuelPage /></Suspense></AnimatedPage>
        } />
        <Route path="/matchmaking" element={
          <AnimatedPage><ProtectedRoute><MatchmakingPage /></ProtectedRoute></AnimatedPage>
        } />
        <Route path="/side-deck" element={
          <AnimatedPage><ProtectedRoute><SideDeckPage /></ProtectedRoute></AnimatedPage>
        } />
        <Route path="/history" element={
          <AnimatedPage><ProtectedRoute><HistoryPage /></ProtectedRoute></AnimatedPage>
        } />
        <Route path="*" element={<AnimatedPage><NotFoundPage /></AnimatedPage>} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <DuelProvider>
            <AppRoutes />
          </DuelProvider>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
    </ErrorBoundary>
  )
}
