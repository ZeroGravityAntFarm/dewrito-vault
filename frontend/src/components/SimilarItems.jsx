import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMapsNewest, getModsNewest, timeSince } from '../api'

const DEFAULT_IMG = '/content/default/forge.png'

function SimilarCard({ to, thumb, title, meta, age, upvotes, downloads }) {
  return (
    <Link
      to={to}
      className="flex gap-3 p-3 rounded-lg hover:bg-surface-2 transition-colors no-underline group"
    >
      <div className="w-28 h-20 rounded-md overflow-hidden shrink-0 bg-surface-3">
        <img
          src={thumb}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { e.target.src = DEFAULT_IMG }}
        />
      </div>
      <div className="flex flex-col justify-center min-w-0">
        <p className="text-sm font-medium text-[#cdd9e5] group-hover:text-white leading-snug line-clamp-2">
          {title}
        </p>
        {meta && <p className="text-xs text-[#8b949e] mt-1 truncate">{meta}</p>}
        <div className="flex items-center gap-2 mt-1.5 text-xs text-[#8b949e]">
          {downloads != null && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloads}
            </span>
          )}
          {(upvotes ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-accent">
              <span style={{ filter: 'grayscale(1)' }}>👍</span> {upvotes}
            </span>
          )}
          {age && <span>{age}</span>}
        </div>
      </div>
    </Link>
  )
}

export default function SimilarItems({ type, tag, currentId }) {
  const isMaps = type === 'maps'
  const primaryTag = tag ? tag.split(',')[0].trim() : ''

  const { data, isLoading } = useQuery({
    queryKey: ['similar', type, primaryTag],
    queryFn: () => isMaps ? getMapsNewest(1, 12, primaryTag) : getModsNewest(1, 12, primaryTag),
    enabled: !!primaryTag,
    staleTime: 5 * 60 * 1000,
  })

  const items = (data?.items ?? []).filter((i) => String(i.id) !== String(currentId)).slice(0, 8)

  if (!primaryTag) return null

  return (
    <div className="lg:sticky lg:top-20">
      <h2 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider px-2 mb-2">
        Similar {isMaps ? 'Maps' : 'Mods'}
      </h2>

      {isLoading ? (
        <div className="flex flex-col gap-1 p-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-3">
              <div className="skeleton w-28 h-20 rounded-md shrink-0" />
              <div className="flex flex-col gap-2 flex-1 justify-center">
                <div className="skeleton h-3.5 w-full" />
                <div className="skeleton h-3 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-[#8b949e] px-2">No similar {isMaps ? 'maps' : 'mods'} found.</p>
      ) : (
        <div className="flex flex-col">
          {items.map((item) => {
            const title = isMaps ? item.mapName : item.modName
            const meta = isMaps ? item.mapAuthor : item.modAuthor
            const downloads = isMaps ? item.map_downloads : item.mod_downloads
            const thumb = `/${type}/tb/${item.id}/0`
            const to = `/${type}/${item.id}`
            const age = item.time_created ? `${timeSince(item.time_created)} ago` : null

            return (
              <SimilarCard
                key={item.id}
                to={to}
                thumb={thumb}
                title={title}
                meta={meta}
                downloads={downloads}
                upvotes={item.up_votes}
                age={age}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
