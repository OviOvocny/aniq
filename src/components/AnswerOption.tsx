import React from 'react'

interface AnswerOptionProps {
  id: number
  name: string
  anime: string
  isCorrect: boolean
  isSelected: boolean
  isDisabled: boolean
  isHidden?: boolean
  onClick: () => void
}

export const AnswerOption: React.FC<AnswerOptionProps> = ({
  id,
  name,
  anime,
  isCorrect,
  isSelected,
  isDisabled,
  isHidden = false,
  onClick,
}) => {
  const baseClasses = 'p-4 rounded-lg text-left transition-all duration-200'
  let stateClasses = ''
  let interactionClasses = ''

  if (isCorrect) {
    stateClasses = 'bg-green-600 animate-pulse'
    interactionClasses =
      'ring-2 ring-green-500 shadow-lg shadow-green-500/50 cursor-default'
  } else if (isSelected) {
    stateClasses = 'bg-red-600'
    interactionClasses = 'cursor-default'
  } else {
    stateClasses = 'bg-secondary'
    interactionClasses = isDisabled
      ? 'cursor-not-allowed opacity-70'
      : isHidden
        ? 'cursor-default'
        : 'hover:bg-opacity-80 cursor-pointer'
  }

  // Hide only the text, not the button itself
  const textHiddenClass = isHidden ? 'opacity-0 select-none' : ''

  return (
    <button
      key={id}
      onClick={!isHidden && !isDisabled ? onClick : undefined}
      className={`${baseClasses} ${stateClasses} ${interactionClasses}`}
      disabled={isDisabled || isHidden}
      aria-hidden={isHidden}
    >
      <div className={`font-semibold ${textHiddenClass}`}>{name}</div>
      <div className={`text-sm text-gray-400 ${textHiddenClass}`}>{anime}</div>
    </button>
  )
}
