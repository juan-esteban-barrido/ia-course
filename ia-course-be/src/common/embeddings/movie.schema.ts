/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/common/vector-db/schemas/movie.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ collection: 'movies', timestamps: true })
export class Movie {
  @Prop({ required: true })
  plot: string;
  
  _id?: string

  @Prop({ type: [String], default: [] })
  genres: string[];

  @Prop()
  runtime: number;

  @Prop()
  rated: string;

  @Prop()
  cast: string[];

  @Prop()
  num_mflix_comments: number;

  @Prop()
  poster: string;

  @Prop()
  title: string;

  @Prop()
  fullplot: string;

  @Prop()
  languages: string[];

  @Prop()
  released: Date;

  @Prop()
  directors: string[];

  @Prop()
  writers: string[];

  // Define awards as a nested object with explicit schema
  @Prop({
    type: {
      wins: Number,
      nominations: Number,
      text: String
    },
    default: {}
  })
  awards: {
    wins?: number;
    nominations?: number;
    text?: string;
  };

  @Prop()
  lastupdated: string;

  @Prop()
  year: number;

  // Define imdb as a nested object with explicit schema
  @Prop({
    type: {
      rating: Number,
      votes: Number,
      id: Number
    },
    default: {}
  })
  imdb: {
    rating?: number;
    votes?: number;
    id?: number;
  };

  @Prop()
  countries: string[];

  @Prop()
  type: string;

  // Define tomatoes as a nested object with explicit schema
  @Prop({
    type: {
      viewer: {
        rating: Number,
        numReviews: Number,
        meter: Number
      },
      production: String,
      lastUpdated: Date
    },
    default: {}
  })
  tomatoes: {
    viewer?: {
      rating?: number;
      numReviews?: number;
      meter?: number;
    };
    production?: string;
    lastUpdated?: Date;
  };

  score?: number;
}

export type MovieDocument = Movie & Document;
export const MovieSchema = SchemaFactory.createForClass(Movie);

// Ensure unique imdb id and title+year combination at the DB level
MovieSchema.index({ 'imdb.id': 1 }, { unique: true, sparse: true });
MovieSchema.index({ title: 1, year: 1 }, { unique: true, sparse: true });