// src/cci/cci-gemini-enhanced.resolver.ts
import { Resolver, Query, Args } from '@nestjs/graphql';
import { CciGeminiEnhancedService } from './cci-gemini-enhanced.service';
import { CciGeminiEnhancedResponseDto } from './cci-gemini-enhanced-response.dto';

@Resolver()
export class CciGeminiEnhancedResolver {
  constructor(private readonly service: CciGeminiEnhancedService) {}

  @Query(() => CciGeminiEnhancedResponseDto, {
    name: 'cciGeminiEnhancedSearch',
    description:
      'Performs a multi-step Gemini analysis on top of a vector search for CCI codes.',
  })
  async search(
    @Args('term', { type: () => String }) term: string,
  ): Promise<CciGeminiEnhancedResponseDto> {
    return this.service.search(term);
  }
}
