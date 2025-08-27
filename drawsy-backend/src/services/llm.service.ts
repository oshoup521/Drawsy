import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface AIResponse {
  funnyResponse?: string;
  suggestion?: string;
  topic?: string;
  word?: string;
}

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private readonly llmServiceUrl: string;

  constructor(private configService: ConfigService) {
    this.llmServiceUrl = this.configService.get('LLM_SERVICE_URL') || 'http://localhost:8000';
  }

  async generateFunnyResponse(guess: string, correctWord: string): Promise<string> {
    try {
      const response = await axios.post(`${this.llmServiceUrl}/generate-funny-response`, {
        guess,
        correctWord,
      });
      return response.data.funnyResponse;
    } catch (error) {
      this.logger.error('Failed to generate funny response:', error.message);
      return "Nice try! Keep guessing!";
    }
  }

  async generateWordSuggestion(topic?: string): Promise<{ topic: string; word: string }> {
    try {
      const response = await axios.post(`${this.llmServiceUrl}/generate-word`, {
        topic,
      });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to generate word suggestion:', error.message);
      // Fallback words
      const fallbackWords = [
        { topic: 'Animals', word: 'elephant' },
        { topic: 'Fruits', word: 'banana' },
        { topic: 'Objects', word: 'bicycle' },
        { topic: 'Nature', word: 'mountain' },
      ];
      return fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
    }
  }

  async generateWordsByTopic(topic: string): Promise<{ aiWords: string[]; fallbackWords: string[] }> {
    const fallbackWordsByTopic: Record<string, string[]> = {
      'Animals': ['cat', 'dog', 'elephant', 'lion', 'tiger', 'bear', 'rabbit', 'horse', 'cow', 'pig'],
      'Food': ['pizza', 'burger', 'apple', 'banana', 'cake', 'bread', 'cheese', 'chicken', 'fish', 'rice'],
      'Objects': ['phone', 'car', 'book', 'chair', 'table', 'computer', 'bicycle', 'camera', 'watch', 'key'],
      'Nature': ['tree', 'flower', 'mountain', 'river', 'sun', 'moon', 'cloud', 'rain', 'snow', 'ocean'],
      'Sports': ['football', 'basketball', 'tennis', 'soccer', 'baseball', 'swimming', 'running', 'cycling', 'golf', 'boxing'],
      'Transportation': ['car', 'bus', 'train', 'plane', 'boat', 'bicycle', 'motorcycle', 'truck', 'helicopter', 'subway'],
      'Professions': ['doctor', 'teacher', 'police', 'firefighter', 'chef', 'artist', 'musician', 'engineer', 'lawyer', 'nurse'],
      'Entertainment': ['movie', 'music', 'dance', 'theater', 'game', 'book', 'tv', 'concert', 'party', 'festival'],
    };

    let aiWords: string[] = [];
    
    try {
      const response = await axios.post(`${this.llmServiceUrl}/generate-words-by-topic`, {
        topic,
        count: 10,
      });
      aiWords = response.data.words || [];
    } catch (error) {
      this.logger.error('Failed to generate AI words:', error.message);
    }

    const fallbackWords = fallbackWordsByTopic[topic] || fallbackWordsByTopic['Objects'];
    
    return {
      aiWords,
      fallbackWords,
    };
  }

  async generateChatSuggestion(message: string): Promise<string[]> {
    try {
      this.logger.debug(`Calling LLM service at: ${this.llmServiceUrl}/generate-chat-suggestions`);
      const response = await axios.post(`${this.llmServiceUrl}/generate-chat-suggestions`, {
        message,
        count: 2,
        moods: ['encouraging', 'curious']
      }, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
      this.logger.debug('LLM service response received successfully');
      return response.data.suggestions || [];
    } catch (error) {
      this.logger.error(`Failed to generate chat suggestions from ${this.llmServiceUrl}:`, error.message);
      if (error.code === 'ECONNREFUSED') {
        this.logger.error('LLM service is not reachable. Make sure it\'s running and accessible.');
      }
      // Return fallback suggestions when LLM service is unavailable
      return this.getFallbackSuggestions(message);
    }
  }

  private getFallbackSuggestions(message: string): string[] {
    const messageWords = message.toLowerCase();
    
    // Context-aware fallback suggestions
    if (messageWords.includes('good') || messageWords.includes('nice') || messageWords.includes('great')) {
      return ['Keep up the amazing work!', 'What do you think it could be?', 'This is getting exciting!'];
    } else if (messageWords.includes('hard') || messageWords.includes('difficult')) {
      return ['You\'ve got this!', 'Take your time to observe!', 'The challenge makes it fun!'];
    } else if (messageWords.includes('what') || messageWords.includes('guess')) {
      return ['Great effort!', 'Interesting perspective!', 'Keep the guesses coming!'];
    } else {
      return ['Looking good!', 'What could that be?', 'This is fun!'];
    }
  }
}
