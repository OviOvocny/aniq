import React from 'react'

export interface GameOptions {
  genres: string[]
  yearRange: {
    start: number
    end: number
  }
  useJapaneseTitles: boolean
  difficulty: 'easy' | 'medium' | 'hard'
}

interface GameOptionsProps {
  options: GameOptions
  onOptionsChange: (options: GameOptions) => void
  onStartGame: () => void
}

const AVAILABLE_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Supernatural',
  'Thriller',
  'Sports',
  'Ecchi',
]

const MIN_YEAR = 1940
const MAX_YEAR = new Date().getFullYear()

const PRESETS = {
  popular: {
    genres: [],
    yearRange: { start: 2000, end: MAX_YEAR },
    useJapaneseTitles: false,
    difficulty: 'medium' as const,
  },
  year: {
    genres: [],
    yearRange: { start: 1990, end: 2000 },
    useJapaneseTitles: false,
    difficulty: 'medium' as const,
  },
  genre: {
    genres: ['Action', 'Adventure'],
    yearRange: { start: 2000, end: MAX_YEAR },
    useJapaneseTitles: false,
    difficulty: 'medium' as const,
  },
  mixed: {
    genres: [],
    yearRange: { start: MIN_YEAR, end: MAX_YEAR },
    useJapaneseTitles: false,
    difficulty: 'medium' as const,
  },
}

export const GameOptions: React.FC<GameOptionsProps> = ({
  options,
  onOptionsChange,
  onStartGame,
}) => {
  const handlePresetSelect = (preset: keyof typeof PRESETS) => {
    onOptionsChange(PRESETS[preset])
  }

  const handleGenreToggle = (genre: string) => {
    const newGenres = options.genres.includes(genre)
      ? options.genres.filter((g) => g !== genre)
      : [...options.genres, genre]
    onOptionsChange({ ...options, genres: newGenres })
  }

  const handleYearRangeChange = (field: 'start' | 'end', value: number) => {
    const newYearRange = { ...options.yearRange }
    if (field === 'start') {
      newYearRange.start = Math.max(MIN_YEAR, Math.min(value, newYearRange.end))
    } else {
      newYearRange.end = Math.max(newYearRange.start, Math.min(value, MAX_YEAR))
    }
    onOptionsChange({ ...options, yearRange: newYearRange })
  }

  const handleDifficultyChange = (difficulty: GameOptions['difficulty']) => {
    onOptionsChange({ ...options, difficulty })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => handlePresetSelect('popular')}
          className="p-4 bg-secondary hover:bg-opacity-80 rounded-lg transition-all"
        >
          <h3 className="font-semibold mb-1">Popular Anime</h3>
          <p className="text-sm text-gray-400">Top-rated series</p>
        </button>
        <button
          onClick={() => handlePresetSelect('year')}
          className="p-4 bg-secondary hover:bg-opacity-80 rounded-lg transition-all"
        >
          <h3 className="font-semibold mb-1">Year Range</h3>
          <p className="text-sm text-gray-400">Specific eras</p>
        </button>
        <button
          onClick={() => handlePresetSelect('genre')}
          className="p-4 bg-secondary hover:bg-opacity-80 rounded-lg transition-all"
        >
          <h3 className="font-semibold mb-1">Genre Focus</h3>
          <p className="text-sm text-gray-400">Favorite genres</p>
        </button>
        <button
          onClick={() => handlePresetSelect('mixed')}
          className="p-4 bg-secondary hover:bg-opacity-80 rounded-lg transition-all"
        >
          <h3 className="font-semibold mb-1">Mixed Mode</h3>
          <p className="text-sm text-gray-400">Random selection</p>
        </button>
      </div>

      <div className="bg-secondary p-6 rounded-lg space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Genres</h3>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_GENRES.map((genre) => (
              <button
                key={genre}
                onClick={() => handleGenreToggle(genre)}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  options.genres.includes(genre)
                    ? 'bg-accent text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Year Range</h3>
          <div className="relative pt-6 pb-2">
            <div className="relative h-2 bg-gray-700 rounded-full">
              <div
                className="absolute h-2 bg-accent rounded-full"
                style={{
                  left: `${((options.yearRange.start - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%`,
                  right: `${100 - ((options.yearRange.end - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%`,
                }}
              />
              <div
                className="absolute w-4 h-4 bg-accent rounded-full -top-1 transform -translate-x-1/2 cursor-pointer hover:scale-110 transition-transform"
                style={{
                  left: `${((options.yearRange.start - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%`,
                }}
                onMouseDown={(e) => {
                  const startX = e.clientX
                  const startValue = options.yearRange.start
                  const sliderWidth =
                    e.currentTarget.parentElement?.clientWidth || 0
                  const handleMouseMove = (e: MouseEvent) => {
                    const delta = e.clientX - startX
                    const range = MAX_YEAR - MIN_YEAR
                    const newValue = Math.round(
                      startValue + (delta / sliderWidth) * range
                    )
                    if (
                      newValue >= MIN_YEAR &&
                      newValue <= options.yearRange.end
                    ) {
                      handleYearRangeChange('start', newValue)
                    }
                  }
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove)
                    document.removeEventListener('mouseup', handleMouseUp)
                  }
                  document.addEventListener('mousemove', handleMouseMove)
                  document.addEventListener('mouseup', handleMouseUp)
                }}
              />
              <div
                className="absolute w-4 h-4 bg-accent rounded-full -top-1 transform -translate-x-1/2 cursor-pointer hover:scale-110 transition-transform"
                style={{
                  left: `${((options.yearRange.end - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%`,
                }}
                onMouseDown={(e) => {
                  const startX = e.clientX
                  const startValue = options.yearRange.end
                  const sliderWidth =
                    e.currentTarget.parentElement?.clientWidth || 0
                  const handleMouseMove = (e: MouseEvent) => {
                    const delta = e.clientX - startX
                    const range = MAX_YEAR - MIN_YEAR
                    const newValue = Math.round(
                      startValue + (delta / sliderWidth) * range
                    )
                    if (
                      newValue <= MAX_YEAR &&
                      newValue >= options.yearRange.start
                    ) {
                      handleYearRangeChange('end', newValue)
                    }
                  }
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove)
                    document.removeEventListener('mouseup', handleMouseUp)
                  }
                  document.addEventListener('mousemove', handleMouseMove)
                  document.addEventListener('mouseup', handleMouseUp)
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-400">
              <span>{options.yearRange.start}</span>
              <span>{options.yearRange.end}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Difficulty</h3>
          <div className="space-y-2">
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as const).map((difficulty) => (
                <button
                  key={difficulty}
                  onClick={() => handleDifficultyChange(difficulty)}
                  className={`px-4 py-2 rounded transition-all ${
                    options.difficulty === difficulty
                      ? 'bg-accent text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </button>
              ))}
            </div>
            <div className="text-sm text-gray-400">
              {options.difficulty === 'easy' && (
                <p>
                  Smaller pool of anime, more time to answer, and easier
                  character selection.
                </p>
              )}
              {options.difficulty === 'medium' && (
                <p>
                  Balanced pool size, standard time limit, and moderate
                  character difficulty.
                </p>
              )}
              {options.difficulty === 'hard' && (
                <p>
                  Larger pool of anime, faster difficulty progression, and
                  challenging character selection.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="checkbox"
              id="useJapaneseTitles"
              checked={options.useJapaneseTitles}
              onChange={(e) =>
                onOptionsChange({
                  ...options,
                  useJapaneseTitles: e.target.checked,
                })
              }
              className="peer sr-only"
            />
            <div className="w-5 h-5 bg-gray-700 rounded border border-gray-600 peer-checked:bg-accent peer-checked:border-accent transition-colors">
              <svg
                className="w-5 h-5 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <label
            htmlFor="useJapaneseTitles"
            className="text-sm text-gray-300 cursor-pointer select-none"
          >
            Use Japanese Titles
          </label>
        </div>
      </div>

      <button
        onClick={onStartGame}
        className="w-full bg-accent hover:bg-opacity-80 text-white font-bold py-3 px-6 rounded-lg transition-all"
      >
        Start Game
      </button>
    </div>
  )
}
