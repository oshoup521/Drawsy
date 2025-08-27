import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { soundManager } from '../utils/sounds';

interface SoundControlsProps {
  className?: string;
}

const SoundControls: React.FC<SoundControlsProps> = ({ className = '' }) => {
  const [isMuted, setIsMuted] = useState(soundManager.isSoundMuted());
  const [volume, setVolume] = useState(soundManager.getVolume());
  const [showControls, setShowControls] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMuted(soundManager.isSoundMuted());
    setVolume(soundManager.getVolume());
  }, []);

  // Calculate dropdown position when showing
  useEffect(() => {
    if (showControls && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showControls]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowControls(false);
      }
    };

    if (showControls) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showControls]);

  const handleToggleMute = () => {
    const newMuted = soundManager.toggleMute();
    setIsMuted(newMuted);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    soundManager.setVolume(newVolume);
  };

  const testSound = () => {
    soundManager.play('correct-guess');
  };

  const dropdownContent = showControls && (
    <div 
      ref={dropdownRef}
      className="fixed bg-gray-900 rounded-lg p-4 shadow-2xl border border-white/30 min-w-[200px] max-w-[250px] backdrop-blur-sm transition-all duration-200 ease-out transform scale-100 opacity-100"
      style={{
        top: dropdownPosition.top,
        right: dropdownPosition.right,
        zIndex: 999999,
      }}
    >
      {/* Arrow pointing up to the button */}
      <div className="absolute -top-2 right-4 w-4 h-4 bg-gray-900 border-l border-t border-white/30 transform rotate-45"></div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-white text-sm">Sound Effects</span>
          <button
            onClick={handleToggleMute}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              isMuted 
                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' 
                : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
            }`}
          >
            {isMuted ? 'Muted' : 'On'}
          </button>
        </div>

        {!isMuted && (
          <div className="space-y-2">
            <label className="text-white text-sm block">Volume</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-white/60">
              <span>0%</span>
              <span>{Math.round(volume * 100)}%</span>
              <span>100%</span>
            </div>
          </div>
        )}

        <button
          onClick={testSound}
          disabled={isMuted}
          className="w-full px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 disabled:bg-gray-500/20 disabled:text-gray-400 text-blue-300 rounded text-sm transition-colors"
        >
          Test Sound
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className={className}>
        <button
          ref={buttonRef}
          onClick={() => setShowControls(!showControls)}
          className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white"
          title="Sound Settings"
        >
          <span className="text-lg">
            {isMuted ? '🔇' : volume > 0.5 ? '🔊' : volume > 0 ? '🔉' : '🔈'}
          </span>
          <span className="text-sm hidden sm:inline">Sound</span>
        </button>
      </div>
      
      {/* Render dropdown in a portal to avoid z-index issues */}
      {typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </>
  );
};

export default SoundControls;