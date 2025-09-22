/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

@Injectable()
export class TextService {
  private readonly logger = new Logger(TextService.name);

  private genAI: GoogleGenerativeAI;
  private textModel: GenerativeModel;
  private assistantName: string;
  // Simple in-memory history store (per-process). Each message: { role: 'user'|'assistant', text: string, ts: number }
  private messageHistory: Array<{
    role: 'user' | 'assistant';
    text: string;
    ts: number;
  }> = [];
  private maxHistory = 10; // configurable via env if desired

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no configurada');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);

    const modelName =
      this.config.get<string>('GEMINI_TEXT_MODEL') || 'gemini-2.0-flash';
    const temperature = parseFloat(
      this.config.get<string>('GEMINI_TEXT_TEMPERATURE') || '0.7',
    );

    this.textModel = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { temperature },
    });

    this.assistantName =
      this.config.get<string>('CHATBOT_NAME') || 'El maestro de las pelis';
  }

  async generateText(prompt: string, temperature?: number): Promise<string> {
    try {
      if (temperature !== undefined) {
        this.textModel.generationConfig.temperature = temperature;
      }

      const result = await this.textModel.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      this.logger.error(
        'Error generating text with Gemini, using fallback',
        error,
      );
      return this.getFallbackResponse();
    }
  }

  addMessage(role: 'user' | 'assistant', text: string) {
    this.messageHistory.push({ role, text, ts: Date.now() });
    // keep at most maxHistory messages
    if (this.messageHistory.length > this.maxHistory) {
      this.messageHistory.splice(
        0,
        this.messageHistory.length - this.maxHistory,
      );
    }
  }

  getRecentMessages(count = 5) {
    return this.messageHistory.slice(-count);
  }

  formatHistory(count = 5) {
    return this.getRecentMessages(count)
      .map((m) =>
        m.role === 'user' ? `user: ${m.text}` : `assistant: ${m.text}`,
      )
      .join('\n');
  }

  clearHistory() {
    this.messageHistory = [];
  }

  private getFallbackResponse(): string {
    const responses = [
      `Hi, I'm ${this.assistantName}, your movie professional. Could you give me more details?`,
      'I don’t have enough specific information, but I can help you with movies and series.',
      'If your question is not related to movies, unfortunately I can only help with that topic.',
      'For a more precise answer, please consult with a film expert.',
    ];
    return responses[0];
  }
}
