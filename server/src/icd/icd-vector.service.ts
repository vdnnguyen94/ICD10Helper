import { Injectable, Logger, Inject } from '@nestjs/common';
import { MongoClient, Collection } from 'mongodb';
import { OpenAIService } from '../openai.service';
import {
  IcdAiEnhancedResponse,
  IcdAiEnhancedResult,
} from './icd-ai-enhanced-response.dto';
import { IcdCodeItem } from './icd-unified.types';

@Injectable()
export class IcdEnhancedService {
  private readonly logger = new Logger(IcdEnhancedService.name);
  private readonly dbName = 'ICD10CA_System';
  private readonly catalogColl = 'ICD10CA_Catalog';
  private readonly vectorIndexName = 'icd_search';

  constructor(
    @Inject('ICD_MONGO_CLIENT') private readonly mongo: MongoClient,
    private readonly openaiService: OpenAIService,
  ) {}

  /**
   * Perform a vector-based search over ICD codes.
   * Returns top 100 candidates (out of 200) with cosine similarity scores.
   */
  async search(term: string): Promise<IcdAiEnhancedResponse> {
    const start = Date.now();
    if (!term || term.trim() === '') {
      return { items: [], searchTimeMs: Date.now() - start, status: 'not_found' };
    }

    try {
      // 1) Embed the search term
      const queryVector = await this.openaiService.createEmbedding(term);
      
      // 2) Run MongoDB $vectorSearch aggregation
      const db = this.mongo.db(this.dbName);
      const coll: Collection<IcdCodeItem & { embedding?: number[] }> =
        db.collection(this.catalogColl);

      const pipeline = this.buildVectorSearchPipeline(queryVector);
      const rawItems = await coll.aggregate<IcdCodeItem & { similarityScore: number }>(pipeline).toArray();

      const searchTimeMs = Date.now() - start;

      if (rawItems.length === 0) {
        return { items: [], searchTimeMs, status: 'not_found' };
      }

      // 3) Map to DTO, default isChosen=false
      const items: IcdAiEnhancedResult[] = rawItems.map(item => ({
        code: item.code,
        description: item.description,
        includes: item.includes,
        excludes: item.excludes,
        notes: item.notes,
        similarityScore: item.similarityScore,
        isChosen: false,
      }));

      return {
        items,
        searchTimeMs,
        status: 'matched',
      };
    } catch (error) {
      this.logger.error('Error during ICD vector search:', error);
      return { items: [], searchTimeMs: Date.now() - start, status: 'error' };
    }
  }

  /**
   * Build the aggregation pipeline for vector search.
   */
  private buildVectorSearchPipeline(queryVector: number[]): any[] {
    return [
      {
        $vectorSearch: {
          index: this.vectorIndexName,
          path: 'embedding',
          queryVector,
          numCandidates: 200,
          limit: 100,
        },
      },
      {
        $project: {
          _id: 0,
          code: 1,
          description: 1,
          includes: 1,
          excludes: 1,
          notes: 1,
          similarityScore: { $meta: 'vectorSearchScore' },
        },
      },
    ];
  }
}
