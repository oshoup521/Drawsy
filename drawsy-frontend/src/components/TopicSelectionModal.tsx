import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TopicSelectionModalProps {
  isOpen: boolean;
  onTopicSelect: (topic: string) => void;
  onClose: () => void;
}

const PREDEFINED_TOPICS = [
  { name: 'Animals', icon: '🐾', description: 'Draw creatures from the animal kingdom' },
  { name: 'Food', icon: '🍕', description: 'Delicious dishes and ingredients' },
  { name: 'Objects', icon: '📱', description: 'Everyday items and tools' },
  { name: 'Nature', icon: '🌳', description: 'Plants, landscapes, and natural elements' },
  { name: 'Sports', icon: '⚽', description: 'Games, activities, and equipment' },
  { name: 'Transportation', icon: '🚗', description: 'Vehicles and ways to travel' },
  { name: 'Professions', icon: '👨‍💼', description: 'Jobs and careers' },
  { name: 'Entertainment', icon: '🎬', description: 'Movies, music, and fun activities' },
];

const TopicSelectionModal: React.FC<TopicSelectionModalProps> = ({
  isOpen,
  onTopicSelect,
  onClose,
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedTopic(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleTopicClick = (topic: string) => {
    setSelectedTopic(topic);
  };

  const handleConfirm = async () => {
    if (!selectedTopic) return;
    
    setIsLoading(true);
    try {
      await onTopicSelect(selectedTopic);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRandomTopic = () => {
    const randomTopic = PREDEFINED_TOPICS[Math.floor(Math.random() * PREDEFINED_TOPICS.length)];
    setSelectedTopic(randomTopic.name);
  };

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
                    🎨 Choose Your Drawing Topic
                  </h2>
                  <p className="text-white/70 text-sm">
                    Select a topic and get AI-suggested words to draw!
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {PREDEFINED_TOPICS.map((topic) => (
                  <motion.button
                    key={topic.name}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleTopicClick(topic.name)}
                    className={`p-3 sm:p-4 rounded-xl border-2 transition-all text-left ${
                      selectedTopic === topic.name
                        ? 'border-green-400 bg-green-500/20 shadow-lg shadow-green-500/20'
                        : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="text-2xl mb-2">{topic.icon}</div>
                    <div className="text-white font-semibold text-sm mb-1">
                      {topic.name}
                    </div>
                    <div className="text-white/60 text-xs">
                      {topic.description}
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Random Topic Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRandomTopic}
                className="w-full p-4 rounded-xl border-2 border-yellow-400/50 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 transition-all mb-4"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-2xl">🎲</span>
                  <span className="text-white font-semibold">Surprise Me!</span>
                </div>
                <div className="text-white/70 text-xs mt-1">
                  Let fate choose your topic
                </div>
              </motion.button>

              {/* Selected Topic Display */}
              {selectedTopic && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-green-500/20 border border-green-400/30 mb-4"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-green-400">✓</span>
                    <span className="text-white font-semibold">
                      Selected: {selectedTopic}
                    </span>
                  </div>
                  <div className="text-white/70 text-sm mt-1">
                    AI will suggest words related to this topic
                  </div>
                </motion.div>
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
                disabled={!selectedTopic || isLoading}
                className={`px-6 py-2 rounded-lg font-semibold transition-all order-1 sm:order-2 ${
                  selectedTopic && !isLoading
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Getting Words...</span>
                  </div>
                ) : (
                  'Get Drawing Words'
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TopicSelectionModal;