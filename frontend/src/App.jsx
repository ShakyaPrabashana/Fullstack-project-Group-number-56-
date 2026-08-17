import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import TopBar from './components/TopBar'
import BoardPage from './pages/BoardPage'
import Login from './pages/Login'
import MyBookingsPage from './pages/MyBookingsPage'
import Register from './pages/Register'
import { AuthProvider, useAuth } from './state/AuthContext'
import { BookingsProvider, useBookings } from './state/BookingsContext'
import { todayIso } from './lib/time'

function Notice({ notice }) {
  return (
    <div className="noticebar" aria-live="polite">
      {notice && <p className={`notice notice--${notice.tone}`}>{notice.message}</p>}
    </div>
  )
}

function Shell() {
  const { user } = useAuth()
  const { bookings, notice } = useBookings()
  const today = todayIso()
  const mineCount = bookings.filter((b) => b.userId === user.id && b.day >= today).length

  return (
    <>
      <a className="skip" href="#main">
        Skip to the board
      </a>
      <TopBar mineCount={mineCount} />
      <main id="main">
        <Outlet />
      </main>
      <Notice notice={notice} />
    </>
  )
}

function Protected() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return (
    <BookingsProvider>
      <Shell />
    </BookingsProvider>
  )
}

function PublicOnly({ children }) {
  const { user } = useAuth()
  return user ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnly>
                <Login />
              </PublicOnly>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnly>
                <Register />
              </PublicOnly>
            }
          />
          <Route element={<Protected />}>
            <Route path="/" element={<BoardPage />} />
            <Route path="/bookings" element={<MyBookingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
