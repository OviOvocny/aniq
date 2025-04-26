import React, { useState, useEffect, useCallback } from 'react'
import {
  getQuestionCharacters,
  fetchAnimeDetails,
  type AnimeCharacter,
  type AnimeDetails,
  type AnimeTitle,
} from '../lib/anilist'
import { Timer } from './Timer'
import { Lives } from './Lives'
import { AnswerOption } from './AnswerOption'
import { Lifelines } from './Lifelines'
import type { GameOptions } from './GameOptions'

interface GameState {
  score: number
  lives: number
  currentRound: number
  timeLeft: number
  isPaused: boolean
  lifelines: {
    fiftyFifty: boolean
    skip: boolean
    hint: boolean
  }
  lifelineUsage: {
    fiftyFifty: number | null
    skip: number | null
    hint: number | null
  }
}

interface GameProps {
  options?: string | GameOptions
}

const DEFAULT_OPTIONS: GameOptions = {
  genres: [],
  yearRange: {
    start: 2000,
    end: new Date().getFullYear(),
  },
  useJapaneseTitles: false,
  difficulty: 'medium',
}

const TIMER_WARNING_THRESHOLD = 5 // seconds before timer turns red
const TIMER_BLINK_THRESHOLD = 3 // seconds before timer starts blinking
const LIFELINE_REGEN_ROUNDS = 3

// Make timer duration dynamic based on difficulty
const getTimePerQuestion = (difficulty: GameOptions['difficulty']) => {
  switch (difficulty) {
    case 'easy':
      return 20
    case 'medium':
      return 15
    case 'hard':
      return 10
    default:
      return 15
  }
}

// Make main character rounds dynamic based on difficulty
const getMainCharacterRounds = (difficulty: GameOptions['difficulty']) => {
  switch (difficulty) {
    case 'easy':
      return 15
    case 'medium':
      return 10
    case 'hard':
      return 5
    default:
      return 10
  }
}

const HeartIcon = () => (
  <svg
    className="w-6 h-6 text-red-500"
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path
      fillRule="evenodd"
      d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
      clipRule="evenodd"
    />
  </svg>
)

export default function Game({ options = DEFAULT_OPTIONS }: GameProps) {
  const parsedOptions =
    typeof options === 'string' ? JSON.parse(options) : options
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    lives: 3,
    currentRound: 1,
    timeLeft: getTimePerQuestion(parsedOptions.difficulty),
    isPaused: false,
    lifelines: {
      fiftyFifty: true,
      skip: true,
      hint: true,
    },
    lifelineUsage: {
      fiftyFifty: null,
      skip: null,
      hint: null,
    },
  })

  const [correctCharacterId, setCorrectCharacterId] = useState<number | null>(
    null
  )
  const [correctAnimeId, setCorrectAnimeId] = useState<number | null>(null)
  const [characterOptions, setCharacterOptions] = useState<AnimeCharacter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [gameOver, setGameOver] = useState(false)
  const [feedback, setFeedback] = useState<{
    correctId: number | null
    selectedId: number | null
  }>({ correctId: null, selectedId: null })
  const [nextQuestionData, setNextQuestionData] = useState<{
    characters: AnimeCharacter[]
    correctCharacterId: number
    correctAnimeId: number
  } | null>(null)
  const [isPreloading, setIsPreloading] = useState(false)
  const [showPauseScreen, setShowPauseScreen] = useState(false)
  const [pendingPause, setPendingPause] = useState(false)
  const [isTimerRunning, setIsTimerRunning] = useState(true)
  const [hint, setHint] = useState<string | null>(null)
  const [currentQuestionImage, setCurrentQuestionImage] = useState<
    string | null
  >(null)
  const [isFetchingHint, setIsFetchingHint] = useState(false)
  const [hiddenOptionIds, setHiddenOptionIds] = useState<Set<number>>(new Set())

  const preloadNextQuestion = useCallback(async () => {
    if (isPreloading || gameOver) return

    console.log('Starting to preload next question...')
    setIsPreloading(true)
    try {
      const data = await getQuestionCharacters(
        gameState.currentRound + 1,
        parsedOptions.useJapaneseTitles,
        parsedOptions.genres,
        parsedOptions.yearRange,
        parsedOptions.difficulty
      )
      console.log('Next question preloaded successfully')
      setNextQuestionData(data)
    } catch (error) {
      console.error('Error preloading next question:', error)
      setNextQuestionData(null)
    } finally {
      setIsPreloading(false)
    }
  }, [isPreloading, gameState.currentRound, parsedOptions, gameOver])

  const loadQuestion = useCallback(async () => {
    console.log('Loading new question...')
    setIsLoading(true)
    setHint(null)
    setCurrentQuestionImage(null)
    setCharacterOptions([])
    setHiddenOptionIds(new Set())

    try {
      let questionData: {
        characters: AnimeCharacter[]
        correctCharacterId: number
        correctAnimeId: number
      }

      if (nextQuestionData) {
        console.log('Using preloaded question data')
        questionData = nextQuestionData
        setNextQuestionData(null)
        preloadNextQuestion()
      } else {
        console.log('No preloaded data, fetching current question data')
        questionData = await getQuestionCharacters(
          gameState.currentRound,
          parsedOptions.useJapaneseTitles,
          parsedOptions.genres,
          parsedOptions.yearRange,
          parsedOptions.difficulty
        )
        preloadNextQuestion()
      }

      const shuffledOptions = [...questionData.characters].sort(
        () => Math.random() - 0.5
      )
      setCharacterOptions(shuffledOptions)
      setCorrectCharacterId(questionData.correctCharacterId)
      setCorrectAnimeId(questionData.correctAnimeId)

      const characterToShow = questionData.characters.find(
        (c) => c.id === questionData.correctCharacterId
      )
      setCurrentQuestionImage(characterToShow?.image.large || null)

      setGameState((prev) => {
        const newLifelines = { ...prev.lifelines }
        const newLifelineUsage = { ...prev.lifelineUsage }

        // Check each lifeline and renew if it's been 3 turns since it was used
        Object.keys(newLifelines).forEach((key) => {
          const lifelineKey = key as keyof typeof newLifelines
          if (
            !newLifelines[lifelineKey] &&
            prev.lifelineUsage[lifelineKey] !== null &&
            prev.currentRound - prev.lifelineUsage[lifelineKey]! >= 3
          ) {
            newLifelines[lifelineKey] = true
            newLifelineUsage[lifelineKey] = null
          }
        })

        return {
          ...prev,
          timeLeft: getTimePerQuestion(parsedOptions.difficulty),
          lifelines: newLifelines,
          lifelineUsage: newLifelineUsage,
        }
      })
    } catch (error) {
      console.error('Error loading question:', error)
      setGameOver(true)
    }
    setIsLoading(false)
    if (!isFetchingHint) {
      setIsTimerRunning(true)
    }
  }, [
    nextQuestionData,
    preloadNextQuestion,
    gameState.currentRound,
    parsedOptions,
    isFetchingHint,
  ])

  useEffect(() => {
    loadQuestion()
  }, [gameState.currentRound])

  useEffect(() => {
    if (
      gameState.timeLeft > 0 &&
      !gameOver &&
      isTimerRunning &&
      !showPauseScreen
    ) {
      const timer = setInterval(() => {
        setGameState((prev) => ({
          ...prev,
          timeLeft: prev.timeLeft - 1,
        }))
      }, 1000)

      return () => clearInterval(timer)
    } else if (gameState.timeLeft === 0 && isTimerRunning && !showPauseScreen) {
      handleWrongAnswer()
    }
  }, [gameState.timeLeft, gameOver, isTimerRunning, showPauseScreen])

  const handleAnswer = (selectedOption: AnimeCharacter) => {
    if (feedback.correctId !== null) return
    setIsTimerRunning(false)

    if (selectedOption.id === correctCharacterId) {
      setFeedback({
        correctId: correctCharacterId,
        selectedId: selectedOption.id,
      })

      setTimeout(() => {
        setGameState((prev) => ({
          ...prev,
          score: prev.score + calculateScore(),
          currentRound: prev.currentRound + 1,
        }))

        if (pendingPause) {
          setShowPauseScreen(true)
          setPendingPause(false)
        }
        setFeedback({ correctId: null, selectedId: null })
      }, 1500)
    } else {
      setFeedback({
        correctId: correctCharacterId,
        selectedId: selectedOption.id,
      })

      setTimeout(() => {
        handleWrongAnswer()
        setFeedback({ correctId: null, selectedId: null })
      }, 1500)
    }
  }

  const handleWrongAnswer = () => {
    setGameState((prev) => ({
      ...prev,
      lives: prev.lives - 1,
    }))

    if (gameState.lives <= 1) {
      setGameOver(true)
      setIsTimerRunning(false)
    } else {
      setTimeout(() => {
        setGameState((prev) => ({
          ...prev,
          currentRound: prev.currentRound + 1,
        }))
        if (pendingPause) {
          setShowPauseScreen(true)
          setPendingPause(false)
        }
      }, 1500)
    }
  }

  const calculateScore = () => {
    const baseScore = 100
    const timeBonus = Math.floor(gameState.timeLeft * 2)
    const difficultyMultiplier = 1 + (gameState.currentRound - 1) * 0.1
    return Math.floor((baseScore + timeBonus) * difficultyMultiplier)
  }

  const requestPause = () => {
    setPendingPause(true)
  }

  const resumeGame = () => {
    setShowPauseScreen(false)
    setPendingPause(false)
    setGameState((prev) => ({
      ...prev,
      timeLeft: getTimePerQuestion(parsedOptions.difficulty),
      isPaused: false,
    }))
    setIsTimerRunning(true)
  }

  const useLifeline = (type: keyof GameState['lifelines']) => {
    setGameState((prev) => ({
      ...prev,
      lifelines: {
        ...prev.lifelines,
        [type]: false,
      },
      lifelineUsage: {
        ...prev.lifelineUsage,
        [type]: prev.currentRound,
      },
    }))
  }

  const handleFiftyFifty = () => {
    if (
      !correctCharacterId ||
      characterOptions.length <= 2 ||
      hiddenOptionIds.size > 0
    )
      return

    const incorrectOptions = characterOptions.filter(
      (opt) => opt.id !== correctCharacterId
    )
    if (incorrectOptions.length < 2) return

    const optionsToHide = incorrectOptions
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)

    setHiddenOptionIds(new Set(optionsToHide.map((opt) => opt.id)))

    useLifeline('fiftyFifty')
  }

  const handleSkip = () => {
    if (!gameState.lifelines.skip) return
    setIsTimerRunning(false)
    useLifeline('skip')
    setFeedback({
      correctId: correctCharacterId,
      selectedId: null,
    })
    setTimeout(() => {
      setGameState((prev) => ({
        ...prev,
        currentRound: prev.currentRound + 1,
      }))
      setFeedback({ correctId: null, selectedId: null })
      if (pendingPause) {
        setShowPauseScreen(true)
        setPendingPause(false)
      }
    }, 1500)
  }

  const handleHint = async () => {
    if (!correctAnimeId || !gameState.lifelines.hint || isFetchingHint || hint)
      return

    setIsTimerRunning(false)
    setIsFetchingHint(true)
    setHint('Fetching hint...')
    useLifeline('hint')

    try {
      const details = await fetchAnimeDetails(correctAnimeId)

      const hintTypes = [
        {
          type: 'studio',
          text: `Produced by ${details.studios?.nodes?.[0]?.name}`,
        },
        {
          type: 'director',
          text: `Directed by ${details.staff?.edges?.find((edge: any) => edge.role === 'Director')?.node.name.full}`,
        },
        { type: 'year', text: `Released in ${details.startDate?.year}` },
        { type: 'genre', text: `Genre: ${details.genres?.[0]}` },
      ]

      const validHints = hintTypes.filter((h) => {
        if (!h.text || h.text.endsWith('undefined')) return false
        switch (h.type) {
          case 'studio':
            return details.studios?.nodes?.[0]?.name
          case 'director':
            return details.staff?.edges?.find(
              (edge: any) => edge.role === 'Director'
            )?.node.name.full
          case 'year':
            return details.startDate?.year
          case 'genre':
            return details.genres?.[0]
          default:
            return false
        }
      })

      if (validHints.length > 0) {
        const randomHint =
          validHints[Math.floor(Math.random() * validHints.length)]
        setHint(randomHint.text)
      } else {
        setHint('Hint unavailable for this anime.')
      }
    } catch (error) {
      console.error('Error fetching hint details:', error)
      setHint('Error fetching hint.')
    }
    setIsFetchingHint(false)
    if (!gameOver && feedback.correctId === null) {
      setIsTimerRunning(true)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    )
  }

  if (gameOver) {
    return (
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Game Over!</h2>
        <p className="text-xl mb-6">Final Score: {gameState.score}</p>
        <button
          onClick={() => (window.location.href = '/')}
          className="bg-accent hover:bg-opacity-80 text-white font-bold py-2 px-4 rounded"
        >
          Play Again
        </button>
      </div>
    )
  }

  if (showPauseScreen) {
    return (
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Game Paused</h2>
        <div className="space-y-4 mb-6">
          <p className="text-xl">Round: {gameState.currentRound}</p>
          <p className="text-xl">Score: {gameState.score}</p>
          <div className="flex justify-center">
            <Lives count={gameState.lives} />
          </div>
        </div>
        <button
          onClick={resumeGame}
          className="bg-accent hover:bg-opacity-80 text-white font-bold py-2 px-4 rounded"
        >
          Resume Game
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-xl">Round: {gameState.currentRound}</div>
        <div className="text-xl">Score: {gameState.score}</div>
        <Lives count={gameState.lives} />
        <button
          onClick={requestPause}
          disabled={pendingPause}
          className={`px-2 py-1 rounded text-sm transition-colors ${
            pendingPause
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-accent hover:bg-opacity-80'
          }`}
        >
          {pendingPause ? (
            <span className="flex items-center space-x-1">
              <span className="animate-pulse">●</span>
              <span>Pause Pending</span>
            </span>
          ) : (
            'Pause After Answer'
          )}
        </button>
      </div>

      <Timer
        timeLeft={gameState.timeLeft}
        totalTime={getTimePerQuestion(parsedOptions.difficulty)}
        warningThreshold={TIMER_WARNING_THRESHOLD}
        blinkThreshold={TIMER_BLINK_THRESHOLD}
      />

      <div className="bg-secondary p-6 rounded-lg min-h-[400px] flex items-center justify-center">
        {isLoading ? (
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
        ) : currentQuestionImage ? (
          <div className="flex justify-center">
            <img
              src={currentQuestionImage}
              alt="Character Image"
              className="max-h-96 w-auto object-contain rounded-lg"
            />
          </div>
        ) : (
          <p>Error loading image.</p>
        )}
      </div>

      {hint && (
        <div className="bg-blue-500/20 p-4 rounded-lg text-center">
          <p
            className={`text-blue-300 ${isFetchingHint ? 'animate-pulse' : ''}`}
          >
            {hint}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {characterOptions.map((option) => {
          const title = option.animeTitle
          const displayTitle = parsedOptions.useJapaneseTitles
            ? title?.romaji
            : title?.english || title?.romaji
          const isHidden = isFetchingHint || hiddenOptionIds.has(option.id)
          return (
            <AnswerOption
              key={option.id}
              id={option.id}
              name={option.name.full}
              anime={displayTitle || 'Unknown Anime'}
              isCorrect={feedback.correctId === option.id}
              isSelected={feedback.selectedId === option.id}
              isDisabled={feedback.correctId !== null}
              isHidden={isHidden}
              onClick={() => handleAnswer(option)}
            />
          )
        })}
      </div>

      <Lifelines
        lifelines={gameState.lifelines}
        lifelineUsage={gameState.lifelineUsage}
        currentRound={gameState.currentRound}
        isDisabled={feedback.correctId !== null || isFetchingHint}
        onFiftyFifty={handleFiftyFifty}
        onSkip={handleSkip}
        onHint={handleHint}
      />
    </div>
  )
}
