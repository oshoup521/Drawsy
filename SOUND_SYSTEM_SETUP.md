# 🎵 Drawsy Sound System Setup Guide

This guide explains how to set up and use the comprehensive sound system in your Drawsy game.

## 🎯 Features Implemented

The sound system now includes sounds for all the scenarios you requested:

### 1. **Lobby Chat Messages** 💬
- Plays a gentle notification sound when someone sends a message in the lobby
- Different sound from in-game messages to distinguish context

### 2. **In-Game Chat Messages** 🎮
- Subtle notification sound for messages during gameplay
- Won't interfere with game concentration

### 3. **Correct Guesses** ✅
- Celebratory "Yay!" sound when someone guesses correctly
- Plays alongside the confetti animation
- Higher volume to celebrate success

### 4. **Wrong Guesses** ❌
- Gentle "oops" sound for incorrect guesses
- Encouraging rather than discouraging

### 5. **Winner Celebration** 🏆
- Triumphant sound when winners are announced
- Plays with the winner podium display
- Longer duration for maximum celebration

### Additional Sounds:
- **Game Start** 🚀 - Fanfare when game begins
- **Round Start** 🔔 - Bell sound for new rounds
- **Player Join** 👋 - Welcoming sound for new players
- **Player Leave** 👋 - Subtle departure sound
- **Time Warning** ⏰ - Alert for time running out

## 🛠️ Setup Instructions

### Step 1: Add Sound Files

You need to add MP3 files to the `drawsy-frontend/public/sounds/` directory:

```
public/sounds/
├── lobby-message.mp3      # Lobby chat notification
├── game-message.mp3       # In-game chat notification
├── correct-guess.mp3      # "Yay!" celebration sound
├── wrong-guess.mp3        # "Oops" gentle sound
├── winner-celebration.mp3 # Winner announcement sound
├── game-start.mp3         # Game start fanfare
├── round-start.mp3        # Round start bell
├── time-warning.mp3       # Time running out alert
├── player-join.mp3        # Player joins sound
└── player-leave.mp3       # Player leaves sound
```

### Step 2: Get Sound Files

#### Option A: Use the HTML Generator
1. Open `public/sounds/generate-sounds.html` in your browser
2. Click each button to generate and download basic sound files
3. Convert WAV files to MP3 if needed
4. Place them in the sounds directory

#### Option B: Download Free Sounds
Visit these sites for free sound effects:
- [Freesound.org](https://freesound.org) - Huge library of free sounds
- [Zapsplat](https://zapsplat.com) - Professional sound effects
- [BBC Sound Effects](https://sound-effects.bbcrewind.co.uk) - BBC archive

#### Option C: Create Your Own
Use audio editing software:
- **Audacity** (free) - Great for beginners
- **GarageBand** (Mac) - Easy to use
- **FL Studio** - Professional option

### Step 3: Test the System

1. Visit `/sound-test` in your app to test all sounds
2. Use the sound controls to adjust volume and mute/unmute
3. Test in actual gameplay to ensure timing is right

## 🎛️ Sound Controls

### User Controls
- **Volume Slider**: Adjust overall sound volume (0-100%)
- **Mute Toggle**: Instantly mute/unmute all sounds
- **Test Button**: Preview sounds before gameplay

### Settings Persistence
- User preferences are saved in localStorage
- Settings persist across browser sessions
- Each user can have their own sound preferences

## 🔧 Technical Implementation

### Sound Manager
The `SoundManager` class handles all audio:
- Preloads all sound files for instant playback
- Handles missing files gracefully with fallback system
- Manages volume levels and mute states
- Provides easy-to-use functions for each sound type

### Integration Points
Sounds are integrated at these key moments:

```typescript
// Chat messages
playLobbyMessageSound()    // Lobby chat
playGameMessageSound()     // In-game chat

// Game events
playCorrectGuessSound()    // Correct guess + confetti
playWrongGuessSound()      // Wrong guess
playWinnerCelebrationSound() // Game winner

// UI events
playGameStartSound()       // Game starts
playRoundStartSound()      // Round starts
playPlayerJoinSound()      // Player joins
playPlayerLeaveSound()     // Player leaves
```

### Fallback System
If sound files are missing:
1. Console warning is logged
2. Silent fallback is created to prevent errors
3. Game continues to work normally
4. Users can still control "sounds" (even if silent)

## 🎨 Customization

### Adjusting Sound Timing
Edit the volume and timing in `src/utils/sounds.ts`:

```typescript
// Example: Make correct guess sound louder
export const playCorrectGuessSound = () => 
  soundManager.play('correct-guess', { volume: 0.9 });
```

### Adding New Sounds
1. Add the sound file to `public/sounds/`
2. Add the entry to `soundFiles` object in `SoundManager`
3. Create a convenience function
4. Call it from the appropriate game event

### Sound Guidelines
- **Duration**: Keep most sounds under 2 seconds
- **Volume**: Test at different levels (some users prefer quiet)
- **Format**: MP3 for best browser compatibility
- **Size**: Keep files under 100KB each for fast loading

## 🧪 Testing

### Manual Testing
1. Go to `/sound-test` page
2. Test each sound individually
3. Test volume controls
4. Test mute functionality

### In-Game Testing
1. Create a test game room
2. Have multiple players join/leave
3. Send chat messages in lobby and game
4. Make correct and incorrect guesses
5. Complete a full game to test winner sounds

### Browser Compatibility
- Chrome: Full support
- Firefox: Full support
- Safari: Full support (may require user interaction first)
- Edge: Full support

## 🚀 Deployment Notes

### Production Checklist
- [ ] All 10 sound files are present in `public/sounds/`
- [ ] Sound files are optimized (compressed MP3)
- [ ] Test on different devices and browsers
- [ ] Verify sound controls work correctly
- [ ] Check that mute state persists

### Performance
- Sounds are preloaded for instant playback
- Total audio assets should be under 1MB
- No impact on game performance when muted

## 🎉 Enjoy Your Enhanced Game!

Your Drawsy game now has a complete sound system that will make the experience much more engaging and fun for all players. The sounds provide immediate feedback and enhance the emotional impact of game events.

Players can control their audio experience while you get the satisfaction of a polished, professional-feeling game!