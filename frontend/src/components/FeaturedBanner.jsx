import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getFeatured, timeSince } from '../api'

const DEFAULT_IMG = '/content/default/forge.jpg'

export default function FeaturedBanner({ type }) {
  const { data, isLoading } = useQuery({
    queryKey: ['featured'],
    queryFn: getFeatured,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="skeleton rounded-lg mb-6" style={{ height: '200px' }} />
    )
  }

  const items = data?.[type] ?? []
  if (!items.length) return null

  const item = items[0]
  const to = type === 'maps' ? `/maps/${item.id}` : `/mods/${item.id}`
  const thumb = `/${type}/${item.id}/0`
  const title = type === 'maps' ? item.mapName : item.modName
  const tag = type === 'maps' ? item.mapTags : item.modTags
  const author = type === 'maps' ? item.mapAuthor : item.modAuthor
  const desc = type === 'maps' ? (item.mapUserDesc?.trim() || item.mapDescription) : (item.modUserDescription?.trim() || item.modDescription)
  const downloads = type === 'maps' ? item.map_downloads : item.mod_downloads
  const created = item.time_created

  return (
    <Link
      to={to}
      className="group relative flex overflow-hidden rounded-lg border border-border hover:border-accent transition-colors no-underline mb-6"
      style={{ minHeight: '200px' }}
    >
      {/* Background image */}
      <img
        src={thumb}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        onError={(e) => { e.target.src = DEFAULT_IMG }}
      />
      {/* Dark gradient from right over image */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/20" />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between p-6 max-w-lg">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1 h-4 bg-accent rounded-full shrink-0" />
            <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">Featured This Week</span>
          </div>
          <h2 className="text-xl font-bold text-[#e6edf3] leading-snug mb-1 group-hover:text-accent transition-colors">
            {title}
          </h2>
          {author && (
            <p className="text-sm text-[#8b949e] mb-2">by {author}</p>
          )}
          {desc && (
            <p className="text-sm text-[#cdd9e5] line-clamp-2 leading-relaxed">
              {desc}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          {tag && <span className="badge badge-green text-xs">{tag.split(',')[0].trim()}</span>}
          {downloads != null && (
            <span className="flex items-center gap-1 text-xs text-[#8b949e]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloads.toLocaleString()}
            </span>
          )}
          {created && (
            <span className="text-xs text-[#8b949e]">{timeSince(created)} ago</span>
          )}
        </div>
      </div>
    </Link>
  )
}
