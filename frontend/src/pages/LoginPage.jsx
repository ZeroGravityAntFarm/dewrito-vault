import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [step, setStep] = useState('credentials') // 'credentials' | 'totp'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const totpRef = useRef(null)

  async function handleCredentials(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(username, password)
      if (result?.requires_2fa) {
        setStep('totp')
        setTimeout(() => totpRef.current?.focus(), 50)
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  async function handleTotp(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password, totpCode)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Invalid code.')
      setTotpCode('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/content/default/eldorito.png" alt="logo" className="w-12 h-12 mx-auto mb-4 object-contain" onError={(e) => { e.target.style.display = 'none' }} />
          <h1 className="text-2xl font-bold text-[#e6edf3]">Sign in</h1>
          <p className="text-[#8b949e] text-sm mt-1">to Dewrito Share</p>
        </div>

        <div className="card p-6">
          {step === 'credentials' ? (
            <form onSubmit={handleCredentials} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#cdd9e5]">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                  required
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#cdd9e5]">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  required
                />
              </div>

              {error && (
                <p className="text-[#f85149] text-sm bg-[#f85149]/10 border border-[#f85149]/30 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} className="btn-primary justify-center disabled:opacity-50 mt-1">
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleTotp} className="flex flex-col gap-4">
              <div className="flex items-center gap-3 mb-1">
                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setError(''); setTotpCode('') }}
                  className="text-[#8b949e] hover:text-[#cdd9e5] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <p className="text-sm font-medium text-[#cdd9e5]">Two-factor authentication</p>
                  <p className="text-xs text-[#8b949e]">Enter the 6-digit code from your authenticator app</p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#cdd9e5]">Authenticator code</label>
                <input
                  ref={totpRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  className="input text-center text-xl tracking-widest"
                  placeholder="000000"
                  required
                  autoComplete="one-time-code"
                />
              </div>

              {error && (
                <p className="text-[#f85149] text-sm bg-[#f85149]/10 border border-[#f85149]/30 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading || totpCode.length !== 6} className="btn-primary justify-center disabled:opacity-50 mt-1">
                {loading ? 'Verifying…' : 'Verify'}
              </button>
            </form>
          )}
        </div>

        {step === 'credentials' && (
          <p className="text-center text-sm text-[#8b949e] mt-4">
            Don't have an account?{' '}
            <Link to="/register">Register</Link>
          </p>
        )}
      </div>
    </div>
  )
}
