import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTypingUsers, useCurrentUser, useGameStore } from '../store/gameStore';

const TypingIndicator: React.FC = () => {
  const typingUsers = useTypingUsers();
  const currentUser = useCurrentUser();
  const { gameState } = useGameStore();

  // Filter out current user and get names
  const otherTypingUsers = typingUsers
    .filter(user => user.userId !== currentUser?.userId)
    .map(user => {
      // Get player name from game state if available
      const player = gameState?.players.find(p => p.userId === user.userId);
      return player ? player.name : user.name;
    });

  if (otherTypingUsers.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (otherTypingUsers.length === 1) {
      return `${otherTypingUsers[0]} is typing`;
    } else if (otherTypingUsers.length === 2) {
      return `${otherTypingUsers[0]} and ${otherTypingUsers[1]} are typing`;
    } else {
      return `${otherTypingUsers.slice(0, -1).join(', ')} and ${otherTypingUsers[otherTypingUsers.length - 1]} are typing`;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className="flex items-center gap-2 px-3 py-1 text-white/60 text-xs bg-white/5 rounded-lg border border-white/10 mx-0"
      >
        <div className="flex gap-1">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            className="w-1 h-1 bg-white/40 rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            className="w-1 h-1 bg-white/40 rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            className="w-1 h-1 bg-white/40 rounded-full"
          />
        </div>
        <span className="italic text-white/50">{getTypingText()}...</span>
      </motion.div>
    </AnimatePresence>
  );
};

export default TypingIndicator;