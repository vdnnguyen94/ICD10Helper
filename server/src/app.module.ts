// server/src/app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { MongoClient } from 'mongodb';  

import { AppResolver } from './app.resolver';
import { ICD10Resolver } from './resolvers/icd10.resolver';
import { CCIResolver } from './resolvers/cci.resolver'; 
import { OpenAIService } from './openai.service';
import { GeminiService } from './gemini.service';
import { CounterService } from './counter/counter.service';
import { CounterResolver } from './resolvers/counter.resolver';
import { Counter, CounterSchema } from './counter/counter.schema';

import { CciEnhancedService } from './cci/cci-enhanced.service';
import { CciEnhancedResolver } from './cci/cci-enhanced.resolver';

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
    // 1) Provide a connected MongoClient
    {
      provide: MongoClient,
      useFactory: async () => {
        const client = new MongoClient(process.env.MONGODB_URI!);
        await client.connect();
        return client;
      },
    },
    // 2) Your other services/resolvers
    AppResolver,
    ICD10Resolver,
    CCIResolver,
    OpenAIService,
    GeminiService,
    CounterService,
    CounterResolver,
    CciEnhancedService,
    CciEnhancedResolver,
  ],
})
export class AppModule {}