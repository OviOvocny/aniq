import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  getQuestionCharacters,
  fetchAnimeDetails,
  type AnimeCharacter,
  type AnimeDetails,
  type AnimeTitle,
  RateLimitError,
} from '../lib/anilist'
import { Timer } from './Timer'
import { Lives } from './Lives'
import { AnswerOption } from './AnswerOption'
import { Lifelines } from './Lifelines'
import type { GameOptions } from './GameOptions'
import { GamepadButtonIcon } from './GamepadButtonIcon'

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
  gamepadEnabled: boolean
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
  titleDisplay: 'romaji',
  difficulty: 'medium',
  timerEnabled: true,
  gamepadEnabled: false,
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

// Timer component for rate limit pause
const RateLimitTimer: React.FC<{
  initialSeconds: number
  onComplete: () => void
}> = ({ initialSeconds, onComplete }) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)

  useEffect(() => {
    if (secondsLeft <= 0) {
      onComplete()
      return
    }

    const intervalId = setInterval(() => {
      setSecondsLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(intervalId)
  }, [secondsLeft, onComplete])

  return (
    <div className="text-2xl font-bold text-accent animate-pulse">
      {Math.max(0, secondsLeft)}s
    </div>
  )
}

export default function Game({
  options: initialOptions = DEFAULT_OPTIONS,
}: GameProps) {
  // Parse options from URL query parameters or use defaults
  const [parsedOptions] = useState<GameOptions>(() => {
    // Check if running in a browser environment
    if (typeof window === 'undefined') {
      return typeof initialOptions === 'object'
        ? initialOptions
        : DEFAULT_OPTIONS
    }

    const params = new URLSearchParams(window.location.search)
    const urlOptions: Partial<GameOptions> = {}

    const genres = params.get('genres')
    if (genres) urlOptions.genres = genres.split(',')

    const yearStartStr = params.get('yearStart')
    const yearEndStr = params.get('yearEnd')
    if (yearStartStr && yearEndStr) {
      const start = parseInt(yearStartStr, 10)
      const end = parseInt(yearEndStr, 10)
      if (!isNaN(start) && !isNaN(end)) {
        urlOptions.yearRange = { start, end }
      }
    }

    const titleDisplay = params.get('titleDisplay') as
      | GameOptions['titleDisplay']
      | null
    if (titleDisplay && ['english', 'romaji', 'both'].includes(titleDisplay)) {
      urlOptions.titleDisplay = titleDisplay
    }

    const difficulty = params.get('difficulty') as
      | GameOptions['difficulty']
      | null
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      urlOptions.difficulty = difficulty
    }

    const timerEnabledStr = params.get('timerEnabled')
    if (timerEnabledStr !== null) {
      urlOptions.timerEnabled = timerEnabledStr === 'true'
    }

    const gamepadEnabledStr = params.get('gamepadEnabled')
    if (gamepadEnabledStr !== null) {
      urlOptions.gamepadEnabled = gamepadEnabledStr === 'true'
    }

    // Merge URL options with defaults, giving precedence to URL options
    // Ensure initialOptions is treated as default if it's not a complete object (e.g., came from props but isn't used)
    const baseOptions =
      typeof initialOptions === 'object' ? initialOptions : DEFAULT_OPTIONS
    return { ...baseOptions, ...urlOptions }
  })

  // Add state for gamepad mode based on parsed options
  const [isGamepadModeActive, setIsGamepadModeActive] = useState(
    parsedOptions.gamepadEnabled
  )

  const [gameState, setGameState] = useState<GameState>(() => ({
    score: 0,
    lives: 3,
    currentRound: 1,
    // Initialize timeLeft based on the final parsedOptions
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
    gamepadEnabled: parsedOptions.gamepadEnabled,
  }))

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
  // Store the absolute reset timestamp (seconds since epoch)
  const [rateLimitResetTimestamp, setRateLimitResetTimestamp] = useState<
    number | null
  >(null)
  const [isRateLimitPausePending, setIsRateLimitPausePending] = useState(false)
  const [isRateLimitPauseActive, setIsRateLimitPauseActive] = useState(false)

  // Refs for debouncing gamepad inputs
  const lastGamepadState = useRef<Gamepad | null>(null)
  const buttonPressed = useRef<{ [key: number]: boolean }>({})
  const axisPressed = useRef<{ [key: number]: boolean }>({})
  const dpadPressed = useRef<{ [key: string]: boolean }>({})

  // --- Lifeline Handlers ---
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
      // Check for pending rate limit pause before proceeding
      if (isRateLimitPausePending) {
        setIsRateLimitPauseActive(true)
        setIsRateLimitPausePending(false)
        setTimeout(() => setShowPauseScreen(true), 2000) // Show pause screen for rate limit after 2 seconds
        console.log('Rate limit pause initiated.')
      } else {
        // Proceed normally if no pause is pending
        if (pendingPause) {
          setShowPauseScreen(true)
          setPendingPause(false)
        } else {
          // Only increment round if not entering manual pause
          setGameState((prev) => ({
            ...prev,
            currentRound: prev.currentRound + 1,
          }))
        }
      }
    }, 1500)
  }

  const handleHint = async () => {
    if (!correctAnimeId || !gameState.lifelines.hint || isFetchingHint || hint)
      return

    setIsTimerRunning(false)
    setIsFetchingHint(true)
    setHint('Fetching hint...')

    try {
      // Fetch details FIRST
      const details = await fetchAnimeDetails(correctAnimeId)

      // Process details and find hints
      const hintTypes = [
        {
          type: 'studio',
          text: details.studios?.nodes?.[0]?.name
            ? `Produced by ${details.studios.nodes[0].name}`
            : null, // Check if data exists
        },
        {
          type: 'director',
          text: details.staff?.edges?.find(
            (edge: any) => edge.role === 'Director'
          )?.node.name.full
            ? `Directed by ${
                details.staff.edges.find(
                  (edge: any) => edge.role === 'Director'
                )!.node.name.full
              }`
            : null,
        },
        {
          type: 'year',
          text: details.startDate?.year
            ? `Released in ${details.startDate.year}`
            : null,
        },
        {
          type: 'genre',
          text: details.genres?.[0] ? `Genre: ${details.genres[0]}` : null,
        },
      ]

      const validHints = hintTypes.filter((h) => h.text) // Filter out null texts

      if (validHints.length > 0) {
        const randomHint =
          validHints[Math.floor(Math.random() * validHints.length)]
        setHint(randomHint.text!) // Use the valid text
        useLifeline('hint') // Consume lifeline ONLY on successful fetch and processing
      } else {
        setHint('Hint unavailable for this anime. Lifeline not used.')
      }
    } catch (error) {
      if (error instanceof RateLimitError) {
        console.warn(
          'Rate limit hit while fetching hint. Hint not shown, lifeline not consumed.'
        )
        setHint('Rate limit hit, hint unavailable. Lifeline not used.')
        // Do NOT consume lifeline
      } else {
        console.error('Error fetching hint details:', error)
        setHint('Error fetching hint. Lifeline not used.')
        // Do NOT consume lifeline
      }
    } finally {
      setIsFetchingHint(false)
      // Only restart timer if game isn't over and feedback isn't showing
      if (!gameOver && feedback.correctId === null) {
        setIsTimerRunning(true)
      }
    }
  }

  // --- Game State/Score/Pause Handlers (Moved Up) ---
  const calculateScore = useCallback(() => {
    const baseScore = 100
    const timeElapsed =
      getTimePerQuestion(parsedOptions.difficulty) - gameState.timeLeft
    const timeBonus = parsedOptions.timerEnabled
      ? Math.floor(Math.max(10 - timeElapsed, 0) * 20)
      : 0
    console.debug('Time bonus:', parsedOptions.timerEnabled, timeBonus)
    const difficultyMultiplier = 1 + (gameState.currentRound - 1) * 0.1
    return Math.floor((baseScore + timeBonus) * difficultyMultiplier)
  }, [
    parsedOptions.difficulty,
    gameState.timeLeft,
    parsedOptions.timerEnabled,
    gameState.currentRound,
  ])

  const handleWrongAnswer = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      lives: prev.lives - 1,
    }))

    if (gameState.lives - 1 <= 0) {
      setGameOver(true)
    } else {
      // Check for pending rate limit pause before proceeding after wrong answer
      if (isRateLimitPausePending) {
        setIsRateLimitPauseActive(true)
        setIsRateLimitPausePending(false)
        setTimeout(() => setShowPauseScreen(true), 2000) // Show pause screen for rate limit after 2 seconds
        console.log('Rate limit pause initiated after wrong answer.')
      } else {
        // Proceed normally if no pause is pending
        if (pendingPause) {
          setShowPauseScreen(true)
          setPendingPause(false)
        } else {
          // Only increment round if not entering manual pause
          setGameState((prev) => ({
            ...prev,
            currentRound: prev.currentRound + 1,
          }))
        }
      }
    }
  }, [gameState.lives, pendingPause, isRateLimitPausePending])

  const requestPause = useCallback(() => {
    setPendingPause(true)
  }, [])

  const resumeGame = useCallback(() => {
    setShowPauseScreen(false)
    setPendingPause(false)
    setGameState((prev) => ({
      ...prev,
      timeLeft: getTimePerQuestion(parsedOptions.difficulty),
      isPaused: false,
    }))
    setIsTimerRunning(true)
  }, [parsedOptions.difficulty])

  // --- Game Action Handlers ---
  const handleAnswer = useCallback(
    (selectedOption: AnimeCharacter) => {
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

          // Check for pending rate limit pause before proceeding
          if (isRateLimitPausePending) {
            setIsRateLimitPauseActive(true)
            setIsRateLimitPausePending(false)
            setTimeout(() => setShowPauseScreen(true), 2000) // Show pause screen for rate limit after 2 seconds
            console.log('Rate limit pause initiated after correct answer.')
          } else {
            // Proceed normally if no pause is pending
            if (pendingPause) {
              setShowPauseScreen(true)
              setPendingPause(false)
            } else {
              // Only increment round if not entering manual pause
              setGameState((prev) => ({
                ...prev,
                score: prev.score + calculateScore(),
                currentRound: prev.currentRound + 1,
              }))
            }
            setFeedback({ correctId: null, selectedId: null })
          }
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
    },
    [
      feedback.correctId,
      correctCharacterId,
      calculateScore,
      pendingPause,
      handleWrongAnswer,
    ]
  )

  // --- Gamepad Action Handlers ---
  const handleGamepadButtonPress = useCallback(
    (buttonIndex: number) => {
      // Don't process input if feedback is showing or paused
      if (feedback.correctId !== null || showPauseScreen) return

      switch (buttonIndex) {
        // Face Buttons (Xbox: A=0, B=1, X=2, Y=3)
        case 0: // A / Cross
          break
        case 1: // B / Circle - Hint Lifeline
          if (gameState.lifelines.hint && !isFetchingHint) handleHint()
          break
        case 2: // X / Square - 50/50 Lifeline
          if (gameState.lifelines.fiftyFifty) handleFiftyFifty()
          break
        case 3: // Y / Triangle - Skip Lifeline
          if (gameState.lifelines.skip) handleSkip()
          break
        // Pause Button (Xbox: Menu=9)
        case 9:
          if (parsedOptions.timerEnabled && !pendingPause && !showPauseScreen) {
            requestPause()
          } else if (showPauseScreen) {
            resumeGame()
          }
          break
        default:
          break
      }
    },
    [
      feedback,
      showPauseScreen,
      gameState.lifelines,
      isFetchingHint,
      parsedOptions.timerEnabled,
      pendingPause,
      handleSkip,
      handleFiftyFifty,
      handleHint,
      requestPause,
      resumeGame,
    ]
  )

  const handleGamepadDpadPress = useCallback(
    (direction: string) => {
      // Don't process input if feedback is showing or paused
      if (feedback.correctId !== null || showPauseScreen) return
      if (!characterOptions || characterOptions.length !== 4) return // Expect 4 options for D-pad mapping

      // Map direction to the character option based on the cross layout
      // We need to know the order/layout of characterOptions when rendered in the cross
      // Assuming: options[0]=Top, options[1]=Left, options[2]=Right, options[3]=Bottom
      let targetOptionIndex = -1
      switch (direction) {
        case 'up':
          targetOptionIndex = 0
          break
        case 'left':
          targetOptionIndex = 1
          break
        case 'right':
          targetOptionIndex = 2
          break
        case 'down':
          targetOptionIndex = 3
          break
      }

      if (targetOptionIndex !== -1 && characterOptions[targetOptionIndex]) {
        const targetOption = characterOptions[targetOptionIndex]
        // Check if this option is hidden by 50/50
        if (!hiddenOptionIds.has(targetOption.id)) {
          handleAnswer(targetOption)
        }
      }
    },
    [feedback, showPauseScreen, characterOptions, hiddenOptionIds, handleAnswer]
  )

  const preloadNextQuestion = useCallback(async () => {
    if (isPreloading || gameOver || isRateLimitPauseActive) return

    console.log('Starting to preload next question...')
    setIsPreloading(true)
    try {
      const data = await getQuestionCharacters(
        gameState.currentRound + 1,
        parsedOptions.titleDisplay,
        parsedOptions.genres,
        parsedOptions.yearRange,
        parsedOptions.difficulty
      )
      console.log('Next question preloaded successfully')
      setNextQuestionData(data)
    } catch (error) {
      console.error('Error preloading next question:', error)
      // Check if it's a RateLimitError
      if (error instanceof RateLimitError) {
        console.warn(
          `Rate limit hit during preload. Pausing for 60s (forced). Reset at ${error.resetTimestamp}`
        )
        setRateLimitResetTimestamp(Math.floor(Date.now() / 1000) + 60) // Always set to 60 seconds from now
        setIsRateLimitPausePending(true) // Only set pending, don't activate pause yet
        setFeedback({ correctId: null, selectedId: null })
      } else {
        // Handle other errors: try again with a replacement question
        // Optionally show a more specific error message to the user
        // Do not end the game, just try to reload
        setIsTimerRunning(false)
        setTimeout(() => loadQuestion(), 500)
      }
      setNextQuestionData(null) // Ensure no stale data is used
    } finally {
      setIsPreloading(false)
    }
  }, [isPreloading, gameState.currentRound, parsedOptions, gameOver])

  const loadQuestion = useCallback(
    async (force = false) => {
      if (isRateLimitPauseActive && !force) return
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
            parsedOptions.titleDisplay,
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
        // Assert error type to safely access response
        if (error instanceof RateLimitError) {
          console.warn(
            `Rate limit hit during question load. Pausing for 60s (forced). Reset at ${error.resetTimestamp}`
          )
          setRateLimitResetTimestamp(Math.floor(Date.now() / 1000) + 60) // Always set to 60 seconds from now
          setIsRateLimitPausePending(true) // Only set pending, don't activate pause yet
          setFeedback({ correctId: null, selectedId: null }) // Clear any lingering feedback so options/lifelines are re-enabled after pause
        } else {
          // On any error, just try to reload a new question after a short delay
          setIsTimerRunning(false)
          setTimeout(() => loadQuestion(), 500)
        }
      }
      setIsLoading(false)
      if (!isFetchingHint) {
        setIsTimerRunning(true)
      }
    },
    [
      nextQuestionData,
      preloadNextQuestion,
      gameState.currentRound,
      parsedOptions,
      isFetchingHint,
    ]
  )

  useEffect(() => {
    loadQuestion()
  }, [gameState.currentRound])

  useEffect(() => {
    if (
      gameState.timeLeft > 0 &&
      !gameOver &&
      isTimerRunning &&
      !showPauseScreen &&
      parsedOptions.timerEnabled
    ) {
      const timer = setInterval(() => {
        setGameState((prev) => ({
          ...prev,
          timeLeft: prev.timeLeft - 1,
        }))
      }, 1000)

      return () => clearInterval(timer)
    } else if (
      gameState.timeLeft === 0 &&
      isTimerRunning &&
      !showPauseScreen &&
      parsedOptions.timerEnabled
    ) {
      handleWrongAnswer()
    }
  }, [
    gameState.timeLeft,
    gameOver,
    isTimerRunning,
    showPauseScreen,
    parsedOptions.timerEnabled,
  ])

  // --- Gamepad Input Handling Effect ---
  useEffect(() => {
    if (
      !isGamepadModeActive ||
      typeof window === 'undefined' ||
      !navigator.getGamepads
    ) {
      return
    }

    let animationFrameId: number | null = null

    const gamepadLoop = () => {
      const gamepads = navigator.getGamepads()
      const gamepad = gamepads[0] // Use the first connected gamepad

      if (gamepad) {
        const now = performance.now()

        // --- Button Handling (Face buttons, Pause, D-pad Buttons) ---
        gamepad.buttons.forEach((button, index) => {
          const wasPressed = buttonPressed.current[index]
          if (button.pressed && !wasPressed) {
            console.log(`Gamepad Button ${index} Pressed`)
            buttonPressed.current[index] = true
            handleGamepadButtonPress(index)
          } else if (!button.pressed && wasPressed) {
            buttonPressed.current[index] = false
          }
        })

        // --- D-pad Handling (Map Axes to D-pad if buttons 12-15 aren't standard) ---
        // Example: Axis 9 often represents hat switch (D-pad)
        // Values typically range from -1 to 1 in discrete steps.
        // This needs refinement based on common gamepad mappings.
        const dpadAxis = gamepad.axes[9]
        const threshold = 0.5 // Sensitivity threshold

        const dpadMap: { [key: number]: string } = {
          12: 'up',
          13: 'down',
          14: 'left',
          15: 'right',
        }

        // Check standard D-pad buttons first
        let dpadAction: string | null = null
        for (const btnIndex in dpadMap) {
          const idx = parseInt(btnIndex, 10)
          if (
            gamepad.buttons[idx]?.pressed &&
            !dpadPressed.current[dpadMap[idx]]
          ) {
            dpadAction = dpadMap[idx]
            dpadPressed.current[dpadMap[idx]] = true
            break // Handle only one D-pad direction at a time
          }
          if (
            !gamepad.buttons[idx]?.pressed &&
            dpadPressed.current[dpadMap[idx]]
          ) {
            dpadPressed.current[dpadMap[idx]] = false
          }
        }

        // Fallback to axis if no D-pad buttons pressed
        if (dpadAction === null && dpadAxis !== undefined) {
          if (dpadAxis < -threshold + 0.1 && dpadAxis > -threshold - 0.1) {
            // ~-0.714 (Up-Left)
            // Could handle diagonals if needed
          } else if (dpadAxis < -threshold) {
            // ~-1.0 (Up)
            if (!dpadPressed.current['up']) {
              dpadAction = 'up'
              dpadPressed.current['up'] = true
            }
          } else if (dpadAxis > threshold + 0.3 && dpadAxis < threshold + 0.5) {
            // ~0.714 (Down-Right)
            // Diagonals
          } else if (dpadAxis > threshold) {
            // ~1.0 (Down)
            if (!dpadPressed.current['down']) {
              dpadAction = 'down'
              dpadPressed.current['down'] = true
            }
          } else if (
            dpadAxis > -threshold + 0.3 &&
            dpadAxis < -threshold + 0.5
          ) {
            // ~-0.143 (Up-Right)
            // Diagonals
          } else if (dpadAxis > 0 && dpadAxis < threshold) {
            // ~0.142 (Right)
            if (!dpadPressed.current['right']) {
              dpadAction = 'right'
              dpadPressed.current['right'] = true
            }
          } else if (dpadAxis < 0 && dpadAxis > -threshold) {
            // ~-0.428 (Left)
            if (!dpadPressed.current['left']) {
              dpadAction = 'left'
              dpadPressed.current['left'] = true
            }
          } else {
            // Neutral state (~ -0.0)
            dpadPressed.current['up'] = false
            dpadPressed.current['down'] = false
            dpadPressed.current['left'] = false
            dpadPressed.current['right'] = false
          }
        }

        if (dpadAction) {
          console.log(`Gamepad D-pad ${dpadAction} Pressed`)
          handleGamepadDpadPress(dpadAction)
        }

        lastGamepadState.current = {
          ...gamepad, // Shallow copy is likely fine here
          buttons: gamepad.buttons.map((b) => ({
            pressed: b.pressed,
            touched: b.touched,
            value: b.value,
          })),
          axes: [...gamepad.axes],
        }
      }

      animationFrameId = requestAnimationFrame(gamepadLoop)
    }

    animationFrameId = requestAnimationFrame(gamepadLoop)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [isGamepadModeActive, handleGamepadButtonPress, handleGamepadDpadPress]) // These should now be defined

  // --- Effect for retrying question fetch after rate limit pause ---
  const handleRateLimitPauseComplete = useCallback(async () => {
    console.log('Rate limit pause finished. Retrying question fetch...')
    setIsLoading(true) // Show loading indicator while fetching
    try {
      // Attempt to load the question again (which might use preloaded or fetch new)
      await loadQuestion(true) // Force a real fetch after rate limit pause
      console.log('Question fetch successful after rate limit pause.')
      // Reset rate limit state and hide pause screen
      setIsRateLimitPauseActive(false)
      // setRateLimitPauseSeconds removed (no longer used)null)
      setShowPauseScreen(false)
      setIsTimerRunning(true) // Resume game timer
    } catch (error) {
      setIsLoading(false) // Hide loading indicator on error
      console.error('Failed to load question after rate limit pause:', error)
      if (error instanceof RateLimitError) {
        // Hit rate limit AGAIN
        console.warn(
          `Rate limit hit again. Scheduling another pause for ${error.retryAfterSeconds}s.`
        )
        // setRateLimitPauseSeconds removed (no longer used)error.retryAfterSeconds)
        setIsRateLimitPauseActive(true) // Stay in pause state
        setShowPauseScreen(true) // Keep pause screen
      } else {
        // Different error, likely fatal
        console.error('Unrecoverable error after rate limit retry.')
        setGameOver(true)
        setShowPauseScreen(false) // Hide pause screen on game over
        setIsRateLimitPauseActive(false)
      }
    }
  }, [loadQuestion]) // Dependency: loadQuestion

  // --- Render Logic ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    )
  }

  if (isRateLimitPauseActive && rateLimitResetTimestamp) {
    // Always use 60 seconds for rate limit pause
    const nowSec = Math.floor(Date.now() / 1000)
    const secondsLeft = Math.max(1, rateLimitResetTimestamp - nowSec)
    return (
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Rate Limit Pause</h2>
        <p className="text-xl">
          Thanks AniList... we will resume shortly. Take a break!
        </p>
        <div className="space-y-4 mb-6">
          <p className="text-xl">Round: {gameState.currentRound}</p>
          <p className="text-xl">Score: {gameState.score}</p>
          <div className="flex justify-center">
            <Lives count={gameState.lives} />
          </div>
        </div>
        <RateLimitTimer
          initialSeconds={secondsLeft}
          onComplete={handleRateLimitPauseComplete}
        />
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
        <div className="flex flex-col flex-1">
          <div className="text-sm opacity-80">
            Round {gameState.currentRound}
          </div>
          <div className="text-lg">Score: {gameState.score}</div>
        </div>
        <Lives count={gameState.lives} />
        <div className="flex flex-1 justify-end">
          {parsedOptions.timerEnabled && (
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
          )}
        </div>
      </div>

      {parsedOptions.timerEnabled && (
        <Timer
          timeLeft={gameState.timeLeft}
          totalTime={getTimePerQuestion(parsedOptions.difficulty)}
          warningThreshold={TIMER_WARNING_THRESHOLD}
          blinkThreshold={TIMER_BLINK_THRESHOLD}
        />
      )}

      {currentQuestionImage && (
        <div className="bg-secondary p-6 rounded-lg h-96 max-h-[45dvh] flex gap-2 flex-col items-center justify-center">
          {isLoading ? (
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
          ) : currentQuestionImage ? (
            <img
              src={currentQuestionImage}
              alt="Character Image"
              className="h-full max-h-96 w-auto object-contain rounded-lg"
            />
          ) : (
            <p>Error loading image.</p>
          )}
          {hint && (
            <div className="bg-secondary border border-accent py-3 px-6 rounded text-center text-sm italic">
              {hint}
            </div>
          )}
        </div>
      )}

      {/* Answer Options Grid - Conditional Layout */}
      <div
        className={
          isGamepadModeActive
            ? 'relative flex flex-col gap-4 justify-center items-center'
            : 'grid grid-cols-1 md:grid-cols-2 gap-4'
        }
      >
        {isGamepadModeActive ? (
          // Gamepad Cross Layout (Top, Left, Right, Bottom)
          <>
            {characterOptions[0] && (
              <div className="flex justify-center items-end flex-1 min-w-[50%]">
                <AnswerOption
                  option={characterOptions[0]}
                  onSelect={handleAnswer}
                  feedback={feedback}
                  isDisabled={feedback.correctId !== null}
                  isHidden={hiddenOptionIds.has(characterOptions[0].id)}
                />
              </div>
            )}
            <div className="flex gap-4 w-full">
              {characterOptions[1] && (
                <div className="flex justify-end items-center flex-1">
                  <AnswerOption
                    option={characterOptions[1]}
                    onSelect={handleAnswer}
                    feedback={feedback}
                    isDisabled={feedback.correctId !== null}
                    isHidden={hiddenOptionIds.has(characterOptions[1].id)}
                  />
                </div>
              )}
              <div className="flex justify-center items-center">
                <GamepadButtonIcon button="dpad" />
              </div>
              {characterOptions[2] && (
                <div className="flex justify-start items-center flex-1">
                  <AnswerOption
                    option={characterOptions[2]}
                    onSelect={handleAnswer}
                    feedback={feedback}
                    isDisabled={feedback.correctId !== null}
                    isHidden={hiddenOptionIds.has(characterOptions[2].id)}
                  />
                </div>
              )}
            </div>
            {characterOptions[3] && (
              <div className="flex justify-center items-start flex-1 min-w-[50%]">
                <AnswerOption
                  option={characterOptions[3]}
                  onSelect={handleAnswer}
                  feedback={feedback}
                  isDisabled={feedback.correctId !== null}
                  isHidden={hiddenOptionIds.has(characterOptions[3].id)}
                />
              </div>
            )}
          </>
        ) : (
          // Standard Layout
          characterOptions.map((option) => (
            <AnswerOption
              key={option.id}
              option={option}
              onSelect={handleAnswer}
              feedback={feedback}
              isDisabled={feedback.correctId !== null}
              isHidden={hiddenOptionIds.has(option.id)}
            />
          ))
        )}
      </div>

      <Lifelines
        available={gameState.lifelines}
        usage={gameState.lifelineUsage}
        currentRound={gameState.currentRound}
        onFiftyFifty={handleFiftyFifty}
        onSkip={handleSkip}
        onHint={handleHint}
        isHintLoading={isFetchingHint}
        disabled={feedback.correctId !== null} // Disable lifelines when feedback is showing
        // Pass gamepad icons if active
        gamepadIcons={
          isGamepadModeActive
            ? {
                fiftyFifty: <GamepadButtonIcon button="faceButtonLeft" />,
                skip: <GamepadButtonIcon button="faceButtonTop" />,
                hint: <GamepadButtonIcon button="faceButtonRight" />,
              }
            : undefined
        }
      />

      {/* Pause Screen / Game Over Screen */}
      {(showPauseScreen || gameOver) && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-secondary p-8 rounded-lg text-center shadow-xl max-w-md w-full">
            {gameOver ? (
              <>
                <h2 className="text-3xl font-bold mb-4 text-red-500">
                  Game Over
                </h2>
                <p className="text-xl mb-6">Final Score: {gameState.score}</p>
                <button
                  onClick={() => window.location.reload()} // Simple way to restart
                  className="bg-accent hover:bg-accent-light text-white font-bold py-2 px-6 rounded transition-colors"
                >
                  Play Again
                </button>
              </>
            ) : isRateLimitPauseActive ? (
              // Rate Limit Pause Content
              <>
                <h2 className="text-3xl font-bold mb-4 text-yellow-500">
                  Rate Limit Active
                </h2>
                <p className="text-lg mb-4">
                  AniList API limit reached. Please wait...
                </p>
                {rateLimitResetTimestamp && (
                  <RateLimitTimer
                    initialSeconds={Math.max(
                      1,
                      rateLimitResetTimestamp - Math.floor(Date.now() / 1000)
                    )}
                    onComplete={handleRateLimitPauseComplete}
                  />
                )}
                <p className="text-sm mt-4 text-gray-400">
                  Retrying automatically...
                </p>
                {/* Resume button is implicitly disabled here */}
              </>
            ) : (
              // Regular Pause Content
              <>
                <h2 className="text-3xl font-bold mb-4">Game Paused</h2>
                <button
                  onClick={resumeGame}
                  className="bg-accent hover:bg-accent-light text-white font-bold py-2 px-6 rounded transition-colors mb-4 mr-2"
                  autoFocus
                >
                  Resume
                </button>
                <button
                  onClick={() => {
                    setGameOver(true)
                    setShowPauseScreen(false)
                  }}
                  className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded transition-colors mb-4"
                >
                  Quit
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
