import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function Navbar({ onMenuToggle, onUpload }) {
  const { user, logout } = useAuthStore()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  function handleSearch(e) {
    e.preventDefault()
    const q = search.trim()
    if (q) navigate(`/maps?q=${encodeURIComponent(q)}`)
  }

  return (
    <header className="sticky top-0 z-40 bg-surface-1 border-b border-border flex items-center gap-3 px-4 h-14 shrink-0">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-1.5 rounded-md text-[#8b949e] hover:text-[#cdd9e5] hover:bg-surface-3 transition-colors"
        aria-label="Toggle menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 shrink-0 no-underline">
        <img
          src="/content/default/eldorito.png"
          alt="Dewrito Share"
          className="w-7 h-7 object-contain"
          onError={(e) => { e.target.style.display = 'none' }}
        />
        <span className="hidden sm:block font-semibold text-[#cdd9e5] text-sm">Dewrito Share</span>
      </Link>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search maps and mods..."
            className="input pl-9 py-1.5 text-sm"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2">
        {user ? (
          <>
            {/* Upload buttons */}
            <button
              onClick={() => onUpload('map')}
              className="btn-ghost text-xs px-2 py-1"
              title="Upload Map"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span className="hidden sm:inline">Map</span>
            </button>
            <button
              onClick={() => onUpload('mod')}
              className="btn-ghost text-xs px-2 py-1"
              title="Upload Mod"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span className="hidden sm:inline">Mod</span>
            </button>

            <Link to="/profile" className="btn-secondary text-xs px-3 py-1 no-underline">
              {user.name}
            </Link>
            <button onClick={logout} className="btn-danger text-xs px-3 py-1">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-secondary text-xs px-3 py-1 no-underline">Login</Link>
            <Link to="/register" className="btn-primary text-xs px-3 py-1 no-underline">Register</Link>
          </>
        )}
      </div>
    </header>
  )
}
