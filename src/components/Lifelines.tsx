import React from 'react'

interface LifelineButtonProps {
  onClick: () => void
  isDisabled: boolean
  children: React.ReactNode
  icon?: React.ReactNode
}

const LifelineButton: React.FC<LifelineButtonProps> = ({
  onClick,
  isDisabled,
  children,
  icon,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`relative px-4 py-2 rounded bg-secondary transition-all ${
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent'
      }`}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  )
}

interface LifelineStatusProps {
  label: string
  usedAtRound: number | null
  currentRound: number
  cooldown: number
}

const LifelineStatus: React.FC<LifelineStatusProps> = ({
  label,
  usedAtRound,
  currentRound,
  cooldown,
}) => {
  if (usedAtRound === null) {
    return <span></span>
  }

  const roundsUntilAvailable = cooldown - (currentRound - usedAtRound)
  if (roundsUntilAvailable <= 0) {
    return <span className="text-green-400">Recharged</span>
  }

  return (
    <span className="text-yellow-400">
      Available in {roundsUntilAvailable} round
      {roundsUntilAvailable !== 1 ? 's' : ''}
    </span>
  )
}

export interface LifelinesProps {
  available: {
    fiftyFifty: boolean
    skip: boolean
    hint: boolean
  }
  usage: {
    fiftyFifty: number | null
    skip: number | null
    hint: number | null
  }
  currentRound: number
  disabled: boolean
  onFiftyFifty: () => void
  onSkip: () => void
  onHint: () => void
  isHintLoading: boolean
  gamepadIcons?: {
    fiftyFifty: React.ReactNode
    skip: React.ReactNode
    hint: React.ReactNode
  }
}

const LIFELINE_COOLDOWN = 4

export const Lifelines: React.FC<LifelinesProps> = ({
  available,
  usage,
  currentRound,
  disabled,
  onFiftyFifty,
  onSkip,
  onHint,
  isHintLoading,
  gamepadIcons,
}) => {
  const canUseFiftyFifty = available.fiftyFifty && !disabled
  const canUseSkip = available.skip && !disabled
  const canUseHint = available.hint && !disabled && !isHintLoading

  return (
    <div className="bg-primary p-4 rounded-lg shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center space-y-1">
          <LifelineButton
            onClick={onFiftyFifty}
            isDisabled={!canUseFiftyFifty}
            icon={gamepadIcons?.fiftyFifty}
          >
            50/50
          </LifelineButton>
          <div className="text-xs text-gray-400">
            <LifelineStatus
              label="50/50"
              usedAtRound={usage.fiftyFifty}
              currentRound={currentRound}
              cooldown={LIFELINE_COOLDOWN}
            />
          </div>
        </div>

        <div className="text-center space-y-1">
          <LifelineButton
            onClick={onSkip}
            isDisabled={!canUseSkip}
            icon={gamepadIcons?.skip}
          >
            Skip
          </LifelineButton>
          <div className="text-xs text-gray-400">
            <LifelineStatus
              label="Skip"
              usedAtRound={usage.skip}
              currentRound={currentRound}
              cooldown={LIFELINE_COOLDOWN}
            />
          </div>
        </div>

        <div className="text-center space-y-1">
          <LifelineButton
            onClick={onHint}
            isDisabled={!canUseHint}
            icon={gamepadIcons?.hint}
          >
            {isHintLoading ? 'Loading Hint...' : 'Hint'}
          </LifelineButton>
          <div className="text-xs text-gray-400">
            <LifelineStatus
              label="Hint"
              usedAtRound={usage.hint}
              currentRound={currentRound}
              cooldown={LIFELINE_COOLDOWN}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
