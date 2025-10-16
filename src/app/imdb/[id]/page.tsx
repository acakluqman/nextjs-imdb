'use client'

import Image from 'next/image'
import * as React from 'react'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'

import { AppSidebar } from '@/components/app-sidebar'
import { NavActions } from '@/components/nav-actions'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

/**
 * Types
 */
type SeasonId = number | string

type Person = {
  id: string
  displayName?: string
  alternativeNames?: string[]
  primaryImage?: { url?: string; width?: number; height?: number }
  primaryProfessions?: string[]
}

type TitleDetail = {
  id: string
  primaryTitle?: string
  titleText?: { text?: string }
  primaryImage?: { url?: string; caption?: { plainText?: string } }
  image?: string
  startYear?: number
  releaseYear?: { year?: number }
  titleType?: { text?: string }
  plot?: string | { plotText?: { plainText?: string } }
  description?: string
  runtime?: { seconds?: number; minutes?: number }
  runtimeSeconds?: number
  runtimeMinutes?: number
  rating?: { aggregateRating?: number; voteCount?: number }
  genres?: string[]
  directors?: Person[]
  writers?: Person[]
  stars?: Person[]
}

type Episode = {
  id: string
  episodeNumber?: number
  seasonNumber?: number
  titleText?: { text?: string }
  primaryImage?: { url?: string }
  releaseYear?: { year?: number }
  rating?: { value?: number }
  plot?: string
  image?: string
  poster?: string
  runtime?: number
  releaseDate?: string
  // fallback fields for safety
  title?: string
}

type SeasonCacheEntry = {
  items: Episode[]
  nextPageToken?: string | null
  hasMore: boolean
  loading: boolean
  error?: string
  fetchedOnce: boolean
}

/**
 * Helpers
 */
function getResults(json: any): any {
  return json?.results ?? json?.titles ?? json?.data ?? json?.items ?? json
}

function toISODate(dateObj?: { year?: number; month?: number; day?: number } | string): string | undefined {
  if (!dateObj) return undefined
  if (typeof dateObj === 'string') return dateObj
  if (!dateObj.year || !dateObj.month || !dateObj.day) return undefined
  return `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`
}

function formatDateDdMonYyyy(iso?: string): string | undefined {
  if (!iso) return undefined
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  // Example output: 08 Jun 2019
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

function getTitleFromDetail(item: TitleDetail): string {
  return item.primaryTitle ?? item.titleText?.text ?? 'Untitled'
}

function getImageUrlFromDetail(item: TitleDetail): string {
  return item.primaryImage?.url ?? item.image ?? 'https://placehold.co/300x450?text=No+Image+Found&font=roboto'
}

function getYearFromDetail(item: TitleDetail): number | undefined {
  return item.startYear ?? item.releaseYear?.year
}

function getRuntimeMinutesFromDetail(item: TitleDetail | null): number | undefined {
  if (!item) return undefined
  if (typeof item.runtimeMinutes === 'number') return item.runtimeMinutes
  if (typeof item.runtimeSeconds === 'number') return Math.round(item.runtimeSeconds / 60)
  if (typeof item.runtime?.minutes === 'number') return item.runtime.minutes
  if (typeof item.runtime?.seconds === 'number') return Math.round(item.runtime.seconds / 60)
  return undefined
}

function formatRuntimeHhMm(minutes?: number): string | undefined {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) return undefined
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatPeopleList(list?: Person[]): string | undefined {
  if (!Array.isArray(list) || list.length === 0) return undefined
  const names = list.map((p) => p.displayName).filter((n) => typeof n === 'string' && n.trim().length > 0)
  if (names.length === 0) return undefined
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function normalizeEpisode(raw: any): Episode {
  const episodeNumber =
    typeof raw?.episodeNumber === 'number'
      ? raw.episodeNumber
      : typeof raw?.episode === 'number'
      ? raw.episode
      : typeof raw?.index === 'number'
      ? raw.index
      : undefined

  const seasonNumber =
    typeof raw?.seasonNumber === 'number'
      ? raw.seasonNumber
      : typeof raw?.season === 'number'
      ? raw.season
      : typeof raw?.season === 'string'
      ? Number(raw.season)
      : typeof raw?.seasonIndex === 'number'
      ? raw.seasonIndex
      : undefined

  const titleText: { text?: string } | undefined =
    raw?.titleText ??
    (raw?.title
      ? { text: (typeof raw.title === 'object' ? raw.title?.title : raw.title) ?? undefined }
      : undefined)

  const primaryImage: { url?: string } | undefined =
    raw?.primaryImage ?? (raw?.image ? { url: raw.image } : undefined)

  const releaseYear = raw?.releaseYear
  const rating = raw?.rating
  const plot =
    typeof raw?.plot === 'string'
      ? raw.plot
      : raw?.plot?.plotText?.plainText ?? raw?.summary ?? undefined

  const runtime =
    typeof raw?.runtimeMinutes === 'number'
      ? raw.runtimeMinutes
      : typeof raw?.runtimeSeconds === 'number'
      ? Math.round(raw.runtimeSeconds / 60)
      : typeof raw?.runtime === 'number'
      ? raw.runtime
      : typeof raw?.runtime?.minutes === 'number'
      ? raw.runtime.minutes
      : undefined

  const releaseDate = raw?.releaseDate ?? raw?.airDate

  return {
    id: raw?.id ?? '',
    episodeNumber,
    seasonNumber,
    titleText,
    primaryImage,
    releaseYear,
    rating,
    plot,
    image: raw?.image,
    poster: raw?.poster,
    runtime,
    releaseDate: typeof releaseDate === 'string' ? releaseDate : toISODate(releaseDate),
    title: raw?.primaryTitle ?? raw?.originalTitle ?? raw?.name,
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...(init ?? {}) })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`)
  }
  return res.json() as Promise<T>
}

/**
 * Constants
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.imdbapi.dev').replace(/\/+$/, '')
const EPISODES_PAGE_SIZE = 12

/**
 * Page Component
 */
export default function Page() {
  const { id } = useParams() as { id?: string }
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [detail, setDetail] = React.useState<TitleDetail | null>(null)
  const [detailLoading, setDetailLoading] = React.useState(false)
  const [detailError, setDetailError] = React.useState<string | null>(null)

  const [seasons, setSeasons] = React.useState<SeasonId[]>([])
  const [seasonsLoading, setSeasonsLoading] = React.useState(false)
  const [seasonsError, setSeasonsError] = React.useState<string | null>(null)

  const [activeSeason, setActiveSeason] = React.useState<SeasonId | null>(null)
  const [seasonCache, setSeasonCache] = React.useState<Map<SeasonId, SeasonCacheEntry>>(new Map())

  const detailAbortRef = React.useRef<AbortController | null>(null)
  const seasonsAbortRef = React.useRef<AbortController | null>(null)
  const episodesAbortRef = React.useRef<AbortController | null>(null)
  const mountedRef = React.useRef(true)
  const inFlightRef = React.useRef<Set<string>>(new Set())
  const cacheRef = React.useRef<Map<SeasonId, SeasonCacheEntry>>(new Map())

  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      detailAbortRef.current?.abort()
      seasonsAbortRef.current?.abort()
      episodesAbortRef.current?.abort()
    }
  }, [])

  // Reset on id change
  React.useEffect(() => {
    if (!id) return
    // Abort any ongoing
    detailAbortRef.current?.abort()
    seasonsAbortRef.current?.abort()
    episodesAbortRef.current?.abort()

    setDetail(null)
    setDetailLoading(true)
    setDetailError(null)

    setSeasons([])
    setSeasonsLoading(true)
    setSeasonsError(null)

    setActiveSeason(null)
    setSeasonCache(new Map())

    void fetchDetail(id)
  }, [id])

  // When seasons loaded, set activeSeason once from query or first available.
  // Guard to avoid overriding user tab selection before searchParams updates.
  React.useEffect(() => {
    if (seasons.length === 0) return
    if (activeSeason != null) return
    const fromQueryRaw = searchParams.get('season')
    const fromQueryNum = fromQueryRaw != null ? Number(fromQueryRaw) : NaN
    const fromQuery: SeasonId =
      Number.isFinite(fromQueryNum) && seasons.some((s) => String(s) === String(fromQueryNum))
        ? fromQueryNum
        : seasons.find((s) => String(s) === String(fromQueryRaw)) ?? seasons[0]
  
    setActiveSeason(fromQuery)
    replaceSeasonInUrl(fromQuery)
  }, [seasons, searchParams, activeSeason])

  // Lazy fetch episodes only for active season (single-shot; dedupe handled inside fetchSeasonEpisodes)
  React.useEffect(() => {
    if (!id || activeSeason == null) return
    const entry = cacheRef.current.get(activeSeason)
    if (entry?.fetchedOnce || entry?.loading) return
    void fetchSeasonEpisodes(activeSeason, null)
  }, [id, activeSeason])

  async function fetchDetail(titleId: string) {
    try {
      const ac = new AbortController()
      detailAbortRef.current = ac

      const json = await fetchJson<any>(`${API_BASE}/titles/${encodeURIComponent(titleId)}`, {
        signal: ac.signal,
      })
      const data = getResults(json) as TitleDetail
      if (!mountedRef.current) return
      setDetail(data ?? null)
      setDetailLoading(false)
      // After detail, load seasons list
      void fetchSeasons(titleId)
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      if (!mountedRef.current) return
      setDetailError(e?.message ?? 'Failed to fetch title detail')
      setDetailLoading(false)
      setSeasonsLoading(false)
    }
  }

  async function fetchSeasons(titleId: string) {
    try {
      setSeasonsLoading(true)
      setSeasonsError(null)

      const ac = new AbortController()
      seasonsAbortRef.current = ac

      const json = await fetchJson<any>(`${API_BASE}/titles/${encodeURIComponent(titleId)}/seasons`, {
        signal: ac.signal,
      })
      const data = getResults(json)

      // Extract list of season ids from various possible shapes
      let list: SeasonId[] = []
      if (Array.isArray(data)) {
        list = data
          .map((s: any) => {
            if (typeof s === 'number' || typeof s === 'string') return s
            const sn =
              typeof s?.seasonNumber === 'number'
                ? s.seasonNumber
                : typeof s?.season === 'number'
                ? s.season
                : typeof s?.season === 'string'
                ? Number(s.season)
                : typeof s?.index === 'number'
                ? s.index
                : undefined
            return sn ?? s?.seasonId ?? null
          })
          .filter((x: any) => x != null)
      } else if (Array.isArray(data?.seasons)) {
        list = data.seasons
          .map((s: any) => {
            const sn =
              typeof s?.seasonNumber === 'number'
                ? s.seasonNumber
                : typeof s?.season === 'number'
                ? s.season
                : typeof s?.season === 'string'
                ? Number(s.season)
                : typeof s?.index === 'number'
                ? s.index
                : undefined
            return sn ?? s?.seasonId ?? null
          })
          .filter((x: any) => x != null)
      }

      // Sort numerically when possible
      list = list.sort((a, b) => Number(a) - Number(b))

      // Initialize cache entries (not initialized)
      const nextCache = new Map<SeasonId, SeasonCacheEntry>(seasonCache)
      for (const sn of list) {
        if (!nextCache.has(sn)) {
          nextCache.set(sn, {
            items: [],
            nextPageToken: null,
            hasMore: true,
            loading: false,
            error: undefined,
            fetchedOnce: false,
          })
        }
      }

      if (!mountedRef.current) return
      setSeasons(list)
      setSeasonCache(nextCache)
      cacheRef.current = nextCache
      setSeasonsLoading(false)
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      if (!mountedRef.current) return
      setSeasonsError(e?.message ?? 'Failed to fetch seasons')
      setSeasonsLoading(false)
    }
  }

  async function fetchSeasonEpisodes(seasonId: SeasonId, pageToken: string | null = null) {
    if (!id) return
    const key = `${id}:${String(seasonId)}:${pageToken ?? ''}`
    if (inFlightRef.current.has(key)) return
    inFlightRef.current.add(key)
    try {
      // Abort any ongoing episodes fetch
      episodesAbortRef.current?.abort()
      const ac = new AbortController()
      episodesAbortRef.current = ac

      // mark loading
      setSeasonCache((prev) => {
        const next = new Map(prev)
        const current = next.get(seasonId) ?? {
          items: [],
          nextPageToken: null,
          hasMore: true,
          loading: false,
          error: undefined,
          fetchedOnce: false,
        }
        next.set(seasonId, { ...current, loading: true, error: undefined })
        cacheRef.current = next
        return next
      })

      const qs = new URLSearchParams()
      qs.set('season', String(seasonId))
      qs.set('pageSize', String(EPISODES_PAGE_SIZE))
      if (pageToken) qs.set('pageToken', pageToken)

      const json = await fetchJson<any>(
        `${API_BASE}/titles/${encodeURIComponent(id)}/episodes?${qs.toString()}`,
        { signal: ac.signal }
      )
      const rawItems = Array.isArray(json?.episodes) ? json.episodes : getResults(json)
      const nextToken: string | null =
        (json?.nextPageToken as string | undefined) ??
        (json?.pageToken as string | undefined) ??
        (json?.data?.nextPageToken as string | undefined) ??
        (json?.episodes?.nextPageToken as string | undefined) ??
        (json?.pageInfo?.nextPageToken as string | undefined) ??
        null

      const normalized: Episode[] = Array.isArray(rawItems)
        ? rawItems
            .map((e: any) => {
              const ne = normalizeEpisode(e)
              if (typeof ne.seasonNumber !== 'number') {
                ne.seasonNumber = Number(String(seasonId))
              }
              if (typeof ne.episodeNumber !== 'number' && typeof e?.episodeNumber === 'number') {
                ne.episodeNumber = e.episodeNumber
              }
              return ne
            })
            .filter((e) => !!e.id)
        : []

      if (!mountedRef.current) return
      setSeasonCache((prev) => {
        const next = new Map(prev)
        const prevEntry = next.get(seasonId)
        const prevItems = prevEntry?.items ?? []
        next.set(seasonId, {
          items: prevItems.concat(normalized),
          loading: false,
          error: undefined,
          nextPageToken: nextToken,
          hasMore: Boolean(nextToken),
          fetchedOnce: true,
        })
        cacheRef.current = next
        return next
      })
      inFlightRef.current.delete(key)
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      if (!mountedRef.current) return
      setSeasonCache((prev) => {
        const next = new Map(prev)
        const prevEntry = next.get(seasonId)
        next.set(seasonId, {
          items: prevEntry?.items ?? [],
          loading: false,
          error: e?.message ?? 'Failed to fetch episodes',
          nextPageToken: prevEntry?.nextPageToken ?? null,
          hasMore: Boolean(prevEntry?.nextPageToken),
          fetchedOnce: prevEntry?.fetchedOnce ?? false,
        })
        cacheRef.current = next
        return next
      })
      inFlightRef.current.delete(key)
    }
  }

  function replaceSeasonInUrl(seasonId: SeasonId) {
    const sp = new URLSearchParams(searchParams.toString())
    if (seasonId != null) {
      sp.set('season', String(seasonId))
    } else {
      sp.delete('season')
    }
    const url = `${pathname}?${sp.toString()}`
    router.replace(url, { scroll: false })
  }

  function onTabChange(value: string) {
    const target = seasons.find((s) => String(s) === value)
    if (target == null) return
    if (String(activeSeason) === String(target)) return
    setActiveSeason(target)
    replaceSeasonInUrl(target)
    const entry = cacheRef.current.get(target)
    if (!entry?.fetchedOnce && !entry?.loading) {
      void fetchSeasonEpisodes(target, null)
    }
  }

  function onRetryDetail() {
    if (id) {
      detailAbortRef.current?.abort()
      seasonsAbortRef.current?.abort()
      episodesAbortRef.current?.abort()
      setDetailError(null)
      setSeasonsError(null)
      setSeasons([])
      setSeasonCache(new Map())
      setActiveSeason(null)
      setDetailLoading(true)
      setSeasonsLoading(true)
      void fetchDetail(id)
    }
  }

  function onRetrySeasons() {
    if (id) {
      seasonsAbortRef.current?.abort()
      setSeasonsError(null)
      setSeasons([])
      setSeasonsLoading(true)
      void fetchSeasons(id)
    }
  }

  function onRetrySeasonEpisodes(seasonId: SeasonId) {
    if (!id) return
    // Preserve existing items; just refetch first/next page depending on cache state
    const entry = seasonCache.get(seasonId)
    void fetchSeasonEpisodes(seasonId, entry?.nextPageToken ?? null)
  }

  const titleText = detail ? getTitleFromDetail(detail) : 'Title'
  const year = detail ? getYearFromDetail(detail) : undefined
  const posterUrl = detail ? getImageUrlFromDetail(detail) : 'https://placehold.co/300x450?text=No+Image+Found&font=roboto'

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">IMDb</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage aria-live="polite">
                  {detailLoading ? (
                    <span className="text-muted-foreground">Loading...</span>
                  ) : (
                    <span className="text-muted-foreground">{titleText}</span>
                  )}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto px-3">
            <NavActions />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Error for detail */}
          {detailError && (
            <div className="bg-destructive/10 text-destructive border-destructive rounded-md border px-3 py-2 text-sm flex items-center justify-between">
              <span>{detailError}</span>
              <Button variant="outline" size="sm" onClick={onRetryDetail} disabled={detailLoading || seasonsLoading}>
                Retry
              </Button>
            </div>
          )}

          {/* Header detail or skeleton */}
          {detailLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-busy="true">
              <div className="rounded-sm border overflow-hidden">
                <Skeleton className="aspect-[2/3] w-full" />
              </div>
              <div className="md:col-span-2 space-y-3">
                {/* Title */}
                <Skeleton className="h-8 w-2/3" />
                {/* Year • Runtime • Rating */}
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-4 w-12" />
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                {/* Plot */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                </div>

                {/* Directors / Writers / Stars */}
                <div className="pt-2 space-y-3">
                  <div>
                    <Skeleton className="h-4 w-24" />
                    <div className="mt-1">
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>

                  <div>
                    <Skeleton className="h-4 w-16" />
                    <div className="mt-1">
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>

                  <div>
                    <Skeleton className="h-4 w-14" />
                    <div className="mt-1">
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                </div>
                
                {/* Genres badges */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-14 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            </div>
          ) : detail ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-sm border overflow-hidden">
                <Image
                  src={posterUrl}
                  alt={titleText}
                  width={500}
                  height={750}
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  className="w-full aspect-[2/3] object-cover"
                  priority
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <h1 className="text-2xl font-semibold leading-tight">{titleText}</h1>
                {(() => {
                  const runtimeMin = getRuntimeMinutesFromDetail(detail)
                  const runtimeStr = formatRuntimeHhMm(runtimeMin)
                  const agg = detail?.rating?.aggregateRating
                  const votes = detail?.rating?.voteCount
                  const showYear = typeof year === 'number'
                  const showRuntime = !!runtimeStr
                  const showRating = typeof agg === 'number'
                  if (!showYear && !showRuntime && !showRating) return null
                  return (
                    <div
                      className="flex items-center gap-3 text-muted-foreground text-sm"
                      aria-label="Release year, runtime, and rating"
                    >
                      {showYear ? <div>{year}</div> : null}
                      {showRuntime ? <div>{runtimeStr}</div> : null}
                      {showRating ? (
                        <div className="flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            className="w-4 h-4 text-yellow-500 fill-current"
                          >
                            <path d="M12 .587l3.668 7.431L24 9.748l-6 5.848 1.417 8.267L12 19.771 4.583 23.863 6 15.596 0 9.748l8.332-1.73z" />
                          </svg>
                          <span>
                            {agg!.toFixed(1)}/10
                            {typeof votes === 'number'
                              ? ` (${new Intl.NumberFormat('en-US').format(votes)} votes)`
                              : ''}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )
                })()}
                {/* Plot/Description */}
                {(() => {
                  const p =
                    typeof detail.plot === 'string'
                      ? detail.plot
                      : detail.plot && typeof detail.plot === 'object'
                      ? detail.plot.plotText?.plainText
                      : detail.description

                  const directorsStr = formatPeopleList(detail?.directors)
                  const writersStr = formatPeopleList(detail?.writers)
                  const starsStr = formatPeopleList(detail?.stars)

                  return (
                    <>
                      {p ? <p className="text-sm leading-relaxed">{p}</p> : null}

                      {directorsStr ? (
                        <div className="mt-4">
                          <p className="text-sm font-semibold">Directors:</p>
                          <p className="text-sm text-muted-foreground">{directorsStr}</p>
                        </div>
                      ) : null}

                      {writersStr ? (
                        <div>
                          <p className="text-sm font-semibold">Writers:</p>
                          <p className="text-sm text-muted-foreground">{writersStr}</p>
                        </div>
                      ) : null}

                      {starsStr ? (
                        <div>
                          <p className="text-sm font-semibold">Stars:</p>
                          <p className="text-sm text-muted-foreground">{starsStr}</p>
                        </div>
                      ) : null}

                      {Array.isArray(detail?.genres) && detail.genres.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {detail.genres.map((genre) => (
                            <Badge key={genre} variant="secondary">{genre}</Badge>
                          ))}
                        </div>
                      ) : null}
                    </>
                  )
                })()}
              </div>
            </div>
          ) : null}

          {/* Seasons and Episodes */}
          {seasonsError && (
            <div className="bg-destructive/10 text-destructive border-destructive rounded-md border px-3 py-2 text-sm flex items-center justify-between">
              <span>{seasonsError}</span>
              <Button variant="outline" size="sm" onClick={onRetrySeasons} disabled={seasonsLoading}>
                Retry
              </Button>
            </div>
          )}

          {seasonsLoading ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-10 w-full" />
            </div>
          ) : seasons.length > 0 ? (
            <Tabs value={String(activeSeason ?? seasons[0] ?? '')} onValueChange={onTabChange}>
              <div className="overflow-x-auto">
                <TabsList className="min-w-full">
                  {seasons.map((s) => (
                    <TabsTrigger key={String(s)} value={String(s)}>
                      Season {String(s)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {seasons.map((s) => {
                const entry = seasonCache.get(s)
                const isActive = String(activeSeason) === String(s)
                const items = entry?.items ?? []
                const loading = !!entry?.loading
                const error = entry?.error
                const nextToken = entry?.nextPageToken ?? null
                const hasMore = entry?.hasMore ?? Boolean(nextToken)

                return (
                  <TabsContent key={String(s)} value={String(s)} className="mt-4">
                    {error ? (
                      <div className="bg-destructive/10 text-destructive border-destructive rounded-md border px-3 py-2 text-sm flex items-center justify-between">
                        <span>{error}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRetrySeasonEpisodes(s)}
                          disabled={loading}
                        >
                          Retry
                        </Button>
                      </div>
                    ) : null}

                    {(() => {
                      const initialLoading = loading && items.length === 0
                      const loadingMore = loading && items.length > 0

                      if (initialLoading && isActive) {
                        return (
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4" aria-busy="true">
                            {Array.from({ length: 12 }).map((_, i) => (
                              <div key={`ep-skel-${String(s)}-${i}`} className="rounded-xl border overflow-hidden">
                                <Skeleton className="aspect-[16/9] w-full" />
                                <div className="p-2 space-y-2">
                                  <Skeleton className="h-4 w-3/4" />
                                  <Skeleton className="h-3 w-1/2" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      }

                      if (items.length === 0) {
                        return (
                          <div className="text-sm text-muted-foreground py-8 text-center" aria-live="polite">
                            Belum ada episode untuk season ini.
                          </div>
                        )
                      }

                      return (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {items.map((ep) => (
                              <Card key={ep.id} className="p-0 overflow-hidden">
                                <div className="relative">
                                  <Image
                                    src={ep.primaryImage?.url ?? ep.image ?? ep.poster ?? 'https://placehold.co/480x270?text=No+Image&font=roboto'}
                                    alt={ep.titleText?.text ?? ep.title ?? 'Episode thumbnail'}
                                    width={480}
                                    height={270}
                                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                                    className="w-full aspect-video object-cover"
                                    loading="lazy"
                                  />
                                  <CardContent className="px-3 py-2">
                                    <CardTitle className="text-sm ellipsis whitespace-nowrap overflow-hidden">
                                      {typeof ep.seasonNumber === 'number' ? `S${ep.seasonNumber}` : ''}
                                      {typeof ep.episodeNumber === 'number' ? `E${ep.episodeNumber} • ` : ep.seasonNumber ? ' • ' : ''}
                                      {ep.titleText?.text ?? ep.title ?? 'Untitled'}
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-1 space-x-2">
                                      {ep.releaseDate ? <span>{formatDateDdMonYyyy(ep.releaseDate)}</span> : null}
                                      {typeof ep.runtime === 'number' ? <span>{ep.runtime}m</span> : null}
                                    </CardDescription>
                                  </CardContent>
                                </div>
                              </Card>
                            ))}
                          </div>

                          {loadingMore ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4" aria-busy="true">
                              {Array.from({ length: 6 }).map((_, i) => (
                                <div key={`ep-skel-more-${String(s)}-${i}`} className="rounded-sm border overflow-hidden">
                                  <Skeleton className="aspect-[16/9] w-full" />
                                  <div className="p-2 space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {hasMore ? (
                            <div className="flex justify-center mt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchSeasonEpisodes(s, nextToken)}
                                disabled={loading}
                              >
                                Load more
                              </Button>
                            </div>
                          ) : null}
                        </>
                      )
                    })()}
                  </TabsContent>
                )
              })}
            </Tabs>
          ) : null}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}