// src/cci/cci-enhanced.service.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Collection, MongoClient } from 'mongodb';
import { OpenAIService } from '../openai.service';
import {
  CciEnhancedCatalogItem,
  AttributeDto,
} from './cci-enhanced-catalog-item.dto';
import { CciEnhancedResponseDto } from './cci-enhanced-response.dto';

// ← Declare AiSelection here, before the class
interface AiSelection {
  code: string;
  chosenQualifier: string;
  chosenAttributes: { type: string; code: string }[];
  rationale: string;
} 

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
          limit: 40,
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

async fetchTop50Rubrics(term: string): Promise<CciEnhancedCatalogItem[]> {
  const resp = await this.search(term);
  return resp.items;
}

async selectWithOpenAI(
  term: string,
  candidates: CciEnhancedCatalogItem[],
): Promise<AiSelection[]> {
  const prompt = this.buildMetaAIPrompt(term, candidates);
  const aiRaw = await this.openaiService.chatCompletion([
    { role: 'user', content: prompt },
  ]);
  // Get the model’s text (possibly with ```json …``` fences)
  const content = aiRaw.choices[0].message?.content ?? '';
  
  // Strip triple-backticks and optional "```json" label
  const withoutFences = content.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();

  try {
    return JSON.parse(withoutFences) as AiSelection[];
  } catch (err) {
    this.logger.error('Failed to parse AI response. Cleaned content:', withoutFences, err);
    throw new Error(`Failed to parse AI response: ${err}`);
  }
}

/**
 * PRIVATE: Build the Meta-AI prompt by embedding the full candidate objects
 * so the model has access to every field from the raw CciEnhancedCatalogItem.
 */
private buildMetaAIPrompt(
  term: string,
  candidates: CciEnhancedCatalogItem[],
): string {
  const lines: string[] = [];

  // 1) Role & instructions
  lines.push(
    `You are a certified CCI coder following CIHI coding best practices. A clinician describes:`,
    `"${term}"`,
    ``,
    `Below are ${candidates.length} candidate CCI rubric objects in full JSON.`,
    `Each object contains every field we returned from the vector search,`,
    `including code, description, includes, excludes, codeAlso,`,
    `otherQualifiers, allAttributes, similarityScore, etc.`,
    ``,
    `Coding Rules:`,
    ` 1. If a rubric bundles both diagnostic and therapeutic work, Such as 1.BC and 2.BA code only 1.BC`,
    ` 2. ALWAYS pick exactly one qualifier (from the rubric's otherQualifiers list).`,
    `    Combined Diagnostic + Therapeutic in ONE rubric:`,
    `   • If a single rubric bundles both diagnostic & therapeutic work code ONLY the THERAPEUTIC part.`,
    ` 2B. Supplemental references:`,
    ` • If a rubric’s includes or codeAlso text literally names another code`,
    `  (e.g. “see 3.IP.30.^^”), and that code’s description or includes`,
    ` fits the user’s scenario, you MUST include that code as a separate entry in your JSON output.`,
    ` 3. For each attribute domain S, L, E:`,
    `    – If Mandatory, pick the best match whose description appears in the term;`,
    `    – If Optional, pick the option whose description appears in the term;`,
    `      If Optional, none apply, return "-" for that code attribute for example "name" :S, "code: "-', "type" : "Optional";`,
    ` IF OPTIONAL, code available and descriptions does not mentioned in the searchterm return: "-"`,
    `    – If N/A, return "/".`,
    `    – Do not select more than one code per domain.`,
    ``,
    `Output Format:`,
    `Return ONLY valid JSON, an array of objects like:`,
    ` [`,
    `   {`,
    `     "code": "1.ZZ.35",`,
    `     "chosenQualifier": "HA-M2",`,
    `     "chosenAttributes": [`,
    `       { "type":"S", "code":"IN" },`,
    `       { "type":"L", "code":"/" },`,
    `       { "type":"E", "code":"/" }`,
    `     ],`,
    `     "rationale": "final rubric name, chosen qualifier and chosen attributes. reasons for chosen field, if Code Also applied"` ,
    `   },`,
    `   …`,
    ` ]`,
    ``,
    `Do not wrap in markdown or add any extra text.`,
    ``,
    `Here are the full candidate objects:`
  );

  // 2) Serialize each candidate in full
  candidates.forEach((c, i) => {
    // Pretty-print JSON and strip backticks if present
    const json = JSON.stringify(c, null, 2).replace(/`/g, '');
    lines.push(
      ``,
      `--- Candidate ${i + 1} ---`,
      json
    );
  });

  return lines.join('\n');
}
   /**
   * Exact‐code lookup: fast findOne() + reuse your assembler
   */
async searchByCode(code: string): Promise<CciEnhancedResponseDto> {
  // 1) Split off qualifier suffix if present
  const parts   = code.split('.');
  const baseCode = parts.slice(0, 3).join('.'); 

  // 2) Fetch the raw document from Mongo
  const db   = this.mongo.db(this.dbName);
  const coll = db.collection<any>(this.catalogColl);
  const raw  = await coll.findOne({ code: baseCode });

  if (!raw) {
    return { status: 'not_found', items: [] };
  }

  // 3) **Normalize all the array‐fields** so none are null/undefined
  const normalized: any = {
    code:             raw.code,
    description:      raw.description,
    includes:         raw.includes   ?? [],
    excludes:         raw.excludes   ?? [],
    codeAlso:         raw.code_also  ?? [],   // map DB “code_also” → DTO “codeAlso”
    note:             raw.note       ?? [],
    otherQualifiers:  raw.qualifiers ?? [],
    appliedQualifiers: [],  // nothing applied on an exact lookup
    attributes:       raw.attributes ?? {},
    appliedAttributes: [],  // ditto
    similarityScore:  null,
  };

  // 4) Enrich with your existing helper
  const [enriched] = await this.assembleRubricsWithAttributes([normalized]);



  return {
    status: 'matched',
    items:  [enriched],
  };
}

}