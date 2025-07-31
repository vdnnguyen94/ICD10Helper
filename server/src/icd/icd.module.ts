// src/icd/icd.module.ts

import { Module } from '@nestjs/common';
import { IcdReadResolver } from './icd-read.resolver';
import { IcdAiResolver } from './icd-ai.resolver'; // Import new resolver
import { IcdEnhancedService } from './icd-vector.service'; // Import vector service
import { IcdAiService } from './icd-ai.service'; // Import new AI service
import { OpenAIService } from '../openai.service'; // Assuming openai.service.ts exists at this path
import { MongoClient } from 'mongodb';

@Module({
  providers: [
    // Resolvers
    IcdReadResolver,
    IcdAiResolver, // Add new AI resolver

    // Services
    IcdEnhancedService, // Add the service that does vector search
    IcdAiService,       // Add the new orchestration service
    OpenAIService,      // The OpenAI service must be provided

    // Database Client
    {
      provide: 'ICD_MONGO_CLIENT',
      useFactory: async () => {
        const uri = process.env.MONGODB_URI2;
        if (!uri) throw new Error('MONGODB_URI2 is not defined');
        const client = new MongoClient(uri);
        await client.connect();
        return client;
      }
    }
  ]
})
export class IcdModule {}