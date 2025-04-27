import React from 'react'

export interface GameOptions {
  genres: string[]
  yearRange: {
    start: number
    end: number
  }
  titleDisplay: 'english' | 'romaji' | 'both'
  difficulty: 'easy' | 'medium' | 'hard'
  timerEnabled: boolean
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
    titleDisplay: 'english' as const,
    difficulty: 'medium' as const,
    timerEnabled: true,
  },
  year: {
    genres: [],
    yearRange: { start: 1990, end: 2000 },
    titleDisplay: 'english' as const,
    difficulty: 'medium' as const,
    timerEnabled: true,
  },
  genre: {
    genres: ['Action', 'Adventure'],
    yearRange: { start: 2000, end: MAX_YEAR },
    titleDisplay: 'english' as const,
    difficulty: 'medium' as const,
    timerEnabled: true,
  },
  mixed: {
    genres: [],
    yearRange: { start: MIN_YEAR, end: MAX_YEAR },
    titleDisplay: 'english' as const,
    difficulty: 'medium' as const,
    timerEnabled: true,
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

  const handleTitleDisplayChange = (
    titleDisplay: GameOptions['titleDisplay']
  ) => {
    onOptionsChange({ ...options, titleDisplay })
  }

  return (
    <div className="space-y-6 text-start">
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

      <button
        onClick={onStartGame}
        className="w-full bg-accent hover:bg-opacity-80 text-white font-bold py-3 px-6 rounded-lg transition-all text-lg"
      >
        Start Game
      </button>

      <div className="bg-secondary p-6 rounded-lg space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Genres</h3>
          <div className="flex flex-wrap gap-2 my-2">
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
          <p className="text-sm text-gray-400">
            {options.genres.length > 0
              ? `Only anime that follow all of the selected genres will be shown.`
              : 'All genres allowed.'}
          </p>
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
                  Only the top anime, more time to answer, and easier character
                  selection.
                </p>
              )}
              {options.difficulty === 'medium' && (
                <p>
                  Balanced selection, standard time limit, and moderate
                  character difficulty curve.
                </p>
              )}
              {options.difficulty === 'hard' && (
                <p>
                  Larger pool of anime with faster difficulty progression, tight
                  time limit, and challenging character selection.
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Anime Title Display</h3>
          <div className="flex gap-2">
            {(['english', 'romaji', 'both'] as const).map((displayType) => (
              <button
                key={displayType}
                onClick={() => handleTitleDisplayChange(displayType)}
                className={`px-4 py-2 rounded transition-all ${
                  options.titleDisplay === displayType
                    ? 'bg-accent text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {displayType.charAt(0).toUpperCase() + displayType.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Timer</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() =>
                onOptionsChange({
                  ...options,
                  timerEnabled: !options.timerEnabled,
                })
              }
              className={`px-4 py-2 rounded transition-all ${
                options.timerEnabled
                  ? 'bg-accent text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {options.timerEnabled ? 'Enabled' : 'Disabled'}
            </button>
            <p className="text-sm text-gray-400">
              {options.timerEnabled
                ? 'Timer will count down and affect your score. Answer quickly to get bonus points.'
                : 'No time limit - take your time to answer. No time bonus.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
