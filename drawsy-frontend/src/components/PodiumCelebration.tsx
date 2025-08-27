import React, { useEffect } from 'react';
import { celebratePodium, celebrateWinner } from '../utils/confetti';

interface PodiumCelebrationProps {
  winners: Array<{
    id: string;
    name: string;
    score: number;
    position: number;
  }>;
  onCelebrationComplete?: () => void;
}

const PodiumCelebration: React.FC<PodiumCelebrationProps> = ({ 
  winners, 
  onCelebrationComplete 
}) => {
  useEffect(() => {
    // Start confetti immediately when component mounts
    celebratePodium();
    
    // Optional callback after celebration
    if (onCelebrationComplete) {
      const timer = setTimeout(onCelebrationComplete, 3500);
      return () => clearTimeout(timer);
    }
  }, [onCelebrationComplete]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
        <h2 className="text-3xl font-bold mb-6 text-yellow-600">🏆 Winners! 🏆</h2>
        
        <div className="space-y-4">
          {winners.map((winner, index) => (
            <div 
              key={winner.id}
              className={`p-4 rounded-lg ${
                index === 0 ? 'bg-yellow-100 border-2 border-yellow-400' :
                index === 1 ? 'bg-gray-100 border-2 border-gray-400' :
                'bg-orange-100 border-2 border-orange-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                </span>
                <div className="flex-1 mx-4">
                  <div className="font-bold text-lg">{winner.name}</div>
                  <div className="text-sm text-gray-600">{winner.score} points</div>
                </div>
                <span className="text-xl font-bold">#{winner.position}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PodiumCelebration;