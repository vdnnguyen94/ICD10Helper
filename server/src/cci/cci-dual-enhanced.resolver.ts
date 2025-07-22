// src/cci/cci-dual-enhanced.resolver.ts

import { Resolver, Query, Args } from '@nestjs/graphql';
import { CciAiEnhancedResolver } from './cci-ai-enhanced.resolver';
import { CciGeminiEnhancedResolver } from './cci-gemini-enhanced.resolver';
import {
  CciUnifiedResultItem,
  CciDualComparisonDetail,
  CciDualComparisonSummary,
  CciDualEnhancedResponseDto,
  AppliedAttribute,
} from './cci-unified.types';

@Resolver()
export class CciDualEnhancedResolver {
  constructor(
    private readonly aiRes:     CciAiEnhancedResolver,
    private readonly geminiRes: CciGeminiEnhancedResolver,
  ) {}

  @Query(() => CciDualEnhancedResponseDto, { name: 'cciDualEnhancedSearch' })
  async cciDualEnhancedSearch(@Args('term') term: string) {
    // 1) Fire both AIs in parallel
    const [aiResp, gmResp] = await Promise.all([
      this.aiRes.cciAiEnhancedSearch(term),
      this.geminiRes.cciGeminiEnhancedSearch(term),
    ]);

    // 2) Extract timings and unified lists
    const tAI    = aiResp.searchTimeMs;
    const tGm    = gmResp.searchTimeMs;
    const openai = aiResp.items;    // unified shape
    const gemini = gmResp.items;    // unified shape

    // 3) Build a map of Gemini items for quick lookup
    const gemMap = new Map(gemini.map(r => [r.code, r]));

    // 4) Compare per-code
    const details: CciDualComparisonDetail[] = [];

    // First, for every code from OpenAI:
    for (const o of openai) {
      const g = gemMap.get(o.code);
      const chosenA = o.isChosen;
      const chosenG = !!g?.isChosen;

      const qualMatch = chosenA && chosenG
        ? o.appliedQualifier?.code === g.appliedQualifier?.code
        : false;

      const aS =    !!o.appliedAttributes && !!g?.appliedAttributes
                   && o.appliedAttributes.S?.code === g.appliedAttributes.S?.code;
      const aL =    !!o.appliedAttributes && !!g?.appliedAttributes
                   && o.appliedAttributes.L?.code === g.appliedAttributes.L?.code;
      const aE =    !!o.appliedAttributes && !!g?.appliedAttributes
                   && o.appliedAttributes.E?.code === g.appliedAttributes.E?.code;

      details.push({
        code:             o.code,
        chosenByOpenAI:   chosenA,
        chosenByGemini:   chosenG,
        qualifierMatch:   qualMatch,
        openaiAttributes: o.appliedAttributes,
        geminiAttributes: g?.appliedAttributes ?? null,
        attributeMatch_S: aS,
        attributeMatch_L: aL,
        attributeMatch_E: aE,
        fullMatch:        chosenA && chosenG && qualMatch && aS && aL && aE,
      });
    }

    // Then, catch any codes Gemini chose that OpenAI didn’t report
    const seen = new Set(openai.map(r => r.code));
    for (const g of gemini) {
      if (!seen.has(g.code)) {
        details.push({
          code:             g.code,
          chosenByOpenAI:   false,
          chosenByGemini:   g.isChosen,
          qualifierMatch:   false,
          openaiAttributes: null,
          geminiAttributes: g.appliedAttributes,
          attributeMatch_S: false,
          attributeMatch_L: false,
          attributeMatch_E: false,
          fullMatch:        false,
        });
      }
    }

    // 5) Build summary metrics
    const totalCodes        = details.length;
    const openaiChosenCount = details.filter(d => d.chosenByOpenAI).length;
    const geminiChosenCount = details.filter(d => d.chosenByGemini).length;
    const codesAgreed       = details.filter(d => d.chosenByOpenAI && d.chosenByGemini).length;
    const codesDisagreed    = totalCodes - codesAgreed;
    const fullMatches       = details.filter(d => d.fullMatch).length;
    const partialMatches    = codesAgreed - fullMatches;

    const summary: CciDualComparisonSummary = {
      totalCodes,
      openaiChosenCount,
      geminiChosenCount,
      codesAgreed,
      codesDisagreed,
      fullMatches,
      partialMatches,
    };

    // 6) Return under the unified dual-AI DTO
    return {
      openai,
      gemini,
      summary,
      details,
      searchTimeMsOpenAI:  tAI,
      searchTimeMsGemini: tGm,
    };
  }
}
