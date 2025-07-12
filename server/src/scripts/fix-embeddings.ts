import { MongoClient } from 'mongodb';
import { OpenAIService } from '../openai.service'; 
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize services
const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Missing MONGODB_URI in environment variables");
}    
const openaiService = new OpenAIService();
const mongoClient = new MongoClient(uri);

async function regenerateEmbeddings() {
  console.log('Connecting to MongoDB...');
  await mongoClient.connect();
  const db = mongoClient.db('SchoolSystem');
  const collection = db.collection('cci_catalog');
  console.log('Connected successfully. Fetching documents...');

  const documents = await collection.find({}).toArray();
  console.log(`Found ${documents.length} documents to process.`);

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    
    // 1. Combine all relevant text fields into one string
    // This is the most crucial step. Be thorough.
    const searchableText = [
      doc.description,
      ...(doc.includes || []),
      ...(doc.note || []),
      // Also include text from qualifiers
      ...(doc.qualifiers || []).map(q => q.description)
    ].filter(Boolean).join('; '); // Join with a separator

    if (!searchableText) {
      console.warn(`Skipping document with _id: ${doc._id} due to empty text.`);
      continue;
    }

    try {
      // 2. Create a new, correct embedding from the combined text
      const newEmbedding = await openaiService.createEmbedding(searchableText);

      if (newEmbedding && newEmbedding.length > 0) {
        // 3. Update the document with the new embedding
        await collection.updateOne(
          { _id: doc._id },
          { $set: { embedding: newEmbedding } }
        );
        console.log(`Updated document ${i + 1}/${documents.length} (Code: ${doc.code})`);
      } else {
        console.warn(`Failed to create embedding for document ${doc.code}.`);
      }

      // Avoid hitting API rate limits
      await new Promise(resolve => setTimeout(resolve, 20)); // Small delay

    } catch (error) {
      console.error(`Error processing document ${doc.code}:`, error);
    }
  }

  console.log('Embedding regeneration complete!');
  await mongoClient.close();
}

regenerateEmbeddings().catch(console.error);