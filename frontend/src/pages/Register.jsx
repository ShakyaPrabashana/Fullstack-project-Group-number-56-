import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { useAuth } from '../state/AuthContext'

const MIN_PASSWORD = 8

export default function Register() {
  const { signUp, busy } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setError(null)

    if (form.name.trim().length < 2) {
      setError('Enter the name your teammates will recognise on the board.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setError('That email is missing an @ or a domain. Check it and try again.')
      return
    }
    if (form.password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`)
      return
    }
    if (form.password !== form.confirm) {
      setError('The two passwords do not match. Retype them.')
      return
    }

    const result = await signUp(form)
    if (result.ok) navigate('/')
    else setError(result.error)
  }

  return (
    <AuthShell
      title="Create an account"
      lede="Your name shows on the board next to anything you book, so teammates know who to ask."
      footer={
        <>
          Already registered? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form className="stack" onSubmit={submit} noValidate>
        <label className="field field--wide">
          <span className="field__label">Full name</span>
          <input
            type="text"
            className="input"
            autoComplete="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>

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

        <div className="pair">
          <label className="field">
            <span className="field__label">Password</span>
            <input
              type="password"
              className="input"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>

          <label className="field">
            <span className="field__label">Repeat password</span>
            <input
              type="password"
              className="input"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
          </label>
        </div>

        {error && (
          <p className="formerror" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--go" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  )
}
