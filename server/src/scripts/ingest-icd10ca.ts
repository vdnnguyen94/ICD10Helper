
// server/src/scripts/ingest-icd10ca.ts

import { MongoClient } from 'mongodb';
import { OpenAI } from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI2!;
if (!uri) throw new Error("❌ MONGODB_URI2 is missing from .env");

const maskedUri = uri.replace(/\/\/(.*?):(.*?)@/, '//$1:*****@');
console.log('🔗 Connecting to MongoDB URI:', maskedUri);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function main() {
  const client = new MongoClient(uri);
  await client.connect();

  const db = client.db('ICD10CA_System');
  const collection = db.collection('ICD10CA_Catalog');

  const filePath = path.join(__dirname, '../files/ICDCodeFinal.json');
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const icdItems = JSON.parse(rawData);

  console.log(`⏳ Preparing to insert ${icdItems.length} ICD-10-CA codes...`);

  let insertedCount = 0;
  const total = icdItems.length;

  for (let i = 0; i < total; i++) {
    const item = icdItems[i];
    const text = item.search_text?.trim();
    if (!text) continue;

    try {
      const embeddingRes = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      });

      const embedding = embeddingRes.data[0].embedding;

      await collection.insertOne({
        ...item,
        embedding,
      });

      insertedCount++;
      if (insertedCount % 100 === 0 || insertedCount === total) {
        console.log(`✅ Inserted ${insertedCount}/${total} (${item.code})`);
      }

      await new Promise(r => setTimeout(r, 20)); // rate limit safety

    } catch (err) {
      console.error(`❌ Error inserting ${item.code}:`, err);
    }
  }

  const finalCount = await collection.countDocuments();
  console.log(`🎉 Ingestion complete! ${insertedCount} records inserted.`);
  console.log(`📊 Collection now contains ${finalCount} documents.`);

  await client.close();
}

main().catch(console.error);
