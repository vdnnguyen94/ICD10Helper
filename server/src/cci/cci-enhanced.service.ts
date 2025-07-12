// src/cci/cci-enhanced.service.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Collection, MongoClient } from 'mongodb';
import { OpenAIService } from '../openai.service';
import {
  CciEnhancedCatalogItem,
  AttributeDto,
} from './cci-enhanced-catalog-item.dto';
import { CciEnhancedResponseDto } from './cci-enhanced-response.dto';

@Injectable()
export class CciEnhancedService implements OnModuleInit {
  private readonly logger = new Logger(CciEnhancedService.name);
  private readonly dbName = 'SchoolSystem';
  private readonly catalogColl = 'cci_catalog';
  private readonly attributesColl = 'attributes'; 
  private readonly vectorIndexName = 'cci_search';

  private attributeDefs: Record<string, any> = {};

  constructor(
    private readonly mongo: MongoClient,
    private readonly openaiService: OpenAIService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing service and caching attribute definitions...');
    try {
      const db = this.mongo.db(this.dbName);
      const collection = db.collection(this.attributesColl);
      const attributeDoc = await collection.findOne({});

      if (attributeDoc) {
        // delete attributeDoc._id;
        this.attributeDefs = attributeDoc;
        this.logger.log('Successfully cached attribute definitions.');
      } else {
        this.logger.warn('Could not find the attribute definitions document in the database.');
      }
    } catch (error) {
      this.logger.error('Failed to load attribute definitions from the database.', error);
    }
  }

  async search(term: string): Promise<CciEnhancedResponseDto> {
    const start = Date.now();
    if (!term || term.trim() === '') {
      return { items: [], status: 'not_found' };
    }

    try {
      const db = this.mongo.db(this.dbName);
      const coll = db.collection<any>(this.catalogColl);

      const queryVector = await this.openaiService.createEmbedding(term);
      const pipeline = this.buildVectorSearchPipeline(queryVector);
      const items = await coll.aggregate<CciEnhancedCatalogItem>(pipeline).toArray();

      const searchTimeMs = Date.now() - start;

      if (items.length === 0) {
        return { items: [], status: 'not_found', searchTimeMs };
      }

      // --- FIX: Call the assembly function and use its result ---
      const enrichedItems = await this.assembleRubricsWithAttributes(items);

      return {
        items: enrichedItems, // Return the enriched items, not the raw items
        status: enrichedItems.length > 0 ? 'matched' : 'not_found',
        searchTimeMs,
      };
      // --- END FIX ---

    } catch (error) {
      this.logger.error('Error during CCI enhanced search:', error);
      throw new Error('Failed to perform the search.');
    }
  }

  private buildVectorSearchPipeline(queryVector: number[]): any[] {
    return [
      {
        $vectorSearch: {
          index: this.vectorIndexName,
          path: 'embedding',
          queryVector: queryVector,
          numCandidates: 200,
          limit: 50,
        },
      },
      {
        $project: {
          _id: 0,
          code: 1,
          description: 1,
          note: 1,
          includes: 1,
          excludes: 1,
          codeAlso: '$code_also',
          otherQualifiers: '$qualifiers',
          attributes: { $ifNull: [ "$attributes", {} ] },
          appliedQualifiers: [],
          allAttributes: [], // This will be populated by the assembly function
          appliedAttributes: [],
          similarityScore: {
            $meta: 'vectorSearchScore',
          },
        },
      },
    ];
  }

    async assembleRubricsWithAttributes(rubrics: CciEnhancedCatalogItem[]): Promise<CciEnhancedCatalogItem[]> {
    // Helper function to map domain letter to attribute array name
    function getDomainName(domain: string): 'status' | 'location' | 'extent' {
        if (domain === 'S') return 'status';
        if (domain === 'L') return 'location';
        if (domain === 'E') return 'extent';
        throw new Error(`Unknown domain: ${domain}`);
    }

    return rubrics.map((rubric: any) => {
        const assembledAttributes: AttributeDto[] = [];

        if (rubric.attributes) {
        for (const [domain, attr] of Object.entries(rubric.attributes)) {
            const attribute = attr as { type: string; codes: string[] };

            let defs: { code: string; desc: string }[] = [];
            try {
            defs = this.attributeDefs[getDomainName(domain)] || [];
            } catch {
            // fallback for unknown domains, skip them
            continue;
            }

            if (attribute.type === 'N/A' || !attribute.codes || attribute.codes.length === 0) {
            assembledAttributes.push({
                name: domain,
                code: '/',
                description: 'N/A',
                type: attribute.type // <-- include the type
            });
            } else {
            attribute.codes.forEach((code: string) => {
                const def = defs.find((d) => d.code === code);
                assembledAttributes.push({
                name: domain,
                code: code,
                description: def ? def.desc : `Definition for ${code} not found`,
                type: attribute.type // <-- include the type
                });
            });
            }
        }
        }

        return {
        ...rubric,
        allAttributes: assembledAttributes,
        };
    });
    }


}