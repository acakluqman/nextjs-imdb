'use client'

import { Plus } from 'lucide-react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import useInfiniteScroll from '@/hooks/use-infinite-scroll'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Imdb = {
  id?: string
  primaryTitle?: string
  titleText?: { text?: string }
  primaryImage?: { url?: string; caption?: { plainText?: string } }
  image?: string
  startYear?: number
  releaseYear?: { year?: number }
  rating?: { aggregateRating?: number; voteCount?: number }
}

const TYPE_MAP: Record<string, string> = {
  movie: 'Movie',
  tvSeries: 'TV Series',
  tvMiniSeries: 'TV Mini Series',
  tvSpecial: 'TV Special',
  tvMovie: 'TV Movie',
  short: 'Short',
  video: 'Video',
  videoGame: 'Video Game',
}

const TYPE_CODE_MAP: Record<string, string> = {
  movie: 'MOVIE',
  tvSeries: 'TV_SERIES',
  tvMiniSeries: 'TV_MINI_SERIES',
  tvSpecial: 'TV_SPECIAL',
  tvMovie: 'TV_MOVIE',
  short: 'SHORT',
  video: 'VIDEO',
  videoGame: 'VIDEO_GAME',
}

function parseTypeCode(input: string): string | undefined {
  return TYPE_CODE_MAP[input]
}

function getTitle(item: Imdb) {
  return item.primaryTitle ?? item.titleText?.text ?? 'Untitled'
}

function getImageUrl(item: Imdb) {
  return (
    item.primaryImage?.url ??
    item.image ??
    'https://placehold.co/300x450?text=No+Image+Found&font=roboto'
  )
}

function getYear(item: Imdb) {
  return item.startYear ?? item.releaseYear?.year
}

export default function Page() {
  const searchParams = useSearchParams()
  const rawType = (searchParams.get('type') ?? 'movie').trim()
  const typeCode = parseTypeCode(rawType) ?? 'MOVIE'
  const selectedType = TYPE_MAP[rawType] ?? 'Movie'

  const SORT_BY_OPTIONS = [
    'SORT_BY_POPULARITY',
    'SORT_BY_RELEASE_DATE',
    'SORT_BY_USER_RATING',
    'SORT_BY_USER_RATING_COUNT',
    'SORT_BY_YEAR',
  ] as const
  type SortBy = (typeof SORT_BY_OPTIONS)[number]
  const SORT_ORDER_OPTIONS = ['ASC', 'DESC'] as const
  type SortOrder = (typeof SORT_ORDER_OPTIONS)[number]

  const [sortBy, setSortBy] = React.useState<SortBy>('SORT_BY_POPULARITY')
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('ASC')

  const fetchTitles = React.useCallback(
    async (pageParam: string | null) => {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/titles?types=${encodeURIComponent(
        typeCode
      )}&endYear=${new Date().getFullYear()}&sortBy=${sortBy}&sortOrder=${sortOrder}${pageParam ? `&pageToken=${pageParam}` : ''}`

      const res = await fetch(url)
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`)
      }
      const json = await res.json()
      const results = json?.results ?? json?.titles ?? json?.data ?? json?.items ?? []
      const nextPageToken = json?.nextPageToken ?? null
      return { data: Array.isArray(results) ? results : [], nextPageToken }
    },
    [typeCode, sortBy, sortOrder]
  )

  const {
    data: items,
    loading,
    error,
    hasMore,
    fetchData,
  } = useInfiniteScroll<Imdb>({
    fetchFunction: fetchTitles,
    initialPageParam: null,
  })

  const observerTarget = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!observerTarget.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchData()
        }
      },
      { threshold: 1 }
    )

    observer.observe(observerTarget.current)

    return () => {
      observer.disconnect()
    }
  }, [fetchData, hasMore, loading])

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
                <BreadcrumbPage>
                  <span className="text-muted-foreground">{selectedType}</span>
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto px-3">
            <NavActions />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          {error && (
            <div className="bg-destructive/10 text-destructive border-destructive rounded-md border px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="cursor-pointer" aria-label="Select sort by">
                    {`Sort by: ${
                      sortBy === 'SORT_BY_POPULARITY'
                        ? 'Popularity'
                        : sortBy === 'SORT_BY_RELEASE_DATE'
                          ? 'Release Date'
                          : sortBy === 'SORT_BY_USER_RATING'
                            ? 'User Rating'
                            : sortBy === 'SORT_BY_USER_RATING_COUNT'
                              ? 'User Rating Count'
                              : 'Year'
                    }`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {SORT_BY_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt}
                      className="cursor-pointer"
                      onClick={() => setSortBy(opt)}
                      aria-label={`Sort by ${opt}`}
                    >
                      {opt === 'SORT_BY_POPULARITY'
                        ? 'Popularity'
                        : opt === 'SORT_BY_RELEASE_DATE'
                          ? 'Release Date'
                          : opt === 'SORT_BY_USER_RATING'
                            ? 'User Rating'
                            : opt === 'SORT_BY_USER_RATING_COUNT'
                              ? 'User Rating Count'
                              : 'Year'}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="cursor-pointer"
                    aria-label="Select sort order"
                  >
                    {`Order: ${sortOrder === 'ASC' ? 'Ascending' : 'Descending'}`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {SORT_ORDER_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt}
                      className="cursor-pointer"
                      onClick={() => setSortOrder(opt)}
                      aria-label={`Sort order ${opt}`}
                    >
                      {opt === 'ASC' ? 'Ascending' : 'Descending'}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-4">
            {items.length > 0 ? (
              items.map((item, idx) => {
                const title = getTitle(item)
                const imageUrl = getImageUrl(item)
                const year = getYear(item)

                return (
                  <Link key={item.id ?? `${title}-${idx}`} href={`/imdb/${item.id}`}>
                    <Card className="p-0 overflow-hidden">
                      <div className="relative">
                        <Image
                          src={imageUrl}
                          alt={title}
                          width={500}
                          height={750}
                          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                          className="w-full aspect-[2/3] object-cover"
                          loading="lazy"
                        />
                        {typeof item?.rating?.aggregateRating === 'number' ? (
                          <div className="absolute left-1.5 top-1.5 z-10">
                            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium bg-background/60 backdrop-blur-sm">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                                className="w-3 h-3 text-yellow-500 fill-current"
                              >
                                <path d="M12 .587l3.668 7.431L24 9.748l-6 5.848 1.417 8.267L12 19.771 4.583 23.863 6 15.596 0 9.748l8.332-1.73z" />
                              </svg>
                              <span>{Number(item.rating.aggregateRating).toFixed(1)}</span>
                            </span>
                          </div>
                        ) : null}
                        <CardContent className="px-3 py-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <CardTitle className="text-sm ellipsis whitespace-nowrap overflow-hidden">
                                {title}
                              </CardTitle>
                            </TooltipTrigger>
                            <TooltipContent>{title}</TooltipContent>
                          </Tooltip>
                          <CardDescription className="text-xs flex items-center gap-1">
                            {typeof year === 'number' ? <span>{year}</span> : null}
                          </CardDescription>
                          <Button
                            variant="outline"
                            className="w-full mt-2"
                            onClick={() =>
                              toast.success(`${title} added to watchlist.`, {
                                duration: 3000,
                              })
                            }
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Watchlist
                          </Button>
                        </CardContent>
                      </div>
                    </Card>
                  </Link>
                )
              })
            ) : !loading && !error ? (
              <div className="col-span-full text-center text-sm text-muted-foreground py-10">
                No data found for &quot;{selectedType}&quot;.
              </div>
            ) : null}
            {loading &&
              Array.from({ length: 30 }).map((_, i) => (
                <div key={`skeleton-${i}`} className="rounded-sm border overflow-hidden">
                  <Skeleton className="aspect-[2/3] w-full" />
                  <div className="p-2">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2 mb-2" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              ))}
          </div>
          {hasMore && !loading && (
            <div ref={observerTarget} className="flex justify-center mt-4"></div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
