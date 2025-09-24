import type { WigData } from "./firestore-operations"

const CACHE_KEY = "tokitos_wigs_cache"
const CACHE_TIMESTAMP_KEY = "tokitos_wigs_cache_timestamp"
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const getCachedWigs = (): WigData[] | null => {
  if (typeof window === "undefined") return null

  try {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
    const cachedData = localStorage.getItem(CACHE_KEY)

    if (!timestamp || !cachedData) return null

    const cacheAge = Date.now() - Number.parseInt(timestamp)
    if (cacheAge > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY)
      localStorage.removeItem(CACHE_TIMESTAMP_KEY)
      return null
    }

    return JSON.parse(cachedData)
  } catch (error) {
    console.error("Error reading cache:", error)
    return null
  }
}

export const setCachedWigs = (wigs: WigData[]) => {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(wigs))
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
  } catch (error) {
    console.error("Error setting cache:", error)
  }
}

export const clearWigsCache = () => {
  if (typeof window === "undefined") return

  localStorage.removeItem(CACHE_KEY)
  localStorage.removeItem(CACHE_TIMESTAMP_KEY)
}
