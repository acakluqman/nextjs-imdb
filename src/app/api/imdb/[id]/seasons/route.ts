import { NextResponse } from 'next/server'

/**
 * API Models returned by this route
 */
export interface ApiEpisode {
  id: string
  episodeNumber: number
  title: string
  plot?: string
  image?: string
  airDate?: string
  runtimeMinutes?: number
  rating?: number
  voteCount?: number
}

export interface ApiSeason {
  seasonNumber: number
  episodes: ApiEpisode[]
  episodeCount?: number | null
}

/**
 * Utilities: resolve varied payload shapes and normalize fields
 */
function getResults(json: any): any {
  return json?.results ?? json?.data ?? json?.item ?? json?.title ?? json
}

function toISODate(dateObj?: { year?: number; month?: number; day?: number }): string | undefined {
  if (!dateObj || !dateObj.year || !dateObj.month || !dateObj.day) return undefined
  return `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`
}

function normalizeEpisode(raw: any): ApiEpisode {
  const ratingObj = typeof raw?.rating === 'object' && raw?.rating !== null ? raw.rating : undefined
  const releaseDate = raw?.releaseDate ?? raw?.airDate
  const runtimeMinutes =
    typeof raw?.runtimeSeconds === 'number'
      ? Math.round(raw.runtimeSeconds / 60)
      : typeof raw?.runtime?.minutes === 'number'
      ? raw.runtime.minutes
      : undefined

  return {
    id: raw?.id ?? '',
    episodeNumber:
      typeof raw?.episodeNumber === 'number'
        ? raw.episodeNumber
        : typeof raw?.episode === 'number'
        ? raw.episode
        : typeof raw?.index === 'number'
        ? raw.index
        : 0,
    title: raw?.title?.title ?? raw?.titleText?.text ?? raw?.primaryTitle ?? 'Untitled',
    plot:
      typeof raw?.plot === 'string'
        ? raw.plot
        : raw?.plot?.plotText?.plainText ?? undefined,
    image: raw?.primaryImage?.url ?? raw?.image ?? undefined,
    airDate: toISODate(releaseDate),
    runtimeMinutes,
    rating:
      typeof raw?.rating === 'number'
        ? raw.rating
        : typeof raw?.ratingsSummary?.aggregateRating === 'number'
        ? raw.ratingsSummary.aggregateRating
        : typeof ratingObj?.aggregateRating === 'number'
        ? ratingObj.aggregateRating
        : undefined,
    voteCount:
      typeof raw?.voteCount === 'number'
        ? raw.voteCount
        : typeof raw?.ratingsSummary?.voteCount === 'number'
        ? raw.ratingsSummary.voteCount
        : typeof ratingObj?.voteCount === 'number'
        ? ratingObj.voteCount
        : undefined,
  }
}

/**
 * GET handler (no query parameters, no pagination):
 * - Returns all seasons with their episodes for a given title id:
 *   { seasons: Array<{ seasonNumber: number, episodes: ApiEpisode[], episodeCount: number | null }> }
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  const baseUrl = process.env.NEXT_PUBLIC_API_URL
  if (!baseUrl) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is not defined' },
      { status: 500 }
    )
  }

  try {
    // Fetch all episodes once, then group by season. No query params, no pagination.
    const episodesRes = await fetch(`${baseUrl}/titles/${encodeURIComponent(id)}/episodes`, {
      cache: 'no-store',
    })

    if (!episodesRes.ok) {
      const text = await episodesRes.text().catch(() => '')
      // 404 -> empty seasons for graceful UI
      if (episodesRes.status === 404) {
        return NextResponse.json({ seasons: [] as ApiSeason[] }, { status: 200 })
      }
      throw new Error(`HTTP ${episodesRes.status} ${episodesRes.statusText} ${text}`)
    }

    const episodesJson = await episodesRes.json()
    const list = getResults(episodesJson)
    const rawEpisodes: any[] = Array.isArray(list) ? list : []

    // Group normalized episodes by season number
    const bySeason = new Map<number, ApiEpisode[]>()

    for (const e of rawEpisodes) {
      const sn =
        typeof e?.seasonNumber === 'number'
          ? e.seasonNumber
          : typeof e?.season === 'number'
          ? e.season
          : typeof e?.season === 'string'
          ? Number(e.season)
          : typeof e?.seasonIndex === 'number'
          ? e.seasonIndex
          : 0

      if (!sn || sn <= 0 || !Number.isFinite(sn)) continue

      const normalized = normalizeEpisode(e)
      if (!normalized.id) continue

      const bucket = bySeason.get(sn)
      if (bucket) {
        bucket.push(normalized)
      } else {
        bySeason.set(sn, [normalized])
      }
    }

    const seasons: ApiSeason[] = Array.from(bySeason.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([seasonNumber, episodes]) => ({
        seasonNumber,
        episodes,
        episodeCount: episodes.length,
      }))

    return NextResponse.json({ seasons }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'Unknown error' },
      { status: 500 }
    )
  }
}