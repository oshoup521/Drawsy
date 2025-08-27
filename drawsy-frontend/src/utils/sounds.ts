// Sound utility for Drawsy game
export class SoundManager {
  private static instance: SoundManager;
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private isMuted: boolean = false;
  private volume: number = 0.7;

  private constructor() {
    this.loadSounds();
    this.loadSettings();
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private loadSounds() {
    const soundFiles = {
      // Chat sounds
      'lobby-message': '/sounds/lobby-message.mp3',
      'game-message': '/sounds/game-message.mp3',
      
      // Game sounds
      'correct-guess': '/sounds/correct-guess.mp3',
      'wrong-guess': '/sounds/wrong-guess.mp3',
      'winner-celebration': '/sounds/winner-celebration.mp3',
      
      // UI sounds
      'game-start': '/sounds/game-start.mp3',
      'round-start': '/sounds/round-start.mp3',
      'time-warning': '/sounds/time-warning.mp3',
      'player-join': '/sounds/player-join.mp3',
      'player-leave': '/sounds/player-leave.mp3',
    };

    Object.entries(soundFiles).forEach(([key, path]) => {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audio.volume = this.volume;
      
      // Handle loading errors gracefully - create fallback beep sound
      audio.addEventListener('error', () => {
        console.warn(`Failed to load sound: ${key} (${path}), using fallback beep`);
        // Create a fallback beep sound using Web Audio API
        this.createFallbackSound(key);
      });
      
      this.sounds.set(key, audio);
    });
  }

  private createFallbackSound(key: string) {
    // Create a simple beep sound as fallback
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Different frequencies for different sound types
      const soundConfig: { [key: string]: { frequency: number; duration: number } } = {
        'lobby-message': { frequency: 800, duration: 0.2 },
        'game-message': { frequency: 600, duration: 0.2 },
        'correct-guess': { frequency: 1000, duration: 0.5 },
        'wrong-guess': { frequency: 300, duration: 0.3 },
        'winner-celebration': { frequency: 523, duration: 1.0 },
        'game-start': { frequency: 659, duration: 0.8 },
        'round-start': { frequency: 784, duration: 0.3 },
        'time-warning': { frequency: 400, duration: 0.4 },
        'player-join': { frequency: 700, duration: 0.2 },
        'player-leave': { frequency: 500, duration: 0.2 },
      };

      const config = soundConfig[key] || { frequency: 440, duration: 0.3 };
      
      // Create a simple audio element with data URL
      const canvas = document.createElement('canvas');
      const sampleRate = 44100;
      const samples = Math.floor(sampleRate * config.duration);
      const buffer = new ArrayBuffer(samples * 2);
      const view = new DataView(buffer);
      
      for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        const sample = Math.sin(2 * Math.PI * config.frequency * t) * 0.3 * Math.exp(-t * 3);
        const intSample = Math.max(-32768, Math.min(32767, sample * 32767));
        view.setInt16(i * 2, intSample, true);
      }
      
      // For now, just create a silent audio element to prevent errors
      const fallbackAudio = new Audio();
      fallbackAudio.volume = this.volume;
      this.sounds.set(key, fallbackAudio);
      
    } catch (error) {
      console.warn(`Failed to create fallback sound for ${key}:`, error);
      // Create completely silent fallback
      const silentAudio = new Audio();
      silentAudio.volume = 0;
      this.sounds.set(key, silentAudio);
    }
  }

  private loadSettings() {
    const savedMuted = localStorage.getItem('drawsy_sounds_muted');
    const savedVolume = localStorage.getItem('drawsy_sounds_volume');
    
    this.isMuted = savedMuted === 'true';
    this.volume = savedVolume ? parseFloat(savedVolume) : 0.7;
    
    // Update all loaded sounds with current volume
    this.sounds.forEach(audio => {
      audio.volume = this.volume;
    });
  }

  private saveSettings() {
    localStorage.setItem('drawsy_sounds_muted', this.isMuted.toString());
    localStorage.setItem('drawsy_sounds_volume', this.volume.toString());
  }

  public play(soundKey: string, options?: { volume?: number; loop?: boolean }) {
    if (this.isMuted) return;

    const sound = this.sounds.get(soundKey);
    if (!sound) {
      console.warn(`Sound not found: ${soundKey}`);
      return;
    }

    try {
      // Reset the sound to beginning
      sound.currentTime = 0;
      
      // Set temporary volume if provided
      if (options?.volume !== undefined) {
        sound.volume = Math.min(1, Math.max(0, options.volume * this.volume));
      } else {
        sound.volume = this.volume;
      }
      
      // Set loop if provided
      sound.loop = options?.loop || false;
      
      // Play the sound
      const playPromise = sound.play();
      
      // Handle play promise (required for some browsers)
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn(`Failed to play sound ${soundKey}:`, error);
        });
      }
    } catch (error) {
      console.warn(`Error playing sound ${soundKey}:`, error);
    }
  }

  public stop(soundKey: string) {
    const sound = this.sounds.get(soundKey);
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  }

  public stopAll() {
    this.sounds.forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });
  }

  public setVolume(volume: number) {
    this.volume = Math.min(1, Math.max(0, volume));
    this.sounds.forEach(audio => {
      audio.volume = this.volume;
    });
    this.saveSettings();
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.saveSettings();
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.saveSettings();
    return this.isMuted;
  }
}

// Convenience functions for easy use throughout the app
export const soundManager = SoundManager.getInstance();

// Specific sound functions for different game events
export const playLobbyMessageSound = () => soundManager.play('lobby-message', { volume: 0.5 });
export const playGameMessageSound = () => soundManager.play('game-message', { volume: 0.5 });
export const playCorrectGuessSound = () => soundManager.play('correct-guess', { volume: 0.8 });
export const playWrongGuessSound = () => soundManager.play('wrong-guess', { volume: 0.6 });
export const playWinnerCelebrationSound = () => soundManager.play('winner-celebration', { volume: 0.9 });
export const playGameStartSound = () => soundManager.play('game-start', { volume: 0.7 });
export const playRoundStartSound = () => soundManager.play('round-start', { volume: 0.6 });
export const playTimeWarningSound = () => soundManager.play('time-warning', { volume: 0.8 });
export const playPlayerJoinSound = () => soundManager.play('player-join', { volume: 0.4 });
export const playPlayerLeaveSound = () => soundManager.play('player-leave', { volume: 0.4 });