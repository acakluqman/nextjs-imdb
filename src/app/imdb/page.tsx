'use client'

import * as React from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
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
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import useInfiniteScroll from '@/hooks/use-infinite-scroll'

type ImdbTitle = {
  id?: string
  primaryTitle?: string
  titleText?: { text?: string }
  primaryImage?: { url?: string; caption?: { plainText?: string } }
  image?: string
  startYear?: number
  releaseYear?: { year?: number }
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

function getTitle(item: ImdbTitle) {
  return item.primaryTitle ?? item.titleText?.text ?? 'Untitled'
}

function getImageUrl(item: ImdbTitle) {
  return (
    item.primaryImage?.url ??
    item.image ??
    'https://placehold.co/300x450?text=No+Image+Found&font=roboto'
  )
}

function getYear(item: ImdbTitle) {
  return item.startYear ?? item.releaseYear?.year
}

export default function Page() {
  const searchParams = useSearchParams()
  const rawType = (searchParams.get('type') ?? 'movie').trim()
  const typeCode = parseTypeCode(rawType) ?? 'MOVIE'
  const selectedType = TYPE_MAP[rawType] ?? 'Movie'

  const fetchTitles = React.useCallback(
    async (pageParam: string | null) => {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/titles?types=${encodeURIComponent(
        typeCode
      )}&sortBy=SORT_BY_POPULARITY&sortOrder=ASC${pageParam ? `&pageToken=${pageParam}` : ''}`

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
    [typeCode]
  )

  const {
    data: items,
    loading,
    error,
    hasMore,
    fetchData,
  } = useInfiniteScroll<ImdbTitle>({
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

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-8 gap-4">
            {items.length > 0 ? (
              items.map((item, idx) => {
                const title = getTitle(item)
                const imageUrl = getImageUrl(item)
                const year = getYear(item)

                return (
                  <Card key={item.id ?? `${title}-${idx}`} className="p-0 overflow-hidden">
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
                      <CardContent className="px-3 py-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CardTitle className="text-sm ellipsis whitespace-nowrap overflow-hidden">
                              {title}
                            </CardTitle>
                          </TooltipTrigger>
                          <TooltipContent>{title}</TooltipContent>
                        </Tooltip>
                        {year ? (
                          <CardDescription className="text-xs">{year}</CardDescription>
                        ) : null}
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
                )
              })
            ) : !loading && !error ? (
              <div className="col-span-full text-center text-sm text-muted-foreground py-10">
                No data found for "{selectedType}".
              </div>
            ) : null}
            {loading &&
              Array.from({ length: 30 }).map((_, i) => (
                <div key={`skeleton-${i}`} className="rounded-sm border overflow-hidden">
                  <Skeleton className="aspect-[2/3] w-full" />
                  <div className="p-2">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
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
