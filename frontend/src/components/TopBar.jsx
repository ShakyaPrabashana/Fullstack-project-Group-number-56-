import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'

function initials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default function TopBar({ mineCount }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__mark">Campus</span>
        <span className="topbar__mark topbar__mark--thin">Book</span>
      </div>

      <nav className="topbar__nav" aria-label="Main">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'tab tab--on' : 'tab')}>
          Board
        </NavLink>
        <NavLink to="/bookings" className={({ isActive }) => (isActive ? 'tab tab--on' : 'tab')}>
          My bookings
          {mineCount > 0 && <span className="tab__count">{mineCount}</span>}
        </NavLink>
      </nav>

      <div className="topbar__user">
        <span className="avatar" aria-hidden="true">
          {initials(user.name)}
        </span>
        <span className="topbar__name">{user.name}</span>
        <button
          type="button"
          className="btn btn--quiet btn--onink"
          onClick={() => {
            signOut()
            navigate('/login')
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
