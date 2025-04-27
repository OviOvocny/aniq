import React from 'react'

// SVG definitions for common gamepad buttons that are shared across types
const sharedIcons = {
  // D-Pad
  // New generic D-pad icon
  dpad: (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M5 0H11V3.58579L8 6.58579L5 3.58579V0Z" />
      <path d="M3.58579 5H0V11H3.58579L6.58579 8L3.58579 5Z" />
      <path d="M5 12.4142V16H11V12.4142L8 9.41421L5 12.4142Z" />
      <path d="M12.4142 11H16V5H12.4142L9.41421 8L12.4142 11Z" />
    </svg>
  ),
  dpadUp: (
    <svg
      viewBox="0 0 10 10"
      fill="currentColor"
      width="10"
      height="10"
      aria-hidden="true"
    >
      <polygon points="5,0 10,5 0,5" />
    </svg>
  ),
  dpadDown: (
    <svg
      viewBox="0 0 10 10"
      fill="currentColor"
      width="10"
      height="10"
      aria-hidden="true"
    >
      <polygon points="5,10 10,5 0,5" />
    </svg>
  ),
  dpadLeft: (
    <svg
      viewBox="0 0 10 10"
      fill="currentColor"
      width="10"
      height="10"
      aria-hidden="true"
    >
      <polygon points="0,5 5,0 5,10" />
    </svg>
  ),
  dpadRight: (
    <svg
      viewBox="0 0 10 10"
      fill="currentColor"
      width="10"
      height="10"
      aria-hidden="true"
    >
      <polygon points="10,5 5,0 5,10" />
    </svg>
  ),
  // Shoulder and Trigger Buttons
  leftShoulder: (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path d="M21 12v-2a2 2 0 0 0-2-2h-7l-3-4H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2z" />
    </svg>
  ),
  rightShoulder: (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path d="M3 12v-2a2 2 0 0 1 2-2h7l3-4h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2z" />
    </svg>
  ),
  leftTrigger: (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path d="M9 2c-1.105 0-2 .895-2 2v5c0 1.105.895 2 2 2h6c1.105 0 2-.895 2-2V4c0-1.105-.895-2-2-2H9zm-2 12v6c0 1.105.895 2 2 2h6c1.105 0 2-.895 2-2v-6H7z" />
    </svg>
  ),
  rightTrigger: (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path d="M15 2c1.105 0 2 .895 2 2v5c0 1.105-.895 2-2 2H9c-1.105 0-2-.895-2-2V4c0-1.105.895-2 2-2h6zm2 12v6c0 1.105-.895 2-2 2H9c-1.105 0-2-.895-2-2v-6h10z" />
    </svg>
  ),
  // Stick Buttons
  leftStickButton: (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  ),
  rightStickButton: (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  ),
  // Other Buttons (generic names for Start/Select)
  startButton: (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <rect
        x="6"
        y="8"
        width="12"
        height="8"
        rx="1"
      ></rect>
    </svg>
  ),
  selectButton: (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <rect
        x="6"
        y="8"
        width="12"
        height="8"
        rx="1"
      ></rect>
    </svg>
  ),
}

// Specific icons for each gamepad type
const specificIcons = {
  xbox: {
    // Face Buttons (Xbox Style) - Renamed to generic
    // A
    faceButtonBottom: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        width="16"
        height="16"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="#4CAF50"
        />
        <text
          x="50%"
          y="50%"
          dy=".3em"
          textAnchor="middle"
          fill="#4CAF50"
          fontSize="14"
          fontWeight="bold"
        >
          A
        </text>
      </svg>
    ),
    // B
    faceButtonRight: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        width="16"
        height="16"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="#F44336"
        />
        <text
          x="50%"
          y="50%"
          dy=".3em"
          textAnchor="middle"
          fill="#F44336"
          fontSize="14"
          fontWeight="bold"
        >
          B
        </text>
      </svg>
    ),
    // X
    faceButtonLeft: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        width="16"
        height="16"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="#2196F3"
        />
        <text
          x="50%"
          y="50%"
          dy=".3em"
          textAnchor="middle"
          fill="#2196F3"
          fontSize="14"
          fontWeight="bold"
        >
          X
        </text>
      </svg>
    ),
    // Y
    faceButtonTop: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        width="16"
        height="16"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="#FFEB3B"
        />
        <text
          x="50%"
          y="50%"
          dy=".3em"
          textAnchor="middle"
          fill="#FFEB3B"
          fontSize="14"
          fontWeight="bold"
        >
          Y
        </text>
      </svg>
    ),
    // Guide Button (Xbox specific)
    guideButton: (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        width="16"
        height="16"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
        />
        <path
          fill="#FFFFFF"
          d="M11.75 6.17c-.97 0-1.75.78-1.75 1.75s.78 1.75 1.75 1.75 1.75-.78 1.75-1.75-.78-1.75-1.75-1.75zM15 13h-2v3h-2v-3H9v-2h6v2z"
        />
      </svg>
    ),
  },
  playstation: {
    // Face Buttons (PlayStation Style) - Renamed to generic
    // Cross
    faceButtonBottom: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        width="16"
        height="16"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="#2196F3"
        />
        <line
          x1="8"
          y1="12"
          x2="16"
          y2="12"
          stroke="#2196F3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="12"
          y1="8"
          x2="12"
          y2="16"
          stroke="#2196F3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    // Circle
    faceButtonRight: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        width="16"
        height="16"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="#F44336"
        />
      </svg>
    ),
    // Square
    faceButtonLeft: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        width="16"
        height="16"
        aria-hidden="true"
      >
        <rect
          x="4"
          y="4"
          width="16"
          height="16"
          rx="2"
          stroke="#FFEB3B"
          fill="none"
          strokeWidth="2"
        />
      </svg>
    ),
    // Triangle
    faceButtonTop: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        width="16"
        height="16"
        aria-hidden="true"
      >
        <path
          d="M12 4l8 14H4z"
          stroke="#4CAF50"
          fill="none"
          strokeWidth="2"
        />
      </svg>
    ),
    // Other Buttons (PlayStation specific names)
    // Renamed from Start
    optionsButton: (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        width="16"
        height="16"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <line
          x1="8"
          y1="12"
          x2="16"
          y2="12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="12"
          y1="8"
          x2="12"
          y2="16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    // Renamed from Select
    shareButton: (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        width="16"
        height="16"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle
          cx="9"
          cy="12"
          r="1"
          fill="currentColor"
        />
        <circle
          cx="15"
          cy="12"
          r="1"
          fill="currentColor"
        />
        <line
          x1="9"
          y1="12"
          x2="15"
          y2="12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    psButton: (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        width="16"
        height="16"
        aria-hidden="true"
      >
        <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8zm-1-4v-4H9v4H7v-4H5v4H3v-6h2v4h2v-4h2v4h1v-4h2v6h-1zM15 8h-2v8h2z" />
      </svg>
    ),
    touchpadButton: (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        width="16"
        height="16"
        aria-hidden="true"
      >
        <rect
          x="4"
          y="6"
          width="16"
          height="12"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle
          cx="12"
          cy="12"
          r="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    ),
  },
  // Add other gamepad types here as needed
}

type GamepadType = keyof typeof specificIcons
type SharedButtonName = keyof typeof sharedIcons
type XboxSpecificButtonName = keyof typeof specificIcons.xbox
type PlaystationSpecificButtonName = keyof typeof specificIcons.playstation

type ButtonName =
  | SharedButtonName
  | XboxSpecificButtonName
  | PlaystationSpecificButtonName

interface GamepadButtonIconProps {
  /** The name of the gamepad button. Use generic names where possible (e.g., `faceButtonBottom`, `dpadUp`). */
  button: ButtonName
  /** The type of gamepad to display icons for. Defaults to 'xbox'. */
  gamepadType?: GamepadType
  /** Optional additional CSS class names. */
  className?: string
}

export const GamepadButtonIcon: React.FC<GamepadButtonIconProps> = ({
  button,
  gamepadType = 'xbox',
  className = 'inline-block align-middle mx-1 w-4 h-4',
}) => {
  const gamepadSpecificIcons = specificIcons[gamepadType]
  // Check for a gamepad-specific icon first, then fall back to shared icons
  const iconSvg =
    gamepadSpecificIcons?.[button as keyof typeof gamepadSpecificIcons] ||
    sharedIcons[button as keyof typeof sharedIcons]

  if (!iconSvg) {
    // Fallback for unknown buttons or gamepad types
    return (
      <span
        className={`inline-block bg-gray-600 text-white text-xs px-1.5 py-0.5 rounded ${className}`}
        aria-label={`${button} button icon`}
      >
        {button}
      </span>
    )
  }

  return (
    <span
      className={className}
      aria-label={`${button} button icon (${gamepadType} gamepad)`}
      role="img" // Indicate that this is an image for accessibility
    >
      {iconSvg}
    </span>
  )
}
