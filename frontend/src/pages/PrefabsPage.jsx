import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPrefabsNewest, getPrefabsDownloaded, getPrefabsOldest, searchPrefabs } from '../api'
import { PrefabCard, CardGrid, SkeletonCard, ErrorMessage, EmptyState } from '../components/ContentCard'
import Pagination from '../components/Pagination'

const PREFAB_TAGS = ['Structures', 'Vehicles', 'Scenery', 'Props', 'Weapons', 'Effects', 'Terrain']

const SORT_LABELS = { newest: 'Newest', downloaded: 'Most Downloaded', oldest: 'Oldest' }

const PAGE_SIZE = 21

export default function PrefabsPage({ sort = 'newest' }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const query = searchParams.get('q') || ''
  const tag = searchParams.get('tag') || ''

  useEffect(() => { setPage(1) }, [sort, query, tag])

  function fetchFn() {
    if (query) return searchPrefabs(query, page, PAGE_SIZE)
    if (sort === 'downloaded') return getPrefabsDownloaded(page, PAGE_SIZE, tag)
    if (sort === 'oldest') return getPrefabsOldest(page, PAGE_SIZE, tag)
    return getPrefabsNewest(page, PAGE_SIZE, tag)
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['prefabs', sort, query, tag, page],
    queryFn: fetchFn,
    keepPreviousData: true,
  })

  const prefabs = data?.items ?? []
  const total = data?.total ?? 0

  function setParam(key, value) {
    const p = new URLSearchParams(searchParams)
    if (!value) p.delete(key)
    else p.set(key, value)
    if (key !== 'q') p.delete('q')
    setSearchParams(p)
    setPage(1)
  }

  function handleSearch(e) {
    e.preventDefault()
    const q = e.target.elements.q.value.trim()
    setParam('q', q)
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">
            {query ? `Search: "${query}"` : `Prefabs — ${SORT_LABELS[sort]}`}
          </h1>
          {!query && total > 0 && <p className="text-sm text-[#8b949e] mt-0.5">{total} prefabs</p>}
        </div>
        {query ? (
          <button onClick={() => setParam('q', '')} className="btn-secondary text-sm">
            ✕ Clear search
          </button>
        ) : (
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              name="q"
              placeholder="Search prefabs…"
              className="input text-sm px-3 py-1.5 w-44"
            />
            <button type="submit" className="btn-secondary text-sm">Search</button>
          </form>
        )}
      </div>

      {/* Tag filter — hidden while searching */}
      {!query && (
        <div className="flex flex-wrap items-center gap-1.5 mb-6">
          <span className="text-xs text-[#8b949e] w-14 shrink-0">Tag</span>
          <button
            onClick={() => setParam('tag', '')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              !tag ? 'bg-accent text-white' : 'text-[#8b949e] hover:text-[#cdd9e5] hover:bg-surface-3'
            }`}
          >
            All
          </button>
          {PREFAB_TAGS.map((t) => (
            <button
              key={t}
              onClick={() => setParam('tag', tag === t ? '' : t)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                tag === t
                  ? 'bg-accent text-white'
                  : 'text-[#8b949e] hover:text-[#cdd9e5] hover:bg-surface-3'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {isError && <ErrorMessage message="Failed to load prefabs." />}

      {isLoading ? (
        <CardGrid>{Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}</CardGrid>
      ) : prefabs.length === 0 ? (
        <EmptyState message={query ? `No prefabs found for "${query}"` : 'No prefabs found.'} />
      ) : (
        <>
          <CardGrid>{prefabs.map((p) => <PrefabCard key={p.id} prefab={p} />)}</CardGrid>
          <Pagination page={page} total={total} size={PAGE_SIZE} onChange={(p) => { setPage(p); window.scrollTo(0, 0) }} />
        </>
      )}
    </div>
  )
}
