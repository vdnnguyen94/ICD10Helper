// server/src/app.module.ts

import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

import { AppResolver } from './app.resolver';
import { ICD10Resolver } from './resolvers/icd10.resolver';
import { OpenAIService } from './openai.service';
import { GeminiService } from './gemini.service';

@Module({
  imports: [
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
  ],
})
export class AppModule {}
