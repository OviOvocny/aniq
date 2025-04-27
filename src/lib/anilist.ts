import { GraphQLClient, gql, ClientError } from 'graphql-request'
// Import Variables as a type
import type { Variables } from 'graphql-request'

// --- Rate Limit Configuration ---
const ANILIST_API_URL = 'https://graphql.anilist.co'
const ACTUAL_RATE_LIMIT_PER_MINUTE = 30 // Anilist API is currently limited to 30/min despite headers saying 90/min.
const MIN_REMAINING_BEFORE_PAUSE = 6 // Pause requests proactively when remaining count hits this value
const RATE_LIMIT_MAX = ACTUAL_RATE_LIMIT_PER_MINUTE // Set to AniList's actual per-minute limit for your client

// --- Rate Limit State ---
let remainingRequests: number | null = RATE_LIMIT_MAX
let retryAfterTimestamp: number | null = null // seconds since epoch
let rateLimitWindowStartTimestamp: number | null = null // seconds since epoch
let rateLimitResetTimer: NodeJS.Timeout | null = null // Timer to reset the count after a minute if needed

// --- Custom Error for Rate Limiting ---
export class RateLimitError extends Error {
  retryAfterSeconds: number | null
  resetTimestamp: number | null

  constructor(
    message: string,
    retryAfterSeconds: number | null = null,
    resetTimestamp: number | null = null
  ) {
    super(message)
    this.name = 'RateLimitError'
    this.retryAfterSeconds = retryAfterSeconds
    this.resetTimestamp = resetTimestamp
  }
}

// Helper to set a pause until a specific time
function setRateLimitPause(retryAfterSeconds: number) {
  const now = Math.floor(Date.now() / 1000)
  retryAfterTimestamp = now + retryAfterSeconds
  setTimeout(
    () => {
      retryAfterTimestamp = null
      remainingRequests = ACTUAL_RATE_LIMIT_PER_MINUTE // Reset count after pause
    },
    retryAfterSeconds * 1000 + 100
  ) // Add a small buffer
}

// --- Rate Limit State Management ---
const updateRateLimitState = (headers: Headers) => {
  const remainingHeader = headers.get('x-ratelimit-remaining')
  if (remainingHeader) {
    const currentRemaining = parseInt(remainingHeader, 10)
    // Adjust remaining count based on the known lower limit issue
    remainingRequests = Math.max(0, currentRemaining - 60) // If header says 90, actual is 30. If header says 60, actual is 0.
    console.log(
      `[RateLimit] Updated remaining requests: ${remainingRequests} (Header: ${currentRemaining})`
    )
  }

  // Clear any existing reset timer if we get a new update
  if (rateLimitResetTimer) {
    clearTimeout(rateLimitResetTimer)
    rateLimitResetTimer = null
  }

  // If we don't have an explicit reset time from a 429,
  // assume the limit resets roughly 60 seconds from now.
  if (retryAfterTimestamp === null) {
    rateLimitResetTimer = setTimeout(() => {
      console.log('[RateLimit] Resetting request count after 60s timer.')
      remainingRequests = ACTUAL_RATE_LIMIT_PER_MINUTE
      rateLimitResetTimer = null
    }, 60 * 1000) // 60 seconds
  }
}

// Export function to get current status for UI
export const getRateLimitStatus = () => ({
  remaining: remainingRequests,
  retryUntil: retryAfterTimestamp,
})

// --- Original GraphQL Client ---
const baseClient = new GraphQLClient(ANILIST_API_URL, {
  errorPolicy: 'ignore',
})

// --- Rate-Limited Client Wrapper ---
async function isInternetWorking(): Promise<boolean> {
  try {
    // Use a HEAD request to minimize data transfer
    await fetch('https://1.1.1.1/cdn-cgi/trace', {
      method: 'HEAD',
      mode: 'no-cors',
    })
    // If fetch doesn't throw, we assume the network is up.
    return true
  } catch {
    return false
  }
}

const rateLimitedClient = {
  request: async <T, V extends Variables = Variables>(
    query: string,
    variables?: V
  ): Promise<T> => {
    // Always attempt the request, even if retryAfterTimestamp is set. Only throw RateLimitError if a 429 is received from the server.
    try {
      console.log(
        `[RateLimit] Making request. Remaining estimate: ${remainingRequests}`
      )
      // Track the start of the rate limit window
      const nowSec = Math.floor(Date.now() / 1000)
      if (remainingRequests !== null && remainingRequests === RATE_LIMIT_MAX) {
        console.log('Starting new burst window at', nowSec)
        // We are starting a new burst window
        rateLimitWindowStartTimestamp = nowSec
      }
      const response = await baseClient.rawRequest<T, V>(query, variables)
      console.log('!!!!!!RESPONSE RAW!!!!!!', response)
      updateRateLimitState(response.headers)
      // Decrement optimistic count *after* successful request
      if (remainingRequests !== null) {
        remainingRequests = Math.max(0, remainingRequests - 1)
        console.log(
          `[RateLimit] Decremented remaining count: ${remainingRequests}`
        )
      }
      return response.data
    } catch (error: any) {
      console.log('!!!!!!ERROR RAW!!!!!!', error)
      // Robustly check for 429 regardless of error type
      const response =
        typeof error === 'object' && error && 'response' in error
          ? (error as any).response
          : undefined
      if (response && response.status === 429 && response.headers) {
        // Assert headers as Headers type within this block
        const headers = error.response.headers as Headers
        // Determine wait time using x-ratelimit-reset header if available
        const resetHeader = headers.get('x-ratelimit-reset')
        let resetTimestamp: number | null = null
        let retrySeconds: number
        if (resetHeader) {
          // X-RateLimit-Reset is a UNIX timestamp (seconds) of when the rate limit resets
          resetTimestamp = parseInt(resetHeader, 10)
          const nowSec = Math.floor(Date.now() / 1000)
          retrySeconds = Math.max(1, resetTimestamp - nowSec)
        } else {
          const retryAfterHeader = headers.get('retry-after')
          retrySeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60
          resetTimestamp = Math.floor(Date.now() / 1000) + retrySeconds
        }
        console.error(
          `[RateLimit] Received 429. Waiting for ${retrySeconds}s (reset at ${resetTimestamp ? new Date(resetTimestamp * 1000).toISOString() : 'retry-after'})`,
          headers
        )
        setRateLimitPause(retrySeconds)

        throw new RateLimitError(
          `Rate limit exceeded. Retry after ${retrySeconds} seconds.`,
          retrySeconds,
          resetTimestamp
        )
      } else if (response && response.status >= 400) {
        // For other HTTP errors, re-throw but still log details if possible
        const message =
          typeof error === 'object' && error && 'message' in error
            ? (error as any).message
            : String(error)
        console.error('[API] HTTP Error: ', message, response)
        throw error
      } else if (
        error.message.includes('NetworkError') &&
        remainingRequests !== null &&
        rateLimitWindowStartTimestamp !== null
      ) {
        // Check if internet is actually working
        const online = await isInternetWorking()
        if (online) {
          console.log('NETWORK ERROR EMULATING RATE LIMIT (internet is up)')
          // Heuristic: treat as rate limit if we know we just made a lot of requests
          const resetTimestamp = rateLimitWindowStartTimestamp + 60
          const retrySeconds = Math.max(
            1,
            resetTimestamp - Math.floor(Date.now() / 1000)
          )
          console.warn(
            '[RateLimit] NetworkError likely due to CORS-blocked 429. Triggering RL pause for',
            retrySeconds,
            'seconds.'
          )
          setRateLimitPause(retrySeconds)
          throw new RateLimitError(
            'Rate limit exceeded (network/CORS error heuristic). Retry after ' +
              retrySeconds +
              ' seconds.',
            retrySeconds,
            resetTimestamp
          )
        } else {
          // True network outage, re-throw
          console.warn(
            'NETWORK ERROR: Internet appears to be down. Not treating as rate limit.'
          )
          throw error
        }
      } else {
        // For all other errors (including non-HTTP), re-throw
        console.log('RETHROWING UNKNOWN ERROR', typeof error, error.message)
        console.log(
          'RATE STATS',
          getRateLimitStatus(),
          rateLimitWindowStartTimestamp,
          remainingRequests
        )
        throw error
      }
    }
  },
}

// --- Cache Keys ---
const TOP_ANIME_IDS_CACHE_KEY = 'aniq_topAnimeIdsCache'
const ANIME_DETAILS_CACHE_KEY = 'aniq_animeDetailsCache'
const CACHE_VERSION = 'v1' // Increment to invalidate old cache structures

// --- Cache Utility Functions ---
function loadCache<T>(key: string): Map<number, T> {
  if (typeof localStorage === 'undefined') return new Map() // Check for server-side rendering
  try {
    const item = localStorage.getItem(`${key}_${CACHE_VERSION}`)
    if (!item) return new Map()
    const parsed = JSON.parse(item)
    // Ensure it's parsed into a Map object
    if (Array.isArray(parsed)) {
      return new Map(parsed)
    }
    return new Map() // Return empty if format is wrong
  } catch (error) {
    console.error(`Error loading cache for key ${key}:`, error)
    return new Map()
  }
}

function saveCache<T>(key: string, cache: Map<number, T>) {
  if (typeof localStorage === 'undefined') return // Check for server-side rendering
  try {
    // Convert Map to Array for stringification
    const array = Array.from(cache.entries())
    localStorage.setItem(`${key}_${CACHE_VERSION}`, JSON.stringify(array))
  } catch (error) {
    console.error(`Error saving cache for key ${key}:`, error)
    // Optionally handle storage full errors
  }
}

// --- Caches Initialization ---
const topAnimeIdsCache = loadCache<number[]>(TOP_ANIME_IDS_CACHE_KEY)
const animeDetailsCache = loadCache<AnimeDetails>(ANIME_DETAILS_CACHE_KEY)

// Query to get top anime IDs
const GET_TOP_ANIME = gql`
  query GetTopAnime($page: Int, $perPage: Int, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      media(sort: $sort) {
        id
      }
    }
  }
`

// UPDATED: Query to get ONLY character data for multiple anime IDs
const GET_CHARACTERS_BATCH = gql`
  query GetCharactersBatch($ids: [Int], $role: CharacterRole) {
    Page(page: 1, perPage: 50) {
      media(id_in: $ids, type: ANIME) {
        id # Need the media ID to map results back
        characters(role: $role, sort: [ROLE, RELEVANCE, ID]) {
          nodes {
            id
            name {
              full
            }
            image {
              large
            }
            # No nested media query here
          }
        }
      }
    }
  }
`

// NEW: Query to get ONLY titles for multiple anime IDs
const GET_TITLES_BATCH = gql`
  query GetTitlesBatch($ids: [Int]) {
    Page(page: 1, perPage: 50) {
      media(id_in: $ids, type: ANIME) {
        id
        title {
          romaji
          english
        }
      }
    }
  }
`

// Query to get detailed anime information for hints
const GET_ANIME_DETAILS = gql`
  query GetAnimeDetails($id: Int) {
    Media(id: $id) {
      title {
        romaji
        english
      }
      studios {
        nodes {
          name
        }
      }
      staff {
        edges {
          role
          node {
            name {
              full
            }
          }
        }
      }
      startDate {
        year
      }
      genres
    }
  }
`

// --- Interfaces ---

export interface AnimeTitle {
  romaji: string
  english: string | null
}

// Character interface WITHOUT nested media
export interface AnimeCharacterBase {
  id: number
  name: {
    full: string
  }
  image: {
    large: string
  }
}

// Extended character interface including the title
export interface AnimeCharacter extends AnimeCharacterBase {
  animeTitle: AnimeTitle | null // Add the title property
}

interface StaffEdge {
  role: string
  node: {
    name: { full: string }
  }
}

export interface AnimeDetails {
  title: AnimeTitle
  studios: {
    nodes: { name: string }[]
  }
  staff: {
    edges: StaffEdge[]
  }
  startDate: {
    year: number
  }
  genres: string[]
}

// --- Response Types ---

interface TopAnimeResponse {
  Page: {
    media: { id: number }[]
  }
}

// Response for the simplified character batch
interface CharactersBatchResponse {
  Page: {
    media: {
      id: number
      characters: {
        nodes: AnimeCharacterBase[]
      }
    }[]
  }
}

// Response for the title batch
interface TitlesBatchResponse {
  Page: {
    media: {
      id: number
      title: AnimeTitle
    }[]
  }
}

interface AnimeDetailsResponse {
  Media: AnimeDetails
}

interface AnimeByGenresResponse {
  Page: {
    media: { id: number }[]
  }
}

interface AnimeByYearResponse {
  Page: {
    media: { id: number }[]
  }
}

// --- API Functions ---

// Updated fetchTopAnimeIds with localStorage Cache
export async function fetchTopAnimeIds(count: number): Promise<number[]> {
  if (topAnimeIdsCache.has(count)) {
    console.log(`Cache hit for top anime IDs (count: ${count})`)
    return topAnimeIdsCache.get(count)!
  }
  console.log(`Cache miss for top anime IDs (count: ${count}), fetching...`)
  // Use the rate-limited client
  const data = await rateLimitedClient.request<TopAnimeResponse>(
    GET_TOP_ANIME,
    {
      page: 1,
      perPage: count,
      sort: ['POPULARITY_DESC'],
    }
  )
  const ids = data.Page.media.map((anime) => anime.id)
  topAnimeIdsCache.set(count, ids)
  saveCache(TOP_ANIME_IDS_CACHE_KEY, topAnimeIdsCache) // Save to localStorage
  return ids
}

// Updated fetchAnimeDetails with localStorage Cache
export async function fetchAnimeDetails(
  animeId: number
): Promise<AnimeDetails> {
  if (animeDetailsCache.has(animeId)) {
    console.log(`Cache hit for anime details (ID: ${animeId})`)
    return animeDetailsCache.get(animeId)!
  }
  console.log(`Cache miss for anime details (ID: ${animeId}), fetching...`)
  // Use the rate-limited client
  const data = await rateLimitedClient.request<AnimeDetailsResponse>(
    GET_ANIME_DETAILS,
    {
      id: animeId,
    }
  )
  if (!data || !data.Media) {
    console.error(`Failed to fetch details for anime ID: ${animeId}`, data)
    throw new Error(`Could not fetch details for anime ID: ${animeId}`)
  }
  animeDetailsCache.set(animeId, data.Media)
  saveCache(ANIME_DETAILS_CACHE_KEY, animeDetailsCache) // Save to localStorage
  return data.Media
}

// Updated getQuestionCharacters to use rateLimitedClient
export async function getQuestionCharacters(
  round: number,
  titleDisplay: 'english' | 'romaji' | 'both' = 'romaji',
  genres: string[] = [],
  yearRange: { start: number; end: number } = {
    start: 1940,
    end: new Date().getFullYear(),
  },
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<{
  characters: AnimeCharacter[]
  correctCharacterId: number
  correctAnimeId: number
}> {
  // Calculate pool size based on difficulty and round
  const getPoolSize = (round: number, difficulty: string) => {
    const baseSize =
      difficulty === 'easy' ? 50 : difficulty === 'medium' ? 100 : 150
    const roundMultiplier =
      difficulty === 'easy' ? 25 : difficulty === 'medium' ? 50 : 75
    return Math.min(baseSize + Math.floor(round / 5) * roundMultiplier, 500)
  }

  const poolSize = getPoolSize(round, difficulty)
  const maxAttempts = 3
  let attempts = 0

  while (attempts < maxAttempts) {
    try {
      // 1. Get a pool of anime IDs based on the options
      let animeIds: number[]
      if (genres.length > 0) {
        const genreQuery = gql`
          query GetAnimeByGenres($genres: [String], $startYear: FuzzyDateInt, $endYear: FuzzyDateInt) {
            Page(page: 1, perPage: ${poolSize}) {
              media(
                type: ANIME, 
                genre_in: $genres, 
                startDate_greater: $startYear, 
                startDate_lesser: $endYear
              ) {
                id
              }
            }
          }
        `
        // Use the rate-limited client
        const response = await rateLimitedClient.request<AnimeByGenresResponse>(
          genreQuery,
          {
            genres,
            startYear: yearRange.start * 10000,
            endYear: (yearRange.end + 1) * 10000 - 1,
          }
        )
        animeIds = response.Page.media.map((m) => m.id)
      } else {
        const yearQuery = gql`
          query GetTopAnimeByYear($startYear: FuzzyDateInt, $endYear: FuzzyDateInt) {
            Page(page: 1, perPage: ${poolSize}) {
              media(
                type: ANIME, 
                sort: [POPULARITY_DESC], 
                startDate_greater: $startYear, 
                startDate_lesser: $endYear
              ) {
                id
              }
            }
          }
        `
        // Use the rate-limited client
        const response = await rateLimitedClient.request<AnimeByYearResponse>(
          yearQuery,
          {
            startYear: yearRange.start * 10000,
            endYear: (yearRange.end + 1) * 10000 - 1,
          }
        )
        animeIds = response.Page.media.map((m) => m.id)
      }

      if (animeIds.length === 0) {
        throw new Error('No anime found matching the criteria')
      }

      // 2. Randomly select 4 anime IDs from the pool
      const selectedAnimeIds = animeIds
        .sort(() => Math.random() - 0.5)
        .slice(0, 4)

      // 3. Batch fetch characters for the selected anime
      // Use the rate-limited client
      const characterBatchData =
        await rateLimitedClient.request<CharactersBatchResponse>(
          GET_CHARACTERS_BATCH,
          { ids: selectedAnimeIds, role: 'MAIN' }
        )
      if (!characterBatchData?.Page?.media)
        throw new Error('Character batch query failed.')

      const mediaMap = new Map(
        characterBatchData.Page.media.map((m) => [
          m.id,
          m.characters.nodes.filter((c) => c.image.large),
        ])
      )

      const usedCharIds = new Set<number>()
      const selectedCharsBase: AnimeCharacterBase[] = []
      const originAnimeIds: number[] = []

      for (const animeId of selectedAnimeIds) {
        const charsForAnime = mediaMap.get(animeId)
        if (charsForAnime && charsForAnime.length > 0) {
          const potentialChars = charsForAnime.filter(
            (c) => !usedCharIds.has(c.id)
          )
          if (potentialChars.length > 0) {
            const selectedChar =
              potentialChars[Math.floor(Math.random() * potentialChars.length)]
            usedCharIds.add(selectedChar.id)
            selectedCharsBase.push(selectedChar)
            originAnimeIds.push(animeId)
          } else {
            console.warn(`All characters already used for anime ${animeId}`)
          }
        } else {
          console.warn(
            `No characters found or media missing for anime ${animeId} in batch response.`
          )
        }
        if (selectedCharsBase.length === 4) break
      }
      if (selectedCharsBase.length < 4) {
        throw new Error(
          `Could only select ${selectedCharsBase.length} unique characters.`
        )
      }

      // 4. Batch fetch ONLY titles
      // Use the rate-limited client
      const titleBatchData =
        await rateLimitedClient.request<TitlesBatchResponse>(GET_TITLES_BATCH, {
          ids: originAnimeIds,
        })
      if (!titleBatchData?.Page?.media)
        throw new Error('Title batch query failed.')
      const titleMap = new Map(
        titleBatchData.Page.media.map((m) => [m.id, m.title])
      )

      // 5. Combine characters with their titles
      const charactersWithTitles: AnimeCharacter[] = selectedCharsBase.map(
        (char, index) => {
          const animeId = originAnimeIds[index]
          return { ...char, animeTitle: titleMap.get(animeId) || null }
        }
      )

      // 6. Randomly select the correct answer
      const correctIndex = Math.floor(
        Math.random() * charactersWithTitles.length
      )
      const correctCharacter = charactersWithTitles[correctIndex]
      const correctAnimeId = originAnimeIds[correctIndex]

      return {
        characters: charactersWithTitles,
        correctCharacterId: correctCharacter.id,
        correctAnimeId,
      }
    } catch (error) {
      // Check if it's our custom RateLimitError
      if (error instanceof RateLimitError) {
        console.error(
          `Rate limit hit during getQuestionCharacters (Attempt ${attempts + 1}):`,
          error.message
        )
        // We need to propagate this error to the UI layer to show the pause
        throw error
      }
      // Handle other errors
      console.error(`Attempt ${attempts + 1} failed:`, error)
      attempts++
      if (attempts === maxAttempts) {
        throw new Error(
          'Failed to get question characters after multiple attempts'
        )
      }
      // Optional: Add a small delay before retrying non-rate-limit errors
      // await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // This should theoretically not be reached if maxAttempts > 0
  // unless RateLimitError is thrown and not caught upstream
  throw new Error('Failed to get question characters')
}

const MAIN_CHARACTER_ROUNDS = 15
