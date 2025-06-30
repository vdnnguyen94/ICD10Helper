# Roadmap: AI‑Driven CCI Lookup (June 29, 2025)

1. **Persist & Index Your JSON**
   - Choose storage: SQL/NoSQL for CRUD or Vector DB for embeddings
   - Import `final_catalog.json` into your chosen database

2. **Generate Embeddings & Upsert to Vector Store**
   - Flatten each CCI entry to a single text blob (`makeDocument(entry)`)
   - Call OpenAI Embeddings API on each blob
   - Upsert vectors with `id = entry.code`, `metadata = { code: entry.code }`

3. **Build Retrieval + LLM Layer**
   - At query time: embed user query → vector search → top‑k results
   - Assemble prompt with those entries and the question
   - Call ChatCompletion API and parse into `CCIResponse`

4. **Expose as GraphQL/REST API**
   - Update `cci.resolver.ts` to call your RAG function
   - Provide `lookupCCI(codeOrText: String): CCIResponse` endpoint

5. **Add Fallbacks & Caching**
   - Exact‑match cache (in‑memory or Redis) for known codes
   - Full‑text search fallback (Postgres `tsvector` or Fuse.js)

6. **Test & Evaluate**
   - Unit tests verifying code → correct JSON snippet
   - Integration tests simulating lookup scenarios
   - Accuracy benchmarks against ground truth

7. **Deploy & Monitor**
   - Host API & vector DB (Render + Pinecone/Qdrant)
   - Monitor query latency, failure rates, mismatches
   - Iterate on prompt templates and chunk sizes to improve accuracy

