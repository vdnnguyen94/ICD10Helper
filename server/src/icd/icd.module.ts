// src/icd/icd.module.ts

import { Module } from '@nestjs/common';
import { IcdReadResolver } from './icd-read.resolver';
import { IcdAiResolver } from './icd-ai.resolver';
import { IcdEnhancedService } from './icd-vector.service';
import { IcdAiService } from './icd-ai.service';
import { IcdEnhancedResolver } from './icd-enhanced.resolver';
import { OpenAIService } from '../openai.service';
import { MongoClient } from 'mongodb';

@Module({
  providers: [
    // Resolvers
    IcdReadResolver, // This is now a dependency for IcdAiService
    IcdAiResolver,
    IcdEnhancedResolver,
    // Services
    IcdEnhancedService,
    IcdAiService,
    OpenAIService,

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