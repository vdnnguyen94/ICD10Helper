// src/cci/cci-gemini-enhanced.resolver.ts

import { Resolver, Query, Args } from '@nestjs/graphql';
import { CciGeminiEnhancedService } from './cci-gemini-enhanced.service';
import {
  CciUnifiedResponseDto,
  CciUnifiedResultItem,
} from './cci-unified.types';

@Resolver()
export class CciGeminiEnhancedResolver {
  constructor(private readonly service: CciGeminiEnhancedService) {}

  @Query(() => CciUnifiedResponseDto, {
    name: 'cciGeminiEnhancedSearch',
    description:
      'Performs a multi-step Gemini AI analysis on top of a vector search for CCI codes, returning a unified result shape.',
  })
  async cciGeminiEnhancedSearch(
    @Args('term', { type: () => String }) term: string,
  ): Promise<CciUnifiedResponseDto> {
    const t0 = Date.now();

    // 1) Run the Gemini-enhanced search
    const geminiResp = await this.service.search(term);

    // 2) Map Gemini’s own DTO into our unified result type
    const items: CciUnifiedResultItem[] = geminiResp.items.map(r => ({
      code:            r.code,
      description:     r.description,
      includes:        r.includes,
      excludes:        r.excludes,
      codeAlso:        r.code_also,
      notes:           r.note,

      otherQualifiers: r.otherQualifiers,
      allAttributes:   r.allAttributes,

      isChosen:         r.isChosen,
      appliedQualifier: r.appliedQualifier,
      appliedAttributes:r.appliedAttributes,

      reasoning:       r.reasoning ?? '',
      similarityScore: r.similarityScore ?? 0,
    }));

    // 3) Return unified response with timing
    return {
      items,
      searchTimeMs: Date.now() - t0,
    };
  }
}
