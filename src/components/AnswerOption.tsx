import React from 'react'
import type { AnimeCharacter } from '../lib/anilist' // Ensure this type is imported

export interface AnswerOptionProps {
  option: AnimeCharacter // Use the full object
  onSelect: (option: AnimeCharacter) => void
  feedback: {
    correctId: number | null
    selectedId: number | null
  }
  isDisabled: boolean
  isHidden: boolean
  prefix?: React.ReactNode // Add optional prefix for icon
}

export const AnswerOption: React.FC<AnswerOptionProps> = ({
  option,
  onSelect,
  feedback,
  isDisabled,
  isHidden,
  prefix,
}) => {
  const { id, name, image, animeTitle } = option // Destructure needed fields
  const isCorrect = feedback.correctId === id
  const isSelected = feedback.selectedId === id

  // Determine display title (handle missing title)
  const displayTitle =
    animeTitle?.romaji || animeTitle?.english || 'Unknown Anime'

  const handleClick = () => {
    if (!isDisabled) {
      onSelect(option)
    }
  }

  let buttonClass = `
    flex flex-col items-center p-3 rounded-lg border-2 transition-all w-full text-center
    text-sm min-h-[60px] justify-center
  `
  if (isHidden) {
    buttonClass += ' opacity-0'
  } else if (isSelected) {
    if (isCorrect) {
      buttonClass += ' bg-green-500 border-green-400 text-white animate-pulse'
    } else {
      buttonClass += ' bg-red-500 border-red-400 text-white animate-pulse'
    }
  } else if (feedback.correctId !== null && isCorrect) {
    // Show correct answer if wrong one was selected
    buttonClass += ' bg-green-500 border-green-400 text-white opacity-80'
  } else if (isDisabled && !isSelected) {
    buttonClass += ' bg-gray-700 border-gray-600 opacity-60 cursor-not-allowed'
  } else {
    buttonClass +=
      ' bg-secondary hover:bg-accent border-transparent hover:border-accent-light cursor-pointer'
  }

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={buttonClass}
    >
      {prefix && <span>{prefix}</span>}
      <span className={`font-semibold`}>{name.full}</span>
      <span className={`text-xs mt-1`}>{displayTitle}</span>
    </button>
  )
}
