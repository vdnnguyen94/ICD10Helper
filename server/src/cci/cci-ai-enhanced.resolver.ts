import { Resolver, Query, Args } from '@nestjs/graphql';
import { CciEnhancedService } from './cci-enhanced.service';
import {
  CciUnifiedResponseDto,
  CciUnifiedResultItem,
  AppliedAttribute,
} from './cci-unified.types';

@Resolver()
export class CciAiEnhancedResolver {
  constructor(private readonly service: CciEnhancedService) {}

  @Query(() => CciUnifiedResponseDto, { name: 'cciAiEnhancedSearch' })
  async cciAiEnhancedSearch(
    @Args('term', { type: () => String }) term: string,
  ): Promise<CciUnifiedResponseDto> {
    const start = Date.now();

    // 1) fetch top-50 vector candidates
    const candidates = await this.service.fetchTop50Rubrics(term);

    // 2) ask OpenAI which to pick
    const selections = await this.service.selectWithOpenAI(term, candidates);
    const selMap = new Map(selections.map(s => [s.code, s]));

    // 3) map → unified items
    const items: CciUnifiedResultItem[] = candidates.map(rubric => {
      const sel = selMap.get(rubric.code);

      // appliedQualifier as QualifierDto
      const appliedQualifier = rubric.otherQualifiers.find(
        q => q.code === sel?.chosenQualifier,
      ) || null;

      // appliedAttributes as AttributeDto per domain
      const codeMap = new Map(sel?.chosenAttributes.map(a => [a.type, a.code]));
      const appliedAttributes: AppliedAttribute = {
        S:
          rubric.allAttributes.find(a => a.name === 'S' && a.code === codeMap.get('S')) ||
          null,
        L:
          rubric.allAttributes.find(a => a.name === 'L' && a.code === codeMap.get('L')) ||
          null,
        E:
          rubric.allAttributes.find(a => a.name === 'E' && a.code === codeMap.get('E')) ||
          null,
      };

      return {
        code: rubric.code,
        description: rubric.description,
        includes: rubric.includes,
        excludes: rubric.excludes,
        codeAlso: rubric.codeAlso,
        notes: rubric.note,
        otherQualifiers: rubric.otherQualifiers,
        allAttributes: rubric.allAttributes,

        isChosen: !!sel,
        appliedQualifier,
        appliedAttributes: sel ? appliedAttributes : null,

        reasoning: sel?.rationale ?? '',
        similarityScore: rubric.similarityScore ?? 0,
      };
    });

    // 4) sort & take top 20
    items.sort((a, b) => {
      if (a.isChosen !== b.isChosen) return (b.isChosen ? 1 : 0) - (a.isChosen ? 1 : 0);
      if (a.isChosen)
        return a.code.localeCompare(b.code, undefined, { numeric: true });
      return (b.similarityScore ?? 0) - (a.similarityScore ?? 0);
    });
    const top20 = items.slice(0, 20);

    const searchTimeMs = Date.now() - start;
    return { items: top20, searchTimeMs };
  }
}
