import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMapsNewest, getMapsDownloaded, getMapsOldest, getMapsPopular, searchMaps, getTags } from '../api'
import { MapCard, CardGrid, SkeletonCard, ErrorMessage, EmptyState } from '../components/ContentCard'
import Pagination from '../components/Pagination'
import FeaturedBanner from '../components/FeaturedBanner'

const VERSION_OPTIONS = [
  { label: 'All Versions', value: '' },
  { label: '0.7.X', value: '0.7' },
  { label: '0.6.1', value: '0.6.1' },
  { label: '0.5.1', value: '0.5.1' },
]

const DEFAULT_MAP_TAGS = ['Slayer', 'Infection', 'Race', 'Puzzle', 'KOTH', 'CTF', 'Assault', 'Territories', 'Oddball', 'Juggernaut', 'VIP', 'Mini Games']

const SORT_LABELS = {
  newest: 'Newest',
  downloaded: 'Most Downloaded',
  popular: 'Popular',
  oldest: 'Oldest',
}

const PAGE_SIZE = 21

export default function MapsPage({ sort = 'newest' }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const version = searchParams.get('version') || ''
  const tag = searchParams.get('tag') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

  useEffect(() => {
    // No automatic page reset here. URL may provide page deep-link value.
  }, [sort, query, version, tag])

  function fetchFn() {
    if (query) return searchMaps(query, page, PAGE_SIZE)
    if (sort === 'downloaded') return getMapsDownloaded(page, PAGE_SIZE, tag, version)
    if (sort === 'oldest') return getMapsOldest(page, PAGE_SIZE, tag, version)
    if (sort === 'popular') return getMapsPopular(page, PAGE_SIZE, tag, version)
    return getMapsNewest(page, PAGE_SIZE, tag, version)
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['maps', sort, query, version, tag, page],
    queryFn: fetchFn,
    keepPreviousData: true,
  })

  const maps = data?.items ?? []
  const total = data?.total ?? 0

  const { data: tagsData } = useQuery({ queryKey: ['tags'], queryFn: getTags, staleTime: 60_000 })
  const availableMapTags = tagsData?.map_tags ?? DEFAULT_MAP_TAGS

  function setParam(key, value) {
    const p = new URLSearchParams(searchParams)
    if (!value) p.delete(key)
    else p.set(key, value)
    if (key !== 'q') p.delete('q')
    p.delete('page')
    setSearchParams(p)
  }

  function goToPage(newPage) {
    const p = new URLSearchParams(searchParams)
    if (newPage <= 1) p.delete('page')
    else p.set('page', String(newPage))
    setSearchParams(p)
    window.scrollTo(0, 0)
  }

  const hasFilters = !!(tag || version)

  return (
    <div>
      {/* Header + filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[#e6edf3]">
            {query ? `Search: "${query}"` : `Maps — ${SORT_LABELS[sort]}`}
          </h1>
          {!query && total > 0 && (
            <p className="text-sm text-[#8b949e] mt-0.5">{total.toLocaleString()} maps</p>
          )}
        </div>

        {query ? (
          <button onClick={() => setParam('q', '')} className="btn-secondary text-sm">
            ✕ Clear search
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={version}
              onChange={(e) => setParam('version', e.target.value)}
              className="select"
            >
              {VERSION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={tag}
              onChange={(e) => setParam('tag', e.target.value)}
              className="select"
            >
              <option value="">All Tags</option>
              {availableMapTags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {hasFilters && (
              <button
                onClick={() => { setParam('version', ''); setParam('tag', '') }}
                className="text-xs text-[#8b949e] hover:text-[#cdd9e5] transition-colors"
              >
                ✕ Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Featured banner — only on newest sort with no active filters */}
      {!query && !tag && !version && sort === 'newest' && page === 1 && (
        <FeaturedBanner type="maps" />
      )}

      {isError && <ErrorMessage message="Failed to load maps." />}

      {isLoading ? (
        <CardGrid>
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </CardGrid>
      ) : maps.length === 0 ? (
        <EmptyState message={query ? `No maps found for "${query}"` : 'No maps found.'} />
      ) : (
        <>
          <CardGrid>
            {maps.map((m) => <MapCard key={m.id} map={m} />)}
          </CardGrid>
          <Pagination page={page} total={total} size={PAGE_SIZE} onChange={goToPage} />
        </>
      )}
    </div>
  )
}
