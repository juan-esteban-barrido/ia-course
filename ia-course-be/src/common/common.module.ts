/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { EmbeddingService } from './embeddings/embeddings.service';
import { TextService } from './text/text.service';
import { RulesService } from './rules/rules.service';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { Embedding, EmbeddingSchema } from 'src/common/embeddings/embedding.schema';
import { Movie, MovieSchema } from 'src/common/embeddings/movie.schema';

const services = [
  EmbeddingService, TextService, RulesService
]

@Module({
  providers: [...services],
  imports: [
    MongooseModule.forFeature([
      { name: Embedding.name, schema: EmbeddingSchema },
      { name: Movie.name, schema: MovieSchema },
    ]),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  exports: [...services],
})
export class CommonModule {}