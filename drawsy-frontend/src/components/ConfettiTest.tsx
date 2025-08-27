import React, { useState } from 'react';
import { celebrateWinner, celebratePodium } from '../utils/confetti';
import { 
  playCorrectGuessSound, 
  playWrongGuessSound, 
  playWinnerCelebrationSound,
  playLobbyMessageSound,
  playGameMessageSound 
} from '../utils/sounds';
import PodiumCelebration from './PodiumCelebration';
import SoundControls from './SoundControls';

const ConfettiTest: React.FC = () => {
    const [showPodium, setShowPodium] = useState(false);

    const mockWinners = [
        { id: '1', name: 'Alice', score: 150, position: 1 },
        { id: '2', name: 'Bob', score: 120, position: 2 },
        { id: '3', name: 'Charlie', score: 100, position: 3 }
    ];

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Confetti & Sound Test</h2>
                <SoundControls />
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Confetti Effects</h3>
                <div className="space-x-4">
                    <button
                        onClick={celebrateWinner}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        🎉 Quick Winner Burst
                    </button>

                    <button
                        onClick={celebratePodium}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    >
                        🏆 Podium Celebration
                    </button>

                    <button
                        onClick={() => setShowPodium(true)}
                        className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                    >
                        📊 Show Podium Modal
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Sound Effects</h3>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={playCorrectGuessSound}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                        ✅ Correct Guess
                    </button>

                    <button
                        onClick={playWrongGuessSound}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                        ❌ Wrong Guess
                    </button>

                    <button
                        onClick={playWinnerCelebrationSound}
                        className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
                    >
                        🏆 Winner Celebration
                    </button>

                    <button
                        onClick={playLobbyMessageSound}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        💬 Lobby Message
                    </button>

                    <button
                        onClick={playGameMessageSound}
                        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                    >
                        🎮 Game Message
                    </button>
                </div>
            </div>

            {showPodium && (
                <PodiumCelebration
                    winners={mockWinners}
                    onCelebrationComplete={() => setShowPodium(false)}
                />
            )}
        </div>
    );
};

export default ConfettiTest;