import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, clearAuth, getAuth } from '../api.js'

export default function LeaderboardPage() {
  const navigate = useNavigate()
  const { sessionId, role } = getAuth()

  const [rows, setRows] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionId || role !== 'admin') {
      navigate('/', { replace: true })
      return
    }

    let alive = true

    async function load() {
      const { ok, data } = await apiFetch('/api/leaderboard')
      if (!ok) {
        setError(data.error || 'Failed to load leaderboard.')
        return
      }
      if (!alive) return
      setError('')
      setRows(Array.isArray(data.leaderboard) ? data.leaderboard : [])
    }

    load()
    const id = setInterval(load, 5000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [navigate, role, sessionId])

  function onLogout() {
    clearAuth()
    navigate('/', { replace: true })
  }

  return (
    <div className="container">
      <div className="row" style={{ alignItems: 'baseline' }}>
        <h1 className="title" style={{ margin: 0 }}>
          Leaderboard
        </h1>
        <div style={{ textAlign: 'right' }} className="small">
          <button onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div className="card">
        <div className="small">Auto-refreshes periodically. Admin only.</div>

        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Highest level cleared</th>
              <th>Total prompts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.username}>
                <td>{r.username}</td>
                <td>{r.highestLevelCleared}</td>
                <td>{r.totalPrompts}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="small" style={{ color: '#fca5a5', marginTop: 10 }}>
          {error}
        </div>
      </div>
    </div>
  )
}
