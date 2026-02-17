import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, clearAuth, getAuth } from '../api.js'

function computeProgress(levelStats) {
  let cleared = 0
  for (let i = 1; i <= 8; i += 1) {
    const s = levelStats?.[String(i)]
    if (s && s.completedAt) cleared += 1
  }
  return Math.round((cleared / 8) * 100)
}

export default function GamePage() {
  const navigate = useNavigate()
  const { sessionId, role } = useMemo(() => getAuth(), [])

  const [state, setState] = useState({ currentLevel: '-', currentLevelWord: '', totalPrompts: 0, levelStats: {} })
  const [message, setMessage] = useState('')
  const [passwordGuess, setPasswordGuess] = useState('')
  const [error, setError] = useState('')
  const [guessError, setGuessError] = useState('')
  const [guessSuccess, setGuessSuccess] = useState('')
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [levelCleared, setLevelCleared] = useState(false)
  const [nextLevel, setNextLevel] = useState(null)
  const [chatByLevel, setChatByLevel] = useState({})

  const currentLevelKey = String(state.currentLevel)
  const chat = chatByLevel[currentLevelKey] || []

  const logRef = useRef(null)

  useEffect(() => {
    if (!sessionId || role !== 'user') {
      navigate('/', { replace: true })
      return
    }

    ;(async () => {
      const { ok, data } = await apiFetch('/api/state')
      if (!ok) {
        clearAuth()
        navigate('/', { replace: true })
        return
      }
      setState(data)
    })()
  }, [navigate, role, sessionId])

  useEffect(() => {
    // Per-level chat: each level starts with a fresh chat log.
    // This is kept client-side only (not persisted).
    const key = String(state.currentLevel)
    if (!key || key === '-' || key === 'NaN') return
    setChatByLevel((prev) => (prev[key] ? prev : { ...prev, [key]: [] }))
    setLevelCleared(false)
    setError('')
    setGuessError('')
    setGuessSuccess('')
    setMessage('')
    setPasswordGuess('')
  }, [state.currentLevel])

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [chat])

  const progressPct = computeProgress(state.levelStats)
  const sendDisabled = Date.now() < cooldownUntil

  async function onSend(e) {
    e.preventDefault()
    setError('')
    setLevelCleared(false)
    setNextLevel(null)

    const text = message.trim()
    if (!text) return

    setChatByLevel((m) => ({
      ...m,
      [currentLevelKey]: [...(m[currentLevelKey] || []), { kind: 'user', text }],
    }))
    setMessage('')

    setCooldownUntil(Date.now() + 2000)

    const { ok, data } = await apiFetch('/api/chat', { method: 'POST', body: { message: text } })
    if (!ok) {
      setError(data.error || 'Request failed.')
      return
    }

    setChatByLevel((m) => ({
      ...m,
      [currentLevelKey]: [...(m[currentLevelKey] || []), { kind: 'bot', text: data.reply || '(no reply)' }],
    }))
    if (data.levelCleared) {
      setLevelCleared(true)
      setNextLevel(data.nextLevel || null)
    }

    setState((s) => ({
      ...s,
      currentLevel: data.currentLevel,
      currentLevelWord: data.currentLevelWord || s.currentLevelWord,
      totalPrompts: data.totalPrompts,
    }))

    // Refresh levelStats safely
    const stateResp = await apiFetch('/api/state')
    if (stateResp.ok) setState(stateResp.data)
  }

  async function onValidatePassword(e) {
    e.preventDefault()
    setGuessError('')
    setGuessSuccess('')
    setNextLevel(null)

    const guess = passwordGuess.trim()
    if (!guess) return

    setCooldownUntil(Date.now() + 2000)

    const { ok, data } = await apiFetch('/api/validate-password', {
      method: 'POST',
      body: { passwordGuess: guess },
    })

    if (!ok) {
      setGuessError(data.error || 'Validation failed.')
      return
    }

    if (data.valid) {
      setGuessSuccess('Correct! Level cleared.')
      setLevelCleared(true)
      setNextLevel(data.nextLevel || null)
      setPasswordGuess('')
      setState((s) => ({
        ...s,
        currentLevel: data.currentLevel,
        currentLevelWord: data.currentLevelWord || s.currentLevelWord,
      }))

      const stateResp = await apiFetch('/api/state')
      if (stateResp.ok) setState(stateResp.data)
    } else {
      setGuessError('Incorrect password.')
    }
  }

  async function onPreviousLevel() {
    setError('')
    setGuessError('')
    setGuessSuccess('')
    setLevelCleared(false)

    const cur = Number(state.currentLevel)
    if (!Number.isFinite(cur) || cur <= 1) return

    const { ok, data } = await apiFetch('/api/set-level', { method: 'POST', body: { level: cur - 1 } })
    if (!ok) {
      setError(data.error || 'Failed to change level.')
      return
    }
    setState(data)
  }

  async function onContinue() {
    setError('')
    setGuessError('')
    setGuessSuccess('')

    const cur = Number(state.currentLevel)
    const nl = Number(nextLevel)
    if (!Number.isFinite(cur) || !Number.isFinite(nl) || nl <= cur) return

    const { ok, data } = await apiFetch('/api/set-level', { method: 'POST', body: { level: nl } })
    if (!ok) {
      setError(data.error || 'Failed to continue.')
      return
    }

    setState(data)
    setLevelCleared(false)
    setNextLevel(null)
  }

  function onLogout() {
    clearAuth()
    navigate('/', { replace: true })
  }

  return (
    <div className="container">
      <div className="row" style={{ alignItems: 'baseline' }}>
        <h1 className="title" style={{ margin: 0 }}>
          Game
        </h1>
        <div style={{ textAlign: 'right' }} className="small">
          <button onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div className="card">
        <div className="row">
          <div>
            <div className="small">Current level</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{state.currentLevel} / 8</div>
            <div className="small" style={{ marginTop: 6 }}>
              Level word: <span className="pill">{state.currentLevelWord || '—'}</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <button onClick={onPreviousLevel} disabled={Number(state.currentLevel) <= 1}>
                Previous level
              </button>
            </div>
          </div>
          <div>
            <div className="small">Total prompts</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{String(state.totalPrompts || 0)}</div>
          </div>
        </div>

        <div style={{ height: 12 }} />
        <div className="small">Progress</div>
        <div className="progressWrap">
          <div className="progressBar" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="banner" style={{ display: levelCleared ? 'block' : 'none' }}>
          Level cleared!
        </div>

        <div style={{ marginTop: 10, display: levelCleared && nextLevel && Number(state.currentLevel) < 8 ? 'block' : 'none' }}>
          <button onClick={onContinue}>Continue to level {nextLevel}</button>
        </div>

        <div className="subCard">
          <div className="subTitle">Validate password</div>
          <div className="small">Enter your guess for the current level password.</div>
          <div style={{ height: 10 }} />
          <form onSubmit={onValidatePassword}>
            <div className="row">
              <input
                value={passwordGuess}
                onChange={(e) => setPasswordGuess(e.target.value)}
                placeholder="Password guess"
              />
              <button type="submit" disabled={sendDisabled}>
                Validate
              </button>
            </div>
          </form>
          <div className="small" style={{ color: '#86efac', marginTop: 8 }}>
            {guessSuccess}
          </div>
          <div className="small" style={{ color: '#fca5a5', marginTop: 6 }}>
            {guessError}
          </div>
        </div>

        <div className="chatLog" ref={logRef}>
          {chat.map((m, idx) => (
            <div key={idx} className={`msg ${m.kind === 'user' ? 'user' : 'bot'}`}>
              {m.text}
            </div>
          ))}
        </div>

        <div style={{ height: 12 }} />
        <form onSubmit={onSend}>
          <div className="row">
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
            />
            <button type="submit" disabled={sendDisabled}>
              Send
            </button>
          </div>
        </form>

        <div className="small" style={{ marginTop: 8 }}>
          Send is disabled for 2 seconds after each prompt.
        </div>
        <div className="small" style={{ color: '#fca5a5', marginTop: 10 }}>
          {error}
        </div>
      </div>
    </div>
  )
}
