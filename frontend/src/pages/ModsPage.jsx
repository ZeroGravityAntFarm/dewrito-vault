import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getModsNewest, getModsOldest, getModsDownloaded, getModsPopular, searchMods, getTags } from '../api'
import { ModCard, CardGrid, SkeletonCard, ErrorMessage, EmptyState } from '../components/ContentCard'
import Pagination from '../components/Pagination'
import FeaturedBanner from '../components/FeaturedBanner'

const DEFAULT_MOD_TAGS = ['Skins', 'Audio', 'HUD', 'Vehicles', 'Weapons', 'Gameplay', 'Maps', 'UI', 'Cosmetic']

const MOD_VERSIONS = ['0.7.0', '0.7.1', '0.7.2', '0.6.1', '0.5.1']

const SORT_LABELS = { newest: 'Newest', downloaded: 'Most Downloaded', popular: 'Popular', oldest: 'Oldest' }

const PAGE_SIZE = 21

export default function ModsPage({ sort = 'newest' }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const tag = searchParams.get('tag') || ''
  const version = searchParams.get('version') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

  useEffect(() => {
    // No automatic page reset here. Use setParam() to reset page on filter changes.
  }, [sort, query, tag, version])

  function fetchFn() {
    if (query) return searchMods(query, page, PAGE_SIZE)
    if (sort === 'oldest') return getModsOldest(page, PAGE_SIZE, tag, version)
    if (sort === 'downloaded') return getModsDownloaded(page, PAGE_SIZE, tag, version)
    if (sort === 'popular') return getModsPopular(page, PAGE_SIZE, tag, version)
    return getModsNewest(page, PAGE_SIZE, tag, version)
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['mods', sort, query, tag, version, page],
    queryFn: fetchFn,
    keepPreviousData: true,
  })

  const mods = data?.items ?? []
  const total = data?.total ?? 0

  const { data: tagsData } = useQuery({ queryKey: ['tags'], queryFn: getTags, staleTime: 60_000 })
  const availableModTags = tagsData?.mod_tags ?? DEFAULT_MOD_TAGS

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
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[#e6edf3]">
            {query ? `Search: "${query}"` : `Mods — ${SORT_LABELS[sort]}`}
          </h1>
          {!query && total > 0 && (
            <p className="text-sm text-[#8b949e] mt-0.5">{total.toLocaleString()} mods</p>
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
              <option value="">All Versions</option>
              {MOD_VERSIONS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            <select
              value={tag}
              onChange={(e) => setParam('tag', e.target.value)}
              className="select"
            >
              <option value="">All Tags</option>
              {availableModTags.map((t) => (
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

      {!query && !tag && sort === 'newest' && page === 1 && (
        <FeaturedBanner type="mods" />
      )}

      {isError && <ErrorMessage message="Failed to load mods." />}

      {isLoading ? (
        <CardGrid>{Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}</CardGrid>
      ) : mods.length === 0 ? (
        <EmptyState message={query ? `No mods found for "${query}"` : 'No mods found.'} />
      ) : (
        <>
          <CardGrid>{mods.map((m) => <ModCard key={m.id} mod={m} />)}</CardGrid>
          <Pagination page={page} total={total} size={PAGE_SIZE} onChange={goToPage} />
        </>
      )}
    </div>
  )
}
