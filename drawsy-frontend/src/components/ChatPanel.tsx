import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, useCurrentUser } from '../store/gameStore';
import socketService from '../services/socket';
import TypingIndicator from './TypingIndicator';

interface ChatPanelProps {
  className?: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ className = '' }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { chatMessages, gameState, addTypingUser, removeTypingUser } = useGameStore();
  const currentUser = useCurrentUser();

  // Handle typing start
  const handleTypingStart = useCallback(() => {
    if (!currentUser || isTyping) return;
    
    setIsTyping(true);
    socketService.sendTypingStart({
      userId: currentUser.userId,
      name: currentUser.name,
    });
  }, [currentUser, isTyping]);

  // Handle typing stop
  const handleTypingStop = useCallback(() => {
    if (!currentUser || !isTyping) return;
    
    setIsTyping(false);
    socketService.sendTypingStop({
      userId: currentUser.userId,
    });
  }, [currentUser, isTyping]);

  // Setup socket event listeners for typing and AI suggestions
  useEffect(() => {
    const handleTypingStartBroadcast = (data: { userId: string; name: string }) => {
      if (data.userId !== currentUser?.userId) {
        addTypingUser({
          userId: data.userId,
          name: data.name,
          timestamp: Date.now(),
        });
      }
    };

    const handleTypingStopBroadcast = (data: { userId: string }) => {
      removeTypingUser(data.userId);
    };

    const handleAISuggestions = (data: { message: string; suggestions: string[]; senderId: string }) => {
      console.log('🤖 Received AI suggestions:', data);
      
      // Only show AI suggestions if the current user is NOT the sender
      if (currentUser && data.senderId !== currentUser.userId && data.suggestions.length > 0) {
        console.log('✅ SHOWING AI suggestions for other users:', data.suggestions);
        setAiSuggestions(data.suggestions);
      } else {
        console.log('❌ NOT showing AI suggestions - user is sender or no current user');
      }
    };

    socketService.onTypingStart(handleTypingStartBroadcast);
    socketService.onTypingStop(handleTypingStopBroadcast);
    socketService.onAISuggestions(handleAISuggestions);

    return () => {
      socketService.removeListener('typing_start');
      socketService.removeListener('typing_stop');
      socketService.removeListener('ai_suggestions');
    };
  }, [currentUser, addTypingUser, removeTypingUser]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Stop typing when component unmounts
      if (isTyping && currentUser) {
        socketService.sendTypingStop({
          userId: currentUser.userId,
        });
      }
    };
  }, [isTyping, currentUser]);

  // Track container width for responsive AI suggestions layout
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !currentUser) return;

    const message = inputMessage.trim();

    console.log('🚀 Sending message from user:', currentUser.userId);

    // Stop typing when sending message
    if (isTyping) {
      handleTypingStop();
    }

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Clear suggestions immediately when user sends a message
    setAiSuggestions([]);

    // Send message via socket
    socketService.sendChatMessage({
      userId: currentUser.userId,
      message,
    });

    // Clear input after sending
    setInputMessage('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    // Clear suggestions immediately when user clicks a suggestion
    setAiSuggestions([]);
    inputRef.current?.focus();
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlayerName = (userId: string) => {
    if (userId === currentUser?.userId) return 'You';
    if (!gameState) return `Player ${userId.slice(-4)}`;
    const player = gameState.players.find(p => p.userId === userId);
    return player ? player.name : `Player ${userId.slice(-4)}`;
  };

  // Determine if suggestions should be laid out horizontally or vertically
  // Horizontal layout needs at least 480px width to accommodate 2 suggestions properly
  const shouldUseHorizontalLayout = () => {
    return containerWidth >= 480;
  };

  // Determine if we should truncate text based on container width
  const shouldTruncateText = () => {
    return containerWidth < 320; // Very narrow containers need truncation
  };

  return (
    <div ref={containerRef} className={`h-full flex flex-col chat-panel ${className}`}>


      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-4 min-h-0">
        <AnimatePresence>
          {chatMessages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-white/60 py-8"
            >
              <div className="text-4xl mb-2">💭</div>
              <p>No messages yet...</p>
              <p className="text-sm">Start chatting or make your guess!</p>
            </motion.div>
          ) : (
            chatMessages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={`chat-message ${message.isAI ? 'ai-message' : ''} ${
                  message.isCorrectGuess ? 'correct-guess-message' : ''
                } ${message.isIncorrectGuess ? 'incorrect-guess-message' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-semibold text-white text-sm">
                    {message.isAI ? '🤖 AI' : getPlayerName(message.userId)}
                  </span>
                  <span className="text-white/50 text-xs">
                    {formatTime(message.timestamp)}
                  </span>
                </div>

                {/* Show guess info only for incorrect guesses (don't spoil correct answers for other players) */}
                {message.isIncorrectGuess && message.guess && (
                  <div className="mb-2 text-xs text-white/80">
                    {message.playerName && (
                      <span className="font-medium">{message.playerName}</span>
                    )} guessed: <span className="font-mono bg-white/10 px-1 rounded">{message.guess}</span>
                  </div>
                )}

                <p className="text-white/90 text-sm break-words">
                  {message.message}
                </p>
              </motion.div>
            ))
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom section - inputs and actions */}
      <div className="flex-shrink-0 space-y-3">
        {/* Typing Indicator - Above input */}
        <TypingIndicator />
        
        {/* Chat Input Area */}
        <div className="chat-bottom-area">
          {/* Regular Chat Input */}
          <div className="chat-input-container">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => {
                const value = e.target.value;
                setInputMessage(value);
                
                // Clear suggestions when user starts typing their own message
                if (value.length > 0 && aiSuggestions.length > 0) {
                  setAiSuggestions([]);
                }

                // Handle typing indicators
                if (value.trim().length > 0) {
                  // Start typing if not already typing
                  if (!isTyping) {
                    handleTypingStart();
                  }
                  
                  // Reset typing timeout
                  if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                  }
                  
                  // Stop typing after 2 seconds of inactivity
                  typingTimeoutRef.current = setTimeout(() => {
                    handleTypingStop();
                  }, 2000);
                } else {
                  // Stop typing if input is empty
                  if (isTyping) {
                    handleTypingStop();
                  }
                  if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = null;
                  }
                }
              }}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              className="chat-input"
              maxLength={100}
              autoComplete="off"
            />

            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className="chat-send-btn disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send message"
            >
              📤
            </button>
          </div>

          {/* AI Suggestions - Responsive */}
          <AnimatePresence>
            {aiSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 p-2 bg-white/5 rounded-lg border border-white/10 overflow-hidden"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-white/60 font-medium flex items-center gap-1 flex-shrink-0">
                    <span className="text-xs">🤖</span>
                    AI:
                  </span>
                  <div className={`${shouldUseHorizontalLayout() ? 'flex gap-2 flex-wrap' : 'flex flex-col gap-1'} flex-1 min-w-0`}>
                    {aiSuggestions.slice(0, 2).map((suggestion, index) => {
                      const moodStyles = [
                        { emoji: '💚', bg: 'bg-emerald-500/20 hover:bg-emerald-500/30', border: 'border-emerald-500/30' },
                        { emoji: '🤔', bg: 'bg-blue-500/20 hover:bg-blue-500/30', border: 'border-blue-500/30' }
                      ];
                      const mood = moodStyles[index] || moodStyles[0];
                      const isHorizontal = shouldUseHorizontalLayout();
                      const needsTruncation = shouldTruncateText();

                      return (
                        <motion.button
                          key={index}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className={`${
                            isHorizontal ? 'flex-shrink-0' : 'w-full'
                          } inline-flex items-center gap-1 px-2 py-1 ${mood.bg} rounded border ${mood.border} text-white/90 text-xs hover:text-white transition-all duration-150 hover:scale-[1.01] min-w-0 ${
                            isHorizontal ? 'max-w-fit' : 'max-w-full'
                          }`}
                          title={`Click to use: ${suggestion}`}
                        >
                          <span className="text-xs flex-shrink-0">{mood.emoji}</span>
                          <span className={`${
                            needsTruncation || !isHorizontal 
                              ? 'truncate min-w-0' 
                              : 'whitespace-nowrap'
                          }`}>
                            {suggestion}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>




        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
