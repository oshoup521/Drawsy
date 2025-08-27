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
    console.log('Latest chat message:', latestMessage);
    if (latestMessage?.aiSuggestions && latestMessage.aiSuggestions.length > 0 && !latestMessage.isAI) {
      console.log('Setting AI suggestions:', latestMessage.aiSuggestions);
      setAiSuggestions(latestMessage.aiSuggestions);
    } else {
      console.log('No AI suggestions found or message is from AI');
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

          {/* AI Suggestions - Minimal */}
          <AnimatePresence>
            {aiSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 p-2 bg-white/5 rounded-lg border border-white/10"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60 font-medium flex items-center gap-1">
                    <span className="text-xs">🤖</span>
                    AI:
                  </span>
                  <div className="flex gap-2 flex-1">
                    {aiSuggestions.slice(0, 2).map((suggestion, index) => {
                      const moodStyles = [
                        { emoji: '💚', bg: 'bg-emerald-500/20 hover:bg-emerald-500/30', border: 'border-emerald-500/30' },
                        { emoji: '🤔', bg: 'bg-blue-500/20 hover:bg-blue-500/30', border: 'border-blue-500/30' }
                      ];
                      const mood = moodStyles[index] || moodStyles[0];
                      
                      return (
                        <motion.button
                          key={index}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className={`flex-1 flex items-center gap-1 px-2 py-1 ${mood.bg} rounded border ${mood.border} text-white/90 text-xs hover:text-white transition-all duration-150 hover:scale-[1.02]`}
                          title="Click to use this suggestion"
                        >
                          <span className="text-xs">{mood.emoji}</span>
                          <span className="truncate">{suggestion}</span>
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
