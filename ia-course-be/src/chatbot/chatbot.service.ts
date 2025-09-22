/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { TextService } from '../common/text/text.service'; // 👈 Nuevo servicio dedicado
import { EmbeddingService } from '../common/embeddings/embeddings.service';
import { ConfigService } from '@nestjs/config';
import { RulesService } from 'src/common/rules/rules.service';
import { Movie } from 'src/common/embeddings/movie.schema';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly assistantName: string;

  constructor(
    private textService: TextService,
    private config: ConfigService,
    private embeddingService: EmbeddingService,
    private readonly rulesService: RulesService
  ) {
    this.assistantName = this.config.get<string>('CHATBOT_NAME') || 'Cinebot';
  }

  async generateResponse(
    userQuery: string,
    temperature = 0.7,
  ): Promise<string> {
    // Record user message in history
    this.textService.addMessage('user', userQuery);
    let matches = [];
    //Generate embedding for vector search
    if(userQuery.includes('search')) {
      try {
        const queryEmbedding = await this.embeddingService.generateEmbedding(
          userQuery,
        );
        
        //Vector search
        matches = await this.rulesService.getNearestMoviesByEmbedding(
          queryEmbedding,
          'embedding',
        );
        this.logger.log('Matches found:', matches)
      } catch {
        this.logger.error('Error generating embedding or during vector search. Skipping context retrieval.');
      }
    }

    // Get recent history
    const historyText = this.textService.formatHistory(5);
    let prompt = '';

    //Only make vector search if user query includes 'search'
    if(userQuery.includes('search')) {
      const moviesIds: string[] = matches.map(m => m.content);
      const foundMovies = await this.rulesService.findMoviesByQueries(moviesIds);
      const moviesMapped = this.setScoreOnMovie(foundMovies, matches);
      prompt = this.buildPrompt(userQuery, moviesMapped, historyText);
    } else {
      prompt = this.buildPrompt(userQuery, [], historyText);
    }

    this.logger.debug(`Prompt sended:\n${prompt}`);
    const response = await this.textService.generateText(prompt, temperature);
    this.textService.addMessage('assistant', response);

    return response.trim();
  }

  private buildPrompt(
    query: string,
    contexts: any[],
    history?: string,
  ): string {
    const contextText = contexts.length > 0 ? `Relevant context :\n${contexts.join('\n\n')}` : 'I don´t have any specific information on this topic in my knowledge base.';
    return `
<history>
${history}
</history>

<user-question>
User question: "${query}"
</user-question>

<matches>
Matches found: ${contexts.length}
Matches: ${JSON.stringify(contexts)}
</matches>

You are an expert in movies and TV series, acting as a friendly and helpful movie assistant called "${this.assistantName}". 
Your goal is to provide concise, accurate, and conversational answers about movies and series.

Use the following context to answer the user’s question as best as possible:
${contextText}

Important instructions:
1. Always answer in the same language as the user’s question.
2. Focus only on movies and series. If the question is unrelated, politely say you can only help with your area of expertise.
3. Use the context provided to inform your answers.
4. If there isn’t enough information, suggest consulting an expert on the topic.
5. If there are multiple relevant matches, prioritize the most recent ones.
6. Only use the context provided to answer the question. Do not use any other information.
7. Keep answers clear, practical, and conversational (no JSON, lists, or code unless strictly needed).
8. If there is no exact match, recommend the most similar movie found in the context, making clear it’s only approximate.
9. Always recommend **first** the match with the **highest score** from the context.
10. Format any date as "DD of MMMM of YYYY" (example: "October 5, 2023").
11. Present information from matches in natural language, as if you were personally telling it to the user.
12. Show the match score got in contexts when mentioning a movie or series, to indicate how relevant it is to the user's query.
13. Only show the JSON with the movie details when explicitly asked for it by the user.
Answer:
`.trim();

  }

  private setScoreOnMovie(movies: Movie[], matches: any[]): Movie[] {
    const finalMovies: Movie[] = [];
    movies.forEach(movie => {
      const match = matches.find(m => m.content === movie._id.toString());
      if (match && match.score) {
        finalMovies.push({
          ...movie,
          score: match.score,
        });
      }
    });

    // Sort by score descending (highest score first). Coerce missing scores to 0.
    finalMovies.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return finalMovies;
  }
}
