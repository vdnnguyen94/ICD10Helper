// src/cci/cci-ai-enhanced.resolver.ts

import { Resolver, Query, Args } from '@nestjs/graphql';
import { CciEnhancedService } from './cci-enhanced.service';
import { CciAiEnhancedResponse } from './cci-ai-enhanced-response.dto';
import { CciAiEnhancedResult } from './cci-ai-enhanced.types';
import { CciEnhancedCatalogItem } from './cci-enhanced-catalog-item.dto';

@Resolver()
export class CciAiEnhancedResolver {
  constructor(private readonly service: CciEnhancedService) {}

  @Query(() => CciAiEnhancedResponse, { name: 'cciAiEnhancedSearch' })
  async cciAiEnhancedSearch(
    @Args('term') term: string
  ): Promise<CciAiEnhancedResponse> {

    const start = Date.now(); 
    // 1. Fetch the top-50 rubrics
    const candidates: CciEnhancedCatalogItem[] =
      await this.service.fetchTop50Rubrics(term);

    // 2. Ask OpenAI for selections (use the correct method name)
    const selections = await this.service.selectWithOpenAI(term, candidates);

    // 3. Merge into AI-enhanced results
    const results: CciAiEnhancedResult[] = candidates.map(rubric => {
      const sel = selections.find(s => s.code === rubric.code);
        return {
            rubric,
            score: rubric.similarityScore ?? 0, // default missing scores to 0
            isChosen: !!sel,
            chosenQualifier: sel?.chosenQualifier ?? '',
            chosenAttributes: sel?.chosenAttributes ?? [],
            rationale: sel?.rationale ?? ''
        };
    });

    results.sort((a, b) => {
      if (a.isChosen !== b.isChosen) return (b.isChosen ? 1 : 0) - (a.isChosen ? 1 : 0);
      if (a.isChosen && b.isChosen) {
        return a.rubric.code.localeCompare(b.rubric.code, undefined, { numeric: true });
      }
      return (b.score ?? 0) - (a.score ?? 0);
    });
    const trimmedResults = results.slice(0, 20);


    // 4. Compute overall status
    const status = results.some(r => r.isChosen) ? 'matched' : 'not_found';

    const searchTimeMs = Date.now() - start; // ✅ compute elapsed time

  return { results: trimmedResults, status, searchTimeMs }; 

  }
}
