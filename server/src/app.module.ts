// server/src/app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

import { AppResolver } from './app.resolver';
import { ICD10Resolver } from './resolvers/icd10.resolver';
import { OpenAIService } from './openai.service';
import { GeminiService } from './gemini.service';
import { CounterService } from './counter/counter.service';
import { CounterResolver } from './resolvers/counter.resolver';
import { Counter, CounterSchema } from './counter/counter.schema';
import * as dotenv from 'dotenv';
dotenv.config();

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI!),
    MongooseModule.forFeature([{ name: Counter.name, schema: CounterSchema }]),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
    }),
  ],
  providers: [
    AppResolver,
    ICD10Resolver,
    OpenAIService,
    GeminiService,
    CounterService,
    CounterResolver,
  ],
})
export class AppModule {}