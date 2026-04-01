import { Link } from 'react-router-dom'
import { timeSince } from '../api'

const DEFAULT_IMG = '/content/default/forge.png'

function Thumbnail({ src, alt }) {
  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      onError={(e) => { e.target.src = DEFAULT_IMG }}
    />
  )
}

export function MapCard({ map }) {
  return (
    <Link to={`/maps/${map.id}`} className="card group flex flex-col hover:border-[#444c56] transition-colors no-underline">
      <div className="aspect-video overflow-hidden bg-surface-3">
        <Thumbnail src={`/maps/tb/${map.id}/0`} alt={map.mapName} />
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-semibold text-[#e6edf3] text-sm leading-snug line-clamp-2 group-hover:text-white">
          {map.mapName}
        </h3>
        <p className="text-[#8b949e] text-xs flex-1">
          Author {map.mapAuthor}
          {map.uploader && (
            <>
              {' '}· Uploader <Link to={`/u/${map.uploader}`} className="text-link hover:text-link-hover">{map.uploader}</Link>
            </>
          )}
        </p>
        <p className="text-[#8b949e] text-xs line-clamp-2">{map.mapDescription}</p>
        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="flex flex-wrap gap-1">
            {(map.mapTags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 2).map((t) => (
              <span key={t} className="badge badge-green">{t}</span>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-[#8b949e]">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {map.map_downloads ?? 0}
            </span>
            {(map.up_votes ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-accent">
                <span style={{ filter: 'grayscale(1)' }}>👍</span> {map.up_votes}
              </span>
            )}
            {map.time_created && (
              <span>{timeSince(map.time_created)} ago</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export function ModCard({ mod }) {
  return (
    <Link to={`/mods/${mod.id}`} className="card group flex flex-col hover:border-[#444c56] transition-colors no-underline">
      <div className="aspect-video overflow-hidden bg-surface-3">
        <Thumbnail src={`/mods/tb/${mod.id}/0`} alt={mod.modName} />
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-semibold text-[#e6edf3] text-sm leading-snug line-clamp-2 group-hover:text-white">
          {mod.modName}
        </h3>
        <p className="text-[#8b949e] text-xs flex-1">
          Author {mod.modAuthor}
          {mod.uploader && (
            <>
              {' '}· Uploader <Link to={`/u/${mod.uploader}`} className="text-link hover:text-link-hover">{mod.uploader}</Link>
            </>
          )}
        </p>
        <p className="text-[#8b949e] text-xs line-clamp-2">{mod.modDescription}</p>
        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="flex flex-wrap gap-1">
            {(mod.modTags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 2).map((t) => (
              <span key={t} className="badge badge-blue">{t}</span>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-[#8b949e]">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {mod.mod_downloads ?? 0}
            </span>
            {(mod.up_votes ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-accent">
                <span style={{ filter: 'grayscale(1)' }}>👍</span> {mod.up_votes}
              </span>
            )}
            {mod.time_created && <span>{timeSince(mod.time_created)} ago</span>}
          </div>
        </div>
      </div>
    </Link>
  )
}

export function PrefabCard({ prefab }) {
  return (
    <Link to={`/prefabs/${prefab.id}`} className="card group flex flex-col hover:border-[#444c56] transition-colors no-underline">
      <div className="aspect-video overflow-hidden bg-surface-3">
        <Thumbnail src={`/prefabs/tb/${prefab.id}/0`} alt={prefab.prefabName} />
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-semibold text-[#e6edf3] text-sm leading-snug line-clamp-2 group-hover:text-white">
          {prefab.prefabName}
        </h3>
        <p className="text-[#8b949e] text-xs flex-1">
          Author {prefab.prefabAuthor}
          {prefab.uploader && (
            <>
              {' '}· Uploader <Link to={`/u/${prefab.uploader}`} className="text-link hover:text-link-hover">{prefab.uploader}</Link>
            </>
          )}
        </p>
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="badge badge-gray">{prefab.prefabTags}</span>
          <div className="flex items-center gap-3 text-xs text-[#8b949e]">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {prefab.downloads ?? 0}
            </span>
            {prefab.time_created && <span>{timeSince(prefab.time_created)} ago</span>}
          </div>
        </div>
      </div>
    </Link>
  )
}

export function VariantCard({ variant }) {
  return (
    <Link to={`/variants/${variant.id}`} className="card group flex flex-col hover:border-[#444c56] transition-colors no-underline">
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-[#e6edf3] text-sm leading-snug group-hover:text-white">
            {variant.variantName}
          </h3>
          <span className="badge badge-blue shrink-0">{variant.variantType}</span>
        </div>
        <p className="text-[#8b949e] text-xs">
          Author {variant.variantAuthor}
          {variant.uploader && (
            <>
              {' '}· Uploader <Link to={`/u/${variant.uploader}`} className="text-link hover:text-link-hover">{variant.uploader}</Link>
            </>
          )}
        </p>
        <p className="text-[#8b949e] text-xs line-clamp-3 flex-1">{variant.variantDescription}</p>
        <div className="flex items-center justify-end mt-auto pt-2">
          <span className="flex items-center gap-1 text-xs text-[#8b949e]">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {variant.downloads ?? 0}
          </span>
        </div>
      </div>
    </Link>
  )
}

export function CardGrid({ children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {children}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="card flex flex-col">
      <div className="aspect-video skeleton" />
      <div className="p-4 flex flex-col gap-3">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-2/3" />
        <div className="flex justify-between mt-2">
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-3 w-20" />
        </div>
      </div>
    </div>
  )
}

export function ErrorMessage({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <svg className="w-12 h-12 text-[#484f58] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p className="text-[#8b949e]">{message || 'Something went wrong.'}</p>
    </div>
  )
}

export function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <svg className="w-12 h-12 text-[#484f58] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p className="text-[#8b949e]">{message || 'No results found.'}</p>
    </div>
  )
}
