import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WordSelectionModalProps {
  isOpen: boolean;
  topic: string;
  aiWords: string[];
  fallbackWords: string[];
  onWordSelect: (word: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const WordSelectionModal: React.FC<WordSelectionModalProps> = ({
  isOpen,
  topic,
  aiWords,
  fallbackWords,
  onWordSelect,
  onClose,
  isLoading = false,
}) => {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedWord(null);
      setShowFallback(aiWords.length === 0);
    }
  }, [isOpen, aiWords]);

  const handleWordClick = (word: string) => {
    console.log('🎯 Word clicked:', word);
    setSelectedWord(word);
  };

  const handleConfirm = () => {
    console.log('🚀 Start Drawing button clicked!', { selectedWord });
    if (!selectedWord) {
      console.warn('⚠️ No word selected');
      return;
    }
    onWordSelect(selectedWord);
  };

  const handleRandomWord = () => {
    const availableWords = showFallback ? fallbackWords : aiWords;
    if (availableWords.length > 0) {
      const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
      setSelectedWord(randomWord);
    }
  };

  const toggleWordSource = () => {
    setShowFallback(!showFallback);
    setSelectedWord(null);
  };

  const displayWords = showFallback ? fallbackWords : aiWords;
  const hasAIWords = aiWords.length > 0;
  const hasFallbackWords = fallbackWords.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-gradient-to-br from-purple-900/95 to-blue-900/95 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    🎯 Choose Your Word
                  </h2>
                  <p className="text-white/70 text-sm">
                    Topic: <span className="text-green-400 font-semibold">{topic}</span>
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/60 hover:text-white transition-colors text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-y-auto min-h-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                  <p className="text-white/70">Getting AI suggestions...</p>
                </div>
              ) : (
                <>
                  {/* Word Source Toggle */}
                  {hasAIWords && hasFallbackWords && (
                    <div className="flex items-center justify-center mb-6">
                      <div className="flex bg-white/10 rounded-lg p-1">
                        <button
                          onClick={() => !showFallback || toggleWordSource()}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            !showFallback
                              ? 'bg-green-500 text-white shadow-lg'
                              : 'text-white/70 hover:text-white'
                          }`}
                        >
                          🤖 AI Suggestions
                        </button>
                        <button
                          onClick={() => showFallback || toggleWordSource()}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            showFallback
                              ? 'bg-blue-500 text-white shadow-lg'
                              : 'text-white/70 hover:text-white'
                          }`}
                        >
                          📚 Classic Words
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Status Message */}
                  {!hasAIWords && hasFallbackWords && (
                    <div className="mb-6 p-4 rounded-xl bg-yellow-500/20 border border-yellow-400/30">
                      <div className="flex items-center space-x-2">
                        <span className="text-yellow-400">⚠️</span>
                        <span className="text-white font-semibold">AI Unavailable</span>
                      </div>
                      <div className="text-white/70 text-sm mt-1">
                        Using classic word collection instead
                      </div>
                    </div>
                  )}

                  {/* Words Grid */}
                  {displayWords.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                      {displayWords.map((word, index) => (
                        <motion.button
                          key={`${word}-${index}`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleWordClick(word)}
                          className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${
                            selectedWord === word
                              ? 'border-green-400 bg-green-500/20 shadow-lg shadow-green-500/20'
                              : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
                          }`}
                        >
                          <div className="text-white font-semibold capitalize">
                            {word}
                          </div>
                          <div className="text-white/60 text-xs mt-1">
                            {word.length} letters
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">😅</div>
                      <p className="text-white/70">No words available for this topic</p>
                    </div>
                  )}

                  {/* Random Word Button */}
                  {displayWords.length > 0 && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleRandomWord}
                      className="w-full p-3 rounded-xl border-2 border-purple-400/50 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 transition-all mb-3"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-2xl">🎲</span>
                        <span className="text-white font-semibold">Random Word</span>
                      </div>
                      <div className="text-white/70 text-xs mt-1">
                        Let chance decide your challenge
                      </div>
                    </motion.button>
                  )}

                  {/* Selected Word Display */}
                  {selectedWord && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-xl bg-green-500/20 border border-green-400/30 mb-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-400">✓</span>
                          <span className="text-white font-semibold">
                            Selected: <span className="capitalize">{selectedWord}</span>
                          </span>
                        </div>
                        <div className="text-white/60 text-sm">
                          {selectedWord.length} letters
                        </div>
                      </div>
                      <div className="text-white/70 text-sm mt-1">
                        Ready to start drawing!
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row justify-end gap-3 flex-shrink-0">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-lg border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all order-2 sm:order-1"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleConfirm}
                disabled={!selectedWord || isLoading}
                className={`px-6 py-2 rounded-lg font-semibold transition-all order-1 sm:order-2 ${
                  selectedWord && !isLoading
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                Start Drawing!
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WordSelectionModal;