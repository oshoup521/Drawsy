import React, { useState } from 'react';
import { celebrateWinner, celebratePodium } from '../utils/confetti';
import PodiumCelebration from './PodiumCelebration';

const ConfettiTest: React.FC = () => {
  const [showPodium, setShowPodium] = useState(false);

  const mockWinners = [
    { id: '1', name: 'Alice', score: 150, position: 1 },
    { id: '2', name: 'Bob', score: 120, position: 2 },
    { id: '3', name: 'Charlie', score: 100, position: 3 }
  ];

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold">Confetti Test</h2>
      
      <div className="space-x-4">
        <button 
          onClick={celebrateWinner}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Quick Winner Burst
        </button>
        
        <button 
          onClick={celebratePodium}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Podium Celebration
        </button>
        
        <button 
          onClick={() => setShowPodium(true)}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
        >
          Show Podium Modal
        </button>
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