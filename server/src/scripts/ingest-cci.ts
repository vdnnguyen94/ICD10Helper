import { MongoClient } from 'mongodb';
import { OpenAI } from 'openai';
import 'dotenv/config';
// Load environment variables
const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Missing MONGODB_URI in environment variables");
}       
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

// Initialize clients
const mongo = new MongoClient(uri);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Helper to flatten a CCI entry into a single text blob
function makeDocument(entry: any): string {
  const parts: string[] = [];
  parts.push(`${entry.code} – ${entry.description}`);
  if (entry.includes?.length)  parts.push(`Includes: ${entry.includes.join(', ')}`);
  if (entry.excludes?.length)  parts.push(`Excludes: ${entry.excludes.join(', ')}`);
  // Attributes
  const attrs = Object.entries(entry.attributes || {}).map(
  ([b, info]) => {
    const typed = info as { type: string; codes: string[] };
    return `${b}(${typed.type}): ${typed.codes.join(', ')}`;});
  if (attrs.length) parts.push(`Attributes: ${attrs.join('; ')}`);
  // Qualifiers
  if (entry.qualifiers?.length) {
    const quals = entry.qualifiers.map((q: any) => `${q.code} – ${q.description}`);
    parts.push(`Qualifiers: ${quals.join('; ')}`);
  }
  return parts.join('\n');
}

async function main() {
  await mongo.connect();
  const db = mongo.db('SchoolSystem');
  const col = db.collection('cci_catalog');

  // Stream all documents
  const cursor = col.find({});
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    if (!doc) break;
    // Skip if already has embedding
    if (Array.isArray(doc.embedding) && doc.embedding.length > 0) continue;

    const text = makeDocument(doc);
    try {
      const embeddingRes = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      });
      const vector = embeddingRes.data[0].embedding;
      // Update document with embedding
      await col.updateOne(
        { _id: doc._id },
        { $set: { embedding: vector } }
      );
      console.log(`Embedded ${doc.code}`);
    } catch (err) {
      console.error(`Failed on ${doc.code}:`, err);
      // Optionally retry or break
    }
  }

  console.log('✅ Ingestion complete');
  await mongo.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
