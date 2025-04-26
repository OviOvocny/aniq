import React from 'react'

interface LifelinesProps {
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
  currentRound: number
  isDisabled: boolean
  onFiftyFifty: () => void
  onSkip: () => void
  onHint: () => void
}

export const Lifelines: React.FC<LifelinesProps> = ({
  lifelines,
  lifelineUsage,
  currentRound,
  isDisabled,
  onFiftyFifty,
  onSkip,
  onHint,
}) => {
  const getTurnsRemaining = (usage: number | null) => {
    if (usage === null) return null
    const turnsPassed = currentRound - usage
    const turnsRemaining = 3 - turnsPassed
    return turnsRemaining > 0 ? turnsRemaining : 0
  }

  return (
    <div className="flex justify-center space-x-4">
      <button
        onClick={onFiftyFifty}
        disabled={!lifelines.fiftyFifty || isDisabled}
        className="px-4 py-2 bg-accent hover:bg-opacity-80 rounded disabled:opacity-50 flex items-center space-x-2"
      >
        <span>50:50</span>
        {!lifelines.fiftyFifty && (
          <span className="text-xs bg-gray-700 px-1 rounded">
            {getTurnsRemaining(lifelineUsage.fiftyFifty)} turns
          </span>
        )}
      </button>
      <button
        onClick={onSkip}
        disabled={!lifelines.skip || isDisabled}
        className="px-4 py-2 bg-accent hover:bg-opacity-80 rounded disabled:opacity-50 flex items-center space-x-2"
      >
        <span>Skip</span>
        {!lifelines.skip && (
          <span className="text-xs bg-gray-700 px-1 rounded">
            {getTurnsRemaining(lifelineUsage.skip)} turns
          </span>
        )}
      </button>
      <button
        onClick={onHint}
        disabled={!lifelines.hint || isDisabled}
        className="px-4 py-2 bg-accent hover:bg-opacity-80 rounded disabled:opacity-50 flex items-center space-x-2"
      >
        <span>Hint</span>
        {!lifelines.hint && (
          <span className="text-xs bg-gray-700 px-1 rounded">
            {getTurnsRemaining(lifelineUsage.hint)} turns
          </span>
        )}
      </button>
    </div>
  )
}
