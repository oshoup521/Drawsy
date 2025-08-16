import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, useIsCurrentUserDrawer } from '../store/gameStore';
import socketService from '../services/socket';
import TopicSelectionModal from './TopicSelectionModal';
import WordSelectionModal from './WordSelectionModal';

interface GameFlowProps {
  children: React.ReactNode;
  timerActive: boolean;
  setTimerActive: (active: boolean) => void;
}

const GameFlow: React.FC<GameFlowProps> = ({ children, timerActive, setTimerActive }) => {
  const { gameState, setCurrentWord, updateGameState } = useGameStore();
  const isCurrentUserDrawer = useIsCurrentUserDrawer();

  // Modal states
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showWordModal, setShowWordModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [aiWords, setAiWords] = useState<string[]>([]);
  const [fallbackWords, setFallbackWords] = useState<string[]>([]);
  const [isLoadingWords, setIsLoadingWords] = useState(false);

  // Timer states are now managed by parent component

  // Socket event handlers
  useEffect(() => {
    const handleGameStarted = (data: any) => {
      console.log('Game started:', data);
      updateGameState((prev) => prev ? { ...prev, status: 'playing' } : null);
    };

    const handleRequestTopicSelection = (data: any) => {
      console.log('Topic selection requested:', data);
      if (isCurrentUserDrawer) {
        setShowTopicModal(true);
      }
    };

    const handleTopicWords = (data: any) => {
      console.log('Received topic words:', data);
      setSelectedTopic(data.topic);
      setAiWords(data.aiWords || []);
      setFallbackWords(data.fallbackWords || []);
      setIsLoadingWords(false);
      setShowTopicModal(false);
      setShowWordModal(true);
    };

    const handleRoundStarted = (data: any) => {
      console.log('🎮 Round started event received:', data);
      setShowWordModal(false);
      setTimerActive(true);
      
      updateGameState((prev) => prev ? {
        ...prev,
        currentRound: data.roundNumber,
        wordLength: data.wordLength,
        topic: data.topic,
      } : null);
      
      console.log('✅ Round started - timer activated, word modal closed');
    };

    const handleDrawerWord = (data: { word: string; topic: string }) => {
      console.log('Drawer word received:', data);
      setCurrentWord(data.word);
    };

    // Register event listeners
    socketService.onGameStarted(handleGameStarted);
    socketService.onRequestTopicSelection(handleRequestTopicSelection);
    socketService.onTopicWords(handleTopicWords);
    socketService.onRoundStarted(handleRoundStarted);
    socketService.onDrawerWord(handleDrawerWord);

    return () => {
      // Clean up listeners
      socketService.removeListener('game_started');
      socketService.removeListener('request_topic_selection');
      socketService.removeListener('topic_words');
      socketService.removeListener('round_started');
      socketService.removeListener('drawer_word');
    };
  }, [isCurrentUserDrawer, updateGameState, setCurrentWord, setTimerActive]);

  // Topic selection handler
  const handleTopicSelect = useCallback(async (topic: string) => {
    setIsLoadingWords(true);
    try {
      socketService.selectTopic(topic);
    } catch (error) {
      console.error('Error selecting topic:', error);
      setIsLoadingWords(false);
    }
  }, []);

  // Word selection handler
  const handleWordSelect = useCallback((word: string) => {
    console.log('🎯 Word selected:', { word, topic: selectedTopic });
    socketService.selectWord(word, selectedTopic);
  }, [selectedTopic]);

  // Timer handlers are now managed by parent component

  // Close modal handlers
  const handleCloseTopicModal = () => {
    setShowTopicModal(false);
  };

  const handleCloseWordModal = () => {
    setShowWordModal(false);
    setSelectedTopic('');
    setAiWords([]);
    setFallbackWords([]);
  };

  return (
    <div className="relative">
      {/* Main Game Content */}
      {children}

      {/* Topic Selection Modal */}
      <TopicSelectionModal
        isOpen={showTopicModal}
        onTopicSelect={handleTopicSelect}
        onClose={handleCloseTopicModal}
      />

      {/* Word Selection Modal */}
      <WordSelectionModal
        isOpen={showWordModal}
        topic={selectedTopic}
        aiWords={aiWords}
        fallbackWords={fallbackWords}
        onWordSelect={handleWordSelect}
        onClose={handleCloseWordModal}
        isLoading={isLoadingWords}
      />

      {/* Waiting for Drawer Notification */}
      <AnimatePresence>
        {gameState?.status === 'playing' && !isCurrentUserDrawer && !timerActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <div className="bg-gradient-to-br from-purple-900/95 to-blue-900/95 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-8 text-center max-w-md">
              <div className="text-6xl mb-4">⏳</div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Waiting for Drawer
              </h3>
              <p className="text-white/70 mb-4">
                The drawer is selecting a topic and word to draw...
              </p>
              <div className="flex justify-center">
                <div className="flex space-x-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                      className="w-2 h-2 bg-white/60 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameFlow;