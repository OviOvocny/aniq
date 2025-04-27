import React, { useState, useEffect } from 'react'
import { GameOptions, type GameOptions as GameOptionsType } from './GameOptions'

const DEFAULT_OPTIONS: GameOptionsType = {
  genres: [],
  yearRange: {
    start: 1940,
    end: new Date().getFullYear(),
  },
  titleDisplay: 'romaji',
  difficulty: 'medium',
  timerEnabled: true,
}

export const GameOptionsContainer: React.FC = () => {
  const [options, setOptions] = useState<GameOptionsType>(DEFAULT_OPTIONS)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Load saved options from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aniq_gameOptions')
      if (saved) {
        try {
          const parsedOptions = JSON.parse(saved)
          setOptions(parsedOptions)
        } catch (e) {
          console.error('Error parsing saved options:', e)
        }
      }
    }
    setIsInitialized(true)
  }, [])

  const handleOptionsChange = (newOptions: GameOptionsType) => {
    setOptions(newOptions)
    localStorage.setItem('aniq_gameOptions', JSON.stringify(newOptions))
  }

  const handleStartGame = () => {
    const params = new URLSearchParams()
    if (options.genres.length) params.set('genres', options.genres.join(','))
    if (options.yearRange) {
      params.set('yearStart', options.yearRange.start.toString())
      params.set('yearEnd', options.yearRange.end.toString())
    }
    if (options.titleDisplay) params.set('titleDisplay', options.titleDisplay)
    if (options.difficulty) params.set('difficulty', options.difficulty)
    if (options.timerEnabled !== undefined)
      params.set('timerEnabled', options.timerEnabled.toString())
    window.location.href = `/game?${params.toString()}`
  }

  if (!isInitialized) {
    return null // or a loading spinner
  }

  return (
    <GameOptions
      options={options}
      onOptionsChange={handleOptionsChange}
      onStartGame={handleStartGame}
    />
  )
}
