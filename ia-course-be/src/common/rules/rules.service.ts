/* eslint-disable prettier/prettier */
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Movie } from 'src/common/embeddings/movie.schema';
import { EmbeddingService } from '../embeddings/embeddings.service';
import { Embedding } from 'src/common/embeddings/embedding.schema';
import { ObjectId } from 'mongodb';

@Injectable()
export class RulesService {
  constructor(
    @InjectModel(Movie.name)
    private movieModel: Model<Movie>,
    @InjectModel(Embedding.name)
    private embeddingModel: Model<Embedding>,
    @Inject(forwardRef(() => EmbeddingService))
    private readonly _embeddingService: EmbeddingService
  ) {}

  async getAllMovies(): Promise<any[]> {
    try {
      console.log('[RulesService] ENV MONGODB_URI=', process.env.MONGODB_URI, 'MONGODB_DB=', process.env.MONGODB_DB);
      return await this.movieModel.find().limit(10).exec();
    } catch (error) {
      console.error('Error en getAllMovies:', error);
      return [];
    }
  }

  async findMoviesByQueries(queries: string[], limit: number = 50): Promise<any[]> {
    try {
      if (!Array.isArray(queries) || queries.length === 0) return [];

      const objectIds = queries.map(q => new ObjectId(q))

      if (objectIds.length === 0) return [];

      const results = await this.movieModel.find({ _id: { $in: objectIds } }).limit(limit).exec();
      return results;
    } catch (error) {
      console.error('Error findMoviesByQueries:', error);
      return [];
    }
  }

  async createMovie(movieData: Movie): Promise<Movie> {
    try {
      //Create movie
      const newMovie = new this.movieModel(movieData);
      //Create and save movie embedding
      await this._embeddingService.createEmbeddingForData(newMovie);
      console.log('Movie created and embedded successfully:', newMovie);
      return newMovie.save();
    } catch (error) { 
      throw new Error(`Error creating movie: ${error.message}`);
    }
  }

  async getNearestMoviesByEmbedding(
  queryEmbedding: any,
  field: string = 'embedding',
  limit: number = 10,
): Promise<any[]> {
  try {
    // Build pipeline using the normalized `queryVector` and the provided `field` and `limit`.

    const pipeline = [
      {
        $vectorSearch: {
          index: 'vector_index',
          path: field,
          queryVector: queryEmbedding,
          numCandidates: 10,
          limit: limit,
        },
      },
      {
        $project: {
          content: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
      {
        $lookup: {
          from: 'movies',
          localField: 'content',
          foreignField: '_id',
          as: 'movie',
        },
      },
      {
        $unwind: { path: '$movie', preserveNullAndEmptyArrays: true },
      },
    ];

    const finalValue = await this.embeddingModel.aggregate(pipeline).exec();

    return finalValue;
  } catch (error) {
    console.error('Error en getNearestMoviesByEmbeddingAtlas:', error);
    return [];
  }
  }
}
