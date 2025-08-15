import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, useCurrentUser, useCurrentDrawer } from '../store/gameStore';
import socketService from '../services/socket';

interface ChatPanelProps {
  className?: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ className = '' }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [guessMessage, setGuessMessage] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const guessRef = useRef<HTMLInputElement>(null);

  const { chatMessages, gameState } = useGameStore();
  const currentUser = useCurrentUser();
  const currentDrawer = useCurrentDrawer();
  
  const isGamePlaying = gameState?.status === 'playing';
  const isCurrentUserDrawer = currentUser?.userId === currentDrawer?.userId;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Extract AI suggestions from new messages
  useEffect(() => {
    const latestMessage = chatMessages[chatMessages.length - 1];
    if (latestMessage?.aiSuggestion && !latestMessage.isAI) {
      setAiSuggestions(prev => {
        const newSuggestions = [latestMessage.aiSuggestion!];
        // Keep only the last 3 suggestions to avoid clutter
        return [...prev, ...newSuggestions].slice(-3);
      });
    }
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !currentUser) return;

    const message = inputMessage.trim();
    
    console.log('📤 Sending chat message:', { userId: currentUser.userId, message });
    
    // Send message via socket
    socketService.sendChatMessage({
      userId: currentUser.userId,
      message,
    });

    // Clear input and suggestions after sending
    setInputMessage('');
    setAiSuggestions([]);
    inputRef.current?.focus();
  };

  const handleSendGuess = () => {
    if (!guessMessage.trim() || !currentUser || !gameState?.roomId) return;

    const guess = guessMessage.trim();
    
    console.log('📤 Sending guess:', { userId: currentUser.userId, guess });
    
    // Send guess via socket
    socketService.sendGuess({
      userId: currentUser.userId,
      guess,
    });

    // Clear guess input
    setGuessMessage('');
    guessRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleGuessKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendGuess();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
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

  return (
    <div className={`chat-panel ${className}`}>
      {/* Messages */}
      <div className="chat-messages">
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
                className={`chat-message ${message.isAI ? 'ai-message' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-semibold text-white text-sm">
                    {message.isAI ? '🤖 AI' : getPlayerName(message.userId)}
                  </span>
                  <span className="text-white/50 text-xs">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                
                <p className="text-white/90 text-sm break-words">
                  {message.message}
                </p>
              </motion.div>
            ))
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Guessing Area - Only shown during game for non-drawers */}
      {isGamePlaying && !isCurrentUserDrawer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="guess-area"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-blue-300 font-semibold text-sm">🎯 Make Your Guess:</span>
            {gameState?.wordLength && (
              <span className="text-white/60 text-xs">
                ({gameState.wordLength} letters)
              </span>
            )}
          </div>
          
          <div className="guess-input-container">
            <input
              ref={guessRef}
              type="text"
              value={guessMessage}
              onChange={(e) => setGuessMessage(e.target.value)}
              onKeyPress={handleGuessKeyPress}
              placeholder="What do you think it is?"
              className="guess-input"
              maxLength={50}
              autoComplete="off"
            />
            
            <button
              onClick={handleSendGuess}
              disabled={!guessMessage.trim()}
              className="guess-btn"
            >
              Guess!
            </button>
          </div>
          
          <div className="guess-tip">
            💡 Tip: Look at the drawing and type what you think it represents!
          </div>
        </motion.div>
      )}

      {/* Chat Input Area */}
      <div className="chat-bottom-area">
        {/* Regular Chat Input */}
        <div className="chat-input-container">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isGamePlaying && !isCurrentUserDrawer ? "Chat with other players..." : "Type your message..."}
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

        {/* AI Suggestions */}
        <AnimatePresence>
          {aiSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 p-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-400/30"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-purple-300 font-semibold">🤖 AI Suggestions:</span>
                <span className="text-xs text-white/50">(Click to use)</span>
              </div>
              <div className="ai-suggestions-container">
                <div className="space-y-2">
                  {aiSuggestions.map((suggestion, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left p-2 bg-white/10 hover:bg-white/20 rounded text-white/90 text-sm transition-colors border border-white/10 hover:border-purple-400/50"
                    >
                      💬 {suggestion}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Actions */}
        <div className="chat-quick-actions">
          <button
            onClick={() => handleSuggestionClick('Nice drawing!')}
            className="chat-quick-button"
          >
            👍 Nice!
          </button>
          <button
            onClick={() => handleSuggestionClick('What is this?')}
            className="chat-quick-button"
          >
            🤔 What?
          </button>
          <button
            onClick={() => handleSuggestionClick('Hard to guess!')}
            className="chat-quick-button"
          >
            😅 Hard!
          </button>
        </div>

        {/* Typing Indicator */}
        <div className="chat-tip">
          💡 Tip: Type your guesses here! AI will help with fun responses.
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
