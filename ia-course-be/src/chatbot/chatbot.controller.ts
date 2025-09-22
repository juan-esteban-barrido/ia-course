/* eslint-disable prettier/prettier */
import { Controller, Post, Body, Get } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { RulesService } from 'src/common/rules/rules.service';
import { Movie } from 'src/common/embeddings/movie.schema';

@Controller('chatbot')
export class ChatbotController {
  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly ruleService: RulesService,
  ) { }

  @Post('message')
  async sendMessage(
    @Body('message') message: string,
    @Body('temperature') temperature?: number,
  ): Promise<{ response: string }> {
    const temp = temperature !== undefined ? temperature : 0.7;
    const response = await this.chatbotService.generateResponse(message, temp);
    return { response };
  }

  @Get('movies')
  async getAllMovies(): Promise<any[]> {
    return await this.ruleService.getAllMovies();
  }

  @Post('movie')
  async createMovie(@Body() body: any): Promise<Movie> {
    const movie: Movie = body?.movie ?? body;
    return await this.ruleService.createMovie(movie);
  }
}
