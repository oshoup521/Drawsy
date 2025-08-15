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

  async generateChatSuggestion(message: string, currentWord?: string): Promise<string> {
    try {
      const response = await axios.post(`${this.llmServiceUrl}/generate-chat-suggestion`, {
        message,
        currentWord,
      });
      return response.data.suggestion;
    } catch (error) {
      this.logger.error('Failed to generate chat suggestion:', error.message);
      return "";
    }
  }
}
