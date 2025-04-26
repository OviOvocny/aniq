import React from 'react'

interface TimerProps {
  timeLeft: number
  totalTime: number
  warningThreshold: number
  blinkThreshold: number
}

export const Timer: React.FC<TimerProps> = ({
  timeLeft,
  totalTime,
  warningThreshold,
  blinkThreshold,
}) => {
  const timerColor =
    timeLeft <= warningThreshold ? 'text-red-500' : 'text-white'
  const timerBlink = timeLeft <= blinkThreshold ? 'animate-pulse' : ''
  const timerWidth = (timeLeft / totalTime) * 100
  const isTimerReset = timeLeft === totalTime

  return (
    <div className="flex items-center space-x-2">
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${
            isTimerReset ? '' : 'transition-all ease-linear duration-1000'
          } ${timeLeft <= warningThreshold ? 'bg-red-500' : 'bg-green-300'}`}
          style={{ width: `${timerWidth}%` }}
        />
      </div>
      <div className={`w-24 text-xl ${timerColor} ${timerBlink}`}>
        {timeLeft} s
      </div>
    </div>
  )
}
