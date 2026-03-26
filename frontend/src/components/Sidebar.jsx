import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { getTags } from '../api'

const DEFAULT_MAP_TAGS = ['Slayer', 'Infection', 'Race', 'Puzzle', 'KOTH', 'CTF', 'Assault', 'Territories', 'Oddball', 'Juggernaut', 'VIP', 'Mini Games']

function SideNavLink({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `nav-link text-sm ${isActive ? 'active' : ''}`
      }
    >
      {children}
    </NavLink>
  )
}

function SectionLabel({ children }) {
  return <p className="section-title mt-3">{children}</p>
}

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data: tagsData } = useQuery({ queryKey: ['tags'], queryFn: getTags, staleTime: 60_000 })
  const availableMapTags = tagsData?.map_tags ?? DEFAULT_MAP_TAGS
  const availableModTags = tagsData?.mod_tags ?? []

  function searchTag(tag, type = 'maps') {
    navigate(`/${type}/newest?tag=${encodeURIComponent(tag)}`)
    onClose()
  }

  return (
    <aside
      className={`
        fixed lg:sticky top-14 left-0 z-40
        w-60 h-[calc(100vh-3.5rem)]
        bg-surface-1 border-r border-border
        flex flex-col shrink-0
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      <div className="overflow-y-auto flex-1 py-3 px-2">

        <SectionLabel>Maps</SectionLabel>
        <nav className="flex flex-col gap-0.5">
          <SideNavLink to="/maps/newest">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Newest
          </SideNavLink>
          <SideNavLink to="/maps/downloaded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Most Downloaded
          </SideNavLink>
          <SideNavLink to="/maps/popular">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            Popular
          </SideNavLink>
          <SideNavLink to="/maps/oldest">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Oldest
          </SideNavLink>
        </nav>

        <SectionLabel>Mods</SectionLabel>
        <nav className="flex flex-col gap-0.5">
          <SideNavLink to="/mods/newest">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Newest
          </SideNavLink>
          <SideNavLink to="/mods/downloaded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Most Downloaded
          </SideNavLink>
          <SideNavLink to="/mods/popular">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            Popular
          </SideNavLink>
          <SideNavLink to="/mods/oldest">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Oldest
          </SideNavLink>
        </nav>

        <div className="mt-4 border-t border-border pt-3">
          <SectionLabel>Map Tags</SectionLabel>
          <div className="flex flex-wrap gap-1.5 px-3 pb-2">
            {availableMapTags.map((tag) => (
              <button
                key={`map-${tag}`}
                onClick={() => searchTag(tag, 'maps')}
                className="badge badge-gray hover:badge-green cursor-pointer transition-colors text-xs"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-3">
          <SectionLabel>Mod Tags</SectionLabel>
          <div className="flex flex-wrap gap-1.5 px-3 pb-2">
            {availableModTags.length > 0 ? availableModTags.map((tag) => (
              <button
                key={`mod-${tag}`}
                onClick={() => searchTag(tag, 'mods')}
                className="badge badge-gray hover:badge-green cursor-pointer transition-colors text-xs"
              >
                {tag}
              </button>
            )) : <span className="text-text-muted text-xs italic">No mod tags yet</span>}
          </div>
        </div>
      </div>

      {/* Footer links */}
      <div className="border-t border-border p-3 flex flex-col gap-1">
        {user?.is_admin && (
          <NavLink to="/admin" className={({ isActive }) => `nav-link text-xs ${isActive ? 'active' : ''}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Admin
          </NavLink>
        )}
        <a
          href="https://youtu.be/_Gr9cL9EZDY"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link text-xs"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          Forge Tutorial
        </a>
<NavLink to="/about" className={({ isActive }) => `nav-link text-xs ${isActive ? 'active' : ''}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          About
        </NavLink>
        <a
          href="https://status.zgaf.io/status/ed-service"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link text-xs"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Status
        </a>
        <a
          href="https://discord.gg/CPc7Gf7TPf"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link text-xs"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057.101 18.08.11 18.1.127 18.115a19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          Discord
        </a>
      </div>
    </aside>
  )
}
