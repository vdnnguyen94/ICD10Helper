import { Module } from '@nestjs/common';
import { IcdReadResolver } from './icd-read.resolver';
import { MongoClient } from 'mongodb';

@Module({
  providers: [
    IcdReadResolver,
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
