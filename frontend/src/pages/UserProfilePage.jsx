import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getUserByName, getUserStats, getUserPublicMaps, getUserPublicMods } from '../api'
import { MapCard, ModCard, CardGrid, SkeletonCard, ErrorMessage } from '../components/ContentCard'

const DEFAULT_AVATAR = '/content/default/forge.png'

function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active ? 'border-accent text-[#e6edf3]' : 'border-transparent text-[#8b949e] hover:text-[#cdd9e5]'
      }`}
    >
      {children}
    </button>
  )
}

export default function UserProfilePage() {
  const { username } = useParams()
  const [tab, setTab] = useState('maps')

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['userByName', username],
    queryFn: () => getUserByName(username),
    enabled: !!username,
  })

  const { data: stats } = useQuery({
    queryKey: ['userStats', user?.id],
    queryFn: () => getUserStats(user.id),
    enabled: !!user?.id,
  })

  const { data: maps, isLoading: mapsLoading } = useQuery({
    queryKey: ['userPublicMaps', user?.id],
    queryFn: () => getUserPublicMaps(user.id),
    enabled: !!user?.id && tab === 'maps',
  })

  const { data: mods, isLoading: modsLoading } = useQuery({
    queryKey: ['userPublicMods', user?.id],
    queryFn: () => getUserPublicMods(user.id),
    enabled: !!user?.id && tab === 'mods',
  })

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="card p-6 flex gap-4">
          <div className="skeleton w-20 h-20 rounded-full shrink-0" />
          <div className="flex flex-col gap-3 flex-1 justify-center">
            <div className="skeleton h-6 w-1/3" />
            <div className="skeleton h-4 w-1/2" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !user) return <ErrorMessage message="User not found." />

  const avatarUrl = `/content/avatars/${user.id}.jpg`

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile header */}
      <div className="card p-6">
        <div className="flex items-center gap-5 flex-wrap">
          <img
            src={avatarUrl}
            alt={user.name}
            className="w-20 h-20 rounded-full object-cover bg-surface-3 shrink-0"
            onError={(e) => { e.target.src = DEFAULT_AVATAR }}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[#e6edf3]">{user.name}</h1>
            {user.rank && <span className="badge badge-green mt-2 inline-block">{user.rank}</span>}
            {stats && (
              <div className="flex gap-4 mt-3 text-sm text-[#8b949e]">
                <span><span className="text-[#cdd9e5] font-medium">{stats.maps ?? 0}</span> maps</span>
                <span><span className="text-[#cdd9e5] font-medium">{stats.mods ?? 0}</span> mods</span>
              </div>
            )}
          </div>
        </div>
        {user.about && (
          <p className="text-[#cdd9e5] text-sm mt-5 leading-relaxed border-t border-border pt-4">{user.about}</p>
        )}
      </div>

      {/* Tabs */}
      <div>
        <div className="border-b border-border flex mb-6">
          <Tab active={tab === 'maps'} onClick={() => setTab('maps')}>
            Maps {stats?.maps != null ? `(${stats.maps})` : maps?.length != null ? `(${maps.length})` : ''}
          </Tab>
          <Tab active={tab === 'mods'} onClick={() => setTab('mods')}>
            Mods {stats?.mods != null ? `(${stats.mods})` : mods?.length != null ? `(${mods.length})` : ''}
          </Tab>
        </div>

        {tab === 'maps' && (
          mapsLoading
            ? <CardGrid>{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</CardGrid>
            : maps?.length
              ? <CardGrid>{maps.map((m) => <MapCard key={m.id} map={m} />)}</CardGrid>
              : <p className="text-[#8b949e] text-center py-16">No maps uploaded yet.</p>
        )}

        {tab === 'mods' && (
          modsLoading
            ? <CardGrid>{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</CardGrid>
            : mods?.length
              ? <CardGrid>{mods.map((m) => <ModCard key={m.id} mod={m} />)}</CardGrid>
              : <p className="text-[#8b949e] text-center py-16">No mods uploaded yet.</p>
        )}
      </div>
    </div>
  )
}
