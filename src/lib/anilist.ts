import { GraphQLClient, gql } from 'graphql-request'

const ANILIST_API_URL = 'https://graphql.anilist.co'
const client = new GraphQLClient(ANILIST_API_URL)

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
  const data = await client.request<TopAnimeResponse>(GET_TOP_ANIME, {
    page: 1,
    perPage: count,
    sort: ['POPULARITY_DESC'],
  })
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
  const data = await client.request<AnimeDetailsResponse>(GET_ANIME_DETAILS, {
    id: animeId,
  })
  if (!data || !data.Media) {
    console.error(`Failed to fetch details for anime ID: ${animeId}`, data)
    throw new Error(`Could not fetch details for anime ID: ${animeId}`)
  }
  animeDetailsCache.set(animeId, data.Media)
  saveCache(ANIME_DETAILS_CACHE_KEY, animeDetailsCache) // Save to localStorage
  return data.Media
}

// Updated getQuestionCharacters to return correctAnimeId instead of details
export async function getQuestionCharacters(
  round: number,
  useJapaneseTitles: boolean = false,
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
        // If genres are specified, get anime from those genres
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
        const response = await client.request<AnimeByGenresResponse>(
          genreQuery,
          {
            genres,
            startYear: yearRange.start * 10000, // Convert to YYYYMMDD format
            endYear: (yearRange.end + 1) * 10000 - 1, // Convert to YYYYMMDD format and subtract 1 to get end of year
          }
        )
        animeIds = response.Page.media.map((m) => m.id)
      } else {
        // Otherwise, get top anime within the year range
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
        const response = await client.request<AnimeByYearResponse>(yearQuery, {
          startYear: yearRange.start * 10000, // Convert to YYYYMMDD format
          endYear: (yearRange.end + 1) * 10000 - 1, // Convert to YYYYMMDD format and subtract 1 to get end of year
        })
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
      const characterBatchData = await client.request<CharactersBatchResponse>(
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
      const titleBatchData = await client.request<TitlesBatchResponse>(
        GET_TITLES_BATCH,
        { ids: originAnimeIds }
      )
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
      console.error(`Attempt ${attempts + 1} failed:`, error)
      attempts++
      if (attempts === maxAttempts) {
        throw new Error(
          'Failed to get question characters after multiple attempts'
        )
      }
    }
  }

  throw new Error('Failed to get question characters')
}

const MAIN_CHARACTER_ROUNDS = 15
