import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, setAuth } from '../api.js'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const { sessionId, role } = getAuth()
    if (sessionId && role === 'admin') navigate('/leaderboard', { replace: true })
    if (sessionId && role === 'user') navigate('/game', { replace: true })
  }, [navigate])

  async function onLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        setError(data.error || 'Login failed.')
        return
      }

      setAuth({ sessionId: data.sessionId, role: data.role })
      if (data.role === 'admin') navigate('/leaderboard', { replace: true })
      else navigate('/game', { replace: true })
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1 className="title">Prompt Injection Game</h1>
      <div className="card">
        <div className="small">Login (admin: admin / admin123)</div>
        <div style={{ height: 10 }} />
        <form onSubmit={onLogin}>
          <div className="row">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              autoComplete="current-password"
            />
          </div>
          <div style={{ height: 12 }} />
          <button disabled={loading} type="submit">
            {loading ? 'Logging in…' : 'Login'}
          </button>
          <div className="small" style={{ color: '#fca5a5', marginTop: 10 }}>
            {error}
          </div>
        </form>
      </div>
    </div>
  )
}
