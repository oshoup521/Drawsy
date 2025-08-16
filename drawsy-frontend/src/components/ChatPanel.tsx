import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, useCurrentUser, useCurrentDrawer } from '../store/gameStore';
import socketService from '../services/socket';

interface ChatPanelProps {
  className?: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ className = '' }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
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
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <h3 className="text-white font-semibold">💬 Chat</h3>
      </div>

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

      {/* Bottom section - inputs and actions */}
      <div className="flex-shrink-0 space-y-3">
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
            💡 Tip: Use the chat to talk with other players and get AI suggestions!
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
