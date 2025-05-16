import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { OpenAIService } from '../openai.service';
import { GeminiService } from '../gemini.service';
import { ICD10CodeResponse } from '../dto/icd10-response.type';

@Resolver()
export class ICD10Resolver {
  constructor(
    private readonly openaiService: OpenAIService,
    private readonly geminiService: GeminiService,
  ) {}

  /**
   * Query for OpenAI-based ICD-10-CA lookup
   */
  @Query(() => ICD10CodeResponse)
  async lookupICD10(
    @Args('term', { type: () => String }) term: string,
  ): Promise<ICD10CodeResponse> {
    return this.openaiService.lookupICD10(term);
  }

  /**
   * Mutation: run only OpenAI (GPT-4o) lookup
   */
  @Mutation(() => ICD10CodeResponse)
  lookupWithOpenAI(
    @Args('term', { type: () => String }) term: string,
  ): Promise<ICD10CodeResponse> {
    return this.openaiService.lookupICD10(term);
  }

  /**
   * Mutation: run only Gemini lookup
   */
  @Mutation(() => ICD10CodeResponse)
  lookupWithGemini(@Args('term') term: string) {
    return this.geminiService.lookupICD10(term);
  }


  /**
   * Mutation: run both OpenAI and Gemini lookups in parallel
   * Returns an array: [OpenAIResult, GeminiResult]
   */
  @Mutation(() => [ICD10CodeResponse])
  lookupDualAI(
    @Args('term', { type: () => String }) term: string,
  ): Promise<ICD10CodeResponse[]> {
    return Promise.all([
      this.openaiService.lookupICD10(term),
      this.geminiService.lookupICD10(term),
    ]);
  }
}
