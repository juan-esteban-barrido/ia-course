// src/common/vector-db/schemas/embedding.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'embedded_movies', timestamps: true })
export class Embedding {
  @Prop({ required: true })
  content: string;

  @Prop({ required: true, type: [Number] })
  embedding: number[];

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ required: false })
  category?: string;
}

export type EmbeddingDocument = Embedding & Document;
export const EmbeddingSchema = SchemaFactory.createForClass(Embedding);
