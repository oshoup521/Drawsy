# Drawsy Sound Effects

This directory contains sound effects for the Drawsy game.

## Sound Files Needed

The following sound files should be placed in this directory:

### Chat Sounds
- `lobby-message.mp3` - Soft notification sound for lobby chat messages
- `game-message.mp3` - Subtle notification sound for in-game chat messages

### Game Sounds
- `correct-guess.mp3` - Celebratory sound when someone guesses correctly (like "Yay!" or success chime)
- `wrong-guess.mp3` - Gentle "oops" sound for incorrect guesses
- `winner-celebration.mp3` - Triumphant sound for game winners with confetti

### UI Sounds
- `game-start.mp3` - Fanfare sound when game starts
- `round-start.mp3` - Bell or chime for round start
- `time-warning.mp3` - Alert sound for time running out
- `player-join.mp3` - Welcoming sound when player joins
- `player-leave.mp3` - Subtle sound when player leaves

## Generating Sounds

### Option 1: Use the HTML Generator
1. Open `generate-sounds.html` in your browser
2. Click each button to generate and download the sound files
3. Convert the downloaded WAV files to MP3 if needed
4. Place them in this directory

### Option 2: Use Free Sound Resources
You can download free sound effects from:
- [Freesound.org](https://freesound.org)
- [Zapsplat](https://zapsplat.com)
- [BBC Sound Effects](https://sound-effects.bbcrewind.co.uk)

### Option 3: Create Your Own
Use audio editing software like:
- Audacity (free)
- GarageBand (Mac)
- FL Studio
- Adobe Audition

## Sound Guidelines

- Keep files small (under 100KB each)
- Use MP3 format for better browser compatibility
- Keep volume levels consistent
- Duration should be short (0.3-2 seconds) except for celebration sounds
- Test sounds at different volume levels

## Implementation

The sounds are managed by the `SoundManager` class in `src/utils/sounds.ts` and can be controlled by users through the `SoundControls` component.