import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Login failed')
        return
      }

      const { token } = await res.json() as { token: string }
      localStorage.setItem('admin_token', token)
      navigate('/admin/dashboard')
    } catch {
      setError('Cannot reach the server. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo / branding */}
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🌿</span>
          <span style={styles.logoText}>Green Village</span>
        </div>
        <h1 style={styles.heading}>Admin Portal</h1>
        <p style={styles.sub}>Sign in to manage rooms and content</p>

        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <label style={styles.label} htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            placeholder="admin"
          />

          <label style={styles.label} htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            placeholder="••••••••"
          />

          {error && <p style={styles.errorMsg}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <a href="/" style={styles.backLink}>← Back to website</a>
      </div>
    </div>
  )
}

// ─── INLINE STYLES ────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0b1a0e 0%, #0d2414 60%, #0a1f10 100%)',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    padding: '1rem',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(217,255,120,0.15)',
    borderRadius: 20,
    padding: '2.5rem 2rem',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: '1.5rem',
  },
  logoIcon: { fontSize: 24 },
  logoText: {
    color: '#d9ff78',
    fontWeight: 700,
    fontSize: 18,
    letterSpacing: '-0.02em',
  },
  heading: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 700,
    margin: 0,
    letterSpacing: '-0.03em',
  },
  sub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    marginTop: 6,
    marginBottom: '2rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    color: '#fff',
    fontSize: 15,
    padding: '0.75rem 1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  errorMsg: {
    background: 'rgba(255,80,80,0.12)',
    border: '1px solid rgba(255,80,80,0.3)',
    borderRadius: 8,
    color: '#ff9090',
    fontSize: 13,
    padding: '0.6rem 0.9rem',
    marginTop: 8,
  },
  btn: {
    marginTop: 20,
    background: '#d9ff78',
    color: '#0b1a0e',
    border: 'none',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 15,
    padding: '0.85rem',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  backLink: {
    display: 'block',
    textAlign: 'center',
    marginTop: '1.5rem',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    textDecoration: 'none',
  },
}
