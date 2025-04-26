# AniQ - Anime Character Quiz Game

A progressive anime character quiz game built with Astro, React, and the AniList API. Test your anime knowledge with increasingly difficult questions!

## Features

- Progressive difficulty levels
- Multiple game modes
- Customizable game settings (year range, genres, etc.)
- Time-limited rounds
- Lifeline system
- Beautiful UI with Tailwind CSS
- Deployed on Netlify

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Start the development server:
```bash
pnpm dev
```

3. Build for production:
```bash
pnpm build
```

## Game Modes

- **Popular Anime Mode**: Questions from top-rated anime
- **Year Range Mode**: Questions from specific time periods
- **Genre Mode**: Questions from specific genres
- **Mixed Mode**: Random selection from all available options

## Scoring System

The scoring system is based on:
- Current difficulty level
- Time taken to answer
- Number of lifelines used
- Streak of correct answers

## Technologies Used

- Astro
- React
- Tailwind CSS
- GraphQL (AniList API)
- Netlify (Deployment)