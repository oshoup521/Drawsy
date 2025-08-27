import React from 'react';
import { useNavigate } from 'react-router-dom';
import ConfettiTest from '../components/ConfettiTest';

const SoundTest: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white font-['Fredoka']">
            🎵 Drawsy Sound & Effects Test
          </h1>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary"
          >
            ← Back to Home
          </button>
        </div>

        <div className="glass-card p-8">
          <ConfettiTest />
        </div>

        <div className="glass-card p-6 mt-6">
          <h2 className="text-xl font-bold text-white mb-4">Sound Setup Instructions</h2>
          <div className="text-white/80 space-y-3">
            <p>
              <strong>Step 1:</strong> Add sound files to the <code className="bg-black/30 px-2 py-1 rounded">public/sounds/</code> directory.
            </p>
            <p>
              <strong>Step 2:</strong> Use the HTML generator at <code className="bg-black/30 px-2 py-1 rounded">public/sounds/generate-sounds.html</code> to create basic sounds.
            </p>
            <p>
              <strong>Step 3:</strong> Or download free sounds from sites like Freesound.org and name them according to the README.
            </p>
            <p>
              <strong>Step 4:</strong> Test all sounds using the buttons above.
            </p>
          </div>
        </div>

        <div className="glass-card p-6 mt-6">
          <h2 className="text-xl font-bold text-white mb-4">Required Sound Files</h2>
          <div className="grid grid-cols-2 gap-4 text-white/80">
            <div>
              <h3 className="font-semibold text-white mb-2">Chat Sounds</h3>
              <ul className="space-y-1 text-sm">
                <li>• lobby-message.mp3</li>
                <li>• game-message.mp3</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Game Sounds</h3>
              <ul className="space-y-1 text-sm">
                <li>• correct-guess.mp3</li>
                <li>• wrong-guess.mp3</li>
                <li>• winner-celebration.mp3</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">UI Sounds</h3>
              <ul className="space-y-1 text-sm">
                <li>• game-start.mp3</li>
                <li>• round-start.mp3</li>
                <li>• time-warning.mp3</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Player Sounds</h3>
              <ul className="space-y-1 text-sm">
                <li>• player-join.mp3</li>
                <li>• player-leave.mp3</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoundTest;