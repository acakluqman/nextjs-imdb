import { useCallback, useEffect, useState } from 'react'

interface UseInfiniteScrollOptions<T> {
  fetchFunction: (pageParam: string | null) => Promise<{ data: T[]; nextPageToken: string | null }>
  initialPageParam?: string | null
}

const useInfiniteScroll = <T>({
  fetchFunction,
  initialPageParam = null,
}: UseInfiniteScrollOptions<T>) => {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [pageParam, setPageParam] = useState<string | null>(initialPageParam)
  const [hasMore, setHasMore] = useState<boolean>(true)

  const fetchData = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetchFunction(pageParam)
      setData((prevData) => [...prevData, ...response.data])
      setPageParam(response.nextPageToken)
      setHasMore(response.nextPageToken !== null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [fetchFunction, pageParam, loading, hasMore])

  useEffect(() => {
    // Reset data and pageParam when fetchFunction or initialPageParam changes
    setData([])
    setPageParam(initialPageParam)
    setHasMore(true)
  }, [fetchFunction, initialPageParam])

  return { data, loading, error, hasMore, fetchData }
}

export default useInfiniteScroll
