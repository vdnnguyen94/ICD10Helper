// server/src/scripts/testVectorSearch.ts

import * as dotenv from 'dotenv';
dotenv.config();

import { MongoClient } from 'mongodb';
import OpenAI from 'openai';

async function main() {
  const { MONGODB_URI, OPENAI_API_KEY, OPENAI_EMBEDDING_MODEL } = process.env;
  if (!MONGODB_URI || !OPENAI_API_KEY || !OPENAI_EMBEDDING_MODEL) {
    console.error('Missing one of MONGODB_URI, OPENAI_API_KEY or OPENAI_EMBEDDING_MODEL');
    process.exit(1);
  }

  // 1) connect
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db   = client.db('SchoolSystem');
  const coll = db.collection('cci_catalog');

  // 2) embed prompt
  const userPrompt = 'Drainage, ventricles of brain';
  console.log('Embedding prompt:', userPrompt);
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const embedRes = await openai.embeddings.create({
    model: OPENAI_EMBEDDING_MODEL,
    input: userPrompt
  });
  const queryVec = embedRes.data[0].embedding;

  // 3) vectorSearch + expanded projection
  const topK = 50;
  const pipeline = [
    {
      $vectorSearch: {
        index: 'cci_search',      // your Atlas index name
        path:  'embedding',
        queryVector: queryVec,
        numCandidates: 1000,
        limit: topK
      }
    },
    {
      $project: {
        _id: 0,
        code:        1,
        description: 1,
        note:        1,
        code_also:   1,
        includes:    1,
        excludes:    1,
        omit_code:   1,
        attributes:  1,
        qualifiers:  1,
        similarityScore: '$score'
      }
    }
  ];

  const results = await coll.aggregate(pipeline).toArray();
  console.log(`Top ${topK} candidates:`);
  console.dir(results, { depth: null });

  await client.close();
}

main().catch(err => {
  console.error('Error in testVectorSearch:', err);
  process.exit(1);
});
