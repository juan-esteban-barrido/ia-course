/* eslint-disable prettier/prettier */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Movie } from './movie.schema';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { GoogleGenAI } from "@google/genai";
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Embedding } from 'src/common/embeddings/embedding.schema';

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name);
  private genAI: GoogleGenerativeAI;
  private embeddingModel: GenerativeModel;
  private textModel: GenerativeModel;

  constructor(
    private config: ConfigService,
    private readonly httpService: HttpService,
    @InjectModel(Embedding.name) private readonly embeddedMovieModel: Model<any>,
  ) { }

  async onModuleInit() {
    await this.initializeModels();
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const embeddingAgent = (this.config.get<string>('DEFUALT_EMBEDDING_AGENT') || 'voyage').toLocaleLowerCase();
    let embedding: number[] | undefined;
    if (embeddingAgent === 'gemini') {
      const value = await this.handleEmbeddingGemini(text);
      embedding = value[0].values;
    } else {
      embedding = await this.handleEmbeddingVoyage(text);
    }

    return embedding as any;
  }

  async createEmbeddingForData(movie: Movie): Promise<Embedding> {
    try {
      const embeddingValue = await this.generateEmbedding(movie.fullplot);
      const value: Embedding = {
        embedding: embeddingValue,
        content: movie?._id || movie.plot,
        metadata: movie,
        category: movie.genres?.[0] || 'unknown',
      }
      await this.uploadEmbedding(value);
      return value;
    } catch (error) {
      console.error('Error en createEmbeddingForData:', error);
    }
  }

  async uploadEmbedding(value: Embedding): Promise<Embedding> {
    const saveValue = await this.embeddedMovieModel.create(value);
    saveValue.save();
    return saveValue;
  }

  async generateText(prompt: string, temperature: number = 0.7): Promise<string> {
    try {
      // Configure max temperature for variability in responses
      this.textModel.generationConfig.temperature = temperature;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout after 30s')), 30000)
      );

      const textPromise = this.textModel.generateContent(prompt);
      const result = await Promise.race([textPromise, timeoutPromise]);
      const response = await result.response;

      return response.text();

    } catch (error) {
      this.logger.error('Error generating text:', error.message);
    }
  }

  async handleEmbeddingGemini(text: string): Promise<any> {
    try {
      this.logger.debug(`🔄 Generating new embedding for: ${text.slice(0, 50)}`);
      const ai = new GoogleGenAI({});
      const model = this.config.get<string>('GEMINI_EMBEDDING_MODEL') || 'models/text-embedding-004';

      const result = await ai.models.embedContent({ model, contents: text });
      const embedding = result.embeddings as any;
      return embedding;
    } catch (error) {
      this.logger.error('Error generating embedding:', error.message);
    }
  }
  private async handleEmbeddingVoyage(text: string): Promise<number[]> {
    const voyageKey = this.config.get<string>('VOYAGE_API_KEY') || '';
    const voyageModel = this.config.get<string>('VOYAGE_EMBEDDING_MODEL') || '';

    if (!voyageKey) {
      this.logger.error('VOYAGE_API_KEY no está configurada');
      throw new Error('VOYAGE_API_KEY no está configurada');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.voyageai.com/v1/embeddings',
          {
            model: voyageModel,
            input: text,
          },
          {
            headers: {
              Authorization: `Bearer ${voyageKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data.data[0].embedding;
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      this.logger.error(`Voyage embedding request failed (status=${status}) - ${data ? JSON.stringify(data) : error.message}`);
      throw error;
    }
  }

  private async initializeModels() {
    try {
      const apiKey = this.config.get<string>('GEMINI_API_KEY');
      const textModel = this.config.get<string>('GEMINI_TEXT_MODEL') || 'gemini-2.0-flash';

      if (!apiKey) {
        throw new Error('GEMINI_API_KEY no está configurada');
      }

      this.genAI = new GoogleGenerativeAI(apiKey);

      if (!this.genAI) {
        throw new Error('genAI failed');
      }

      // Text model configuration
      this.textModel = this.genAI.getGenerativeModel({
        model: textModel,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      });

      if (!this.textModel) {
        throw new Error('genAI embeddingModelName');
      }
      this.logger.log('✅ Connected with Gemini');

    } catch (error) {
      this.logger.error('❌ Error starting Gemini:', error.message);
    }
  }
}