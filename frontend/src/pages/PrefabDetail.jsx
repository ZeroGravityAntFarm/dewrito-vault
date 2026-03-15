import { useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPrefab, getUser, timeSince } from '../api'
import { ErrorMessage } from '../components/ContentCard'
import ImageManager from '../components/ImageManager'

const DEFAULT_IMG = '/content/default/forge.jpg'

function ImageCarousel({ prefabId, count = 5, cacheKey = 0 }) {
  const [current, setCurrent] = useState(0)
  const images = Array.from({ length: count }, (_, i) => `/prefabs/${prefabId}/${i}${cacheKey ? `?t=${cacheKey}` : ''}`)

  return (
    <div className="relative bg-surface-3 rounded-lg overflow-hidden">
      <img
        src={images[current]}
        alt={`Prefab image ${current + 1}`}
        className="w-full object-cover"
        style={{ maxHeight: '480px', minHeight: '240px' }}
        onError={(e) => { e.target.src = DEFAULT_IMG }}
      />
      {count > 1 && (
        <>
          <button onClick={() => setCurrent((c) => (c - 1 + count) % count)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-9 h-9 flex items-center justify-center">‹</button>
          <button onClick={() => setCurrent((c) => (c + 1) % count)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-9 h-9 flex items-center justify-center">›</button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className={`w-2 h-2 rounded-full ${i === current ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function PrefabDetail({ legacyQuery }) {
  const params = useParams()
  const [searchParams] = useSearchParams()
  const prefabId = legacyQuery ? searchParams.get(legacyQuery) : params.id
  const [cacheKey, setCacheKey] = useState(0)

  const { data: prefab, isLoading, isError } = useQuery({
    queryKey: ['prefab', prefabId],
    queryFn: () => getPrefab(prefabId),
    enabled: !!prefabId,
  })

  const { data: uploader } = useQuery({
    queryKey: ['user', prefab?.owner_id],
    queryFn: () => getUser(prefab.owner_id),
    enabled: !!prefab?.owner_id,
  })

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="skeleton aspect-video rounded-lg" />
        <div className="skeleton h-8 w-1/2" />
      </div>
    )
  }

  if (isError || !prefab) return <ErrorMessage message="Prefab not found." />

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ImageCarousel prefabId={prefabId} cacheKey={cacheKey} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#e6edf3]">{prefab.prefabName}</h1>
          <p className="text-[#8b949e] mt-1">
            by {prefab.prefabAuthor}
            {uploader && <> · uploaded by <Link to={`/u/${uploader.name}`}>{uploader.name}</Link></>}
          </p>
        </div>
        <span className="badge badge-gray">{prefab.prefabTags}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={`/api_v2/prefabs/${prefabId}/file`} className="btn-primary no-underline" download>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Prefab
        </a>
      </div>

      {prefab.prefabDescription && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-3">Description</h2>
          <p className="text-[#cdd9e5] text-sm leading-relaxed whitespace-pre-wrap">{prefab.prefabDescription}</p>
        </div>
      )}

      <ImageManager type="prefabs" itemId={prefabId} ownerId={prefab.owner_id} onUpdate={setCacheKey} />

      <div className="card divide-y divide-border">
        <h2 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider px-5 py-3">Details</h2>
        {[
          ['Author', prefab.prefabAuthor],
          ['Downloads', prefab.downloads],
          ['Tag', prefab.prefabTags],
          ['Uploaded', prefab.time_created ? `${timeSince(prefab.time_created)} ago` : '—'],
          ['ID', prefab.id],
        ].filter(([, v]) => v != null).map(([label, value]) => (
          <div key={label} className="flex items-start gap-4 px-5 py-3">
            <span className="text-[#8b949e] text-sm w-36 shrink-0">{label}</span>
            <span className="text-[#cdd9e5] text-sm">{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
