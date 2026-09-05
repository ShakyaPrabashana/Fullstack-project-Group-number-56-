import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { useAuth } from '../state/AuthContext'

export default function Login() {
  const { signIn, busy } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(null)

    if (!form.email.trim() || !form.password) {
      setError('Enter your email and password to sign in.')
      return
    }

    const result = await signIn(form)
    if (result.ok) navigate('/')
    else setError(result.error)
  }

  return (
    <AuthShell
      title="Sign in"
      lede="Use the account you registered with your University email."
      footer={
        <>
          No account yet? <Link to="/register">Register</Link>
        </>
      }
    >
      <form className="stack" onSubmit={submit} noValidate>
        <label className="field field--wide">
          <span className="field__label">Email</span>
          <input
            type="email"
            className="input"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>

        <label className="field field--wide">
          <span className="field__label">Password</span>
          <span className="field__control">
            <input
              type={showPassword ? 'text' : 'password'}
              className="input"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <button
              type="button"
              className="field__toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </span>
        </label>

        {error && (
          <p className="formerror" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--go" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  )
}
