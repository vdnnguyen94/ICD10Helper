import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { OpenAIService } from '../openai.service'; // Adjust path as needed
import { GeminiService } from '../gemini.service'; // Adjust path as needed
import { CCIResponse } from '../dto/cci-response.type'; // Adjust path as needed

@Resolver()
export class CCIResolver {
  constructor(
    private readonly openaiService: OpenAIService,
    private readonly geminiService: GeminiService,
  ) {}

  /**
   * Mutation: run OpenAI (GPT-4o) lookup for CCI
   */
  @Mutation(() => CCIResponse, { name: 'lookupCCIWithOpenAI', description: 'Performs CCI lookup using OpenAI GPT-4o.' })
  async lookupCCIWithOpenAI(
    @Args('term', { type: () => String, description: 'The intervention term or scenario to look up.' }) term: string,
  ): Promise<CCIResponse> {
    return this.openaiService.lookupCCI(term);
  }

  /**
   * Mutation: run Gemini lookup for CCI
   */
  @Mutation(() => CCIResponse, { name: 'lookupCCIWithGemini', description: 'Performs CCI lookup using Google Gemini.' })
  async lookupCCIWithGemini(
    @Args('term', { type: () => String, description: 'The intervention term or scenario to look up.' }) term: string,
  ): Promise<CCIResponse> {
    return this.geminiService.lookupCCI(term);
  }

  /**
   * Mutation: run both OpenAI and Gemini CCI lookups in parallel
   * Returns an array: [OpenAIResult, GeminiResult]
   */
  @Mutation(() => [CCIResponse], { name: 'lookupDualCCI', description: 'Performs CCI lookup using both OpenAI and Gemini in parallel.' })
  async lookupDualCCI(
    @Args('term', { type: () => String, description: 'The intervention term or scenario to look up.' }) term: string,
  ): Promise<CCIResponse[]> {
    return Promise.all([
      this.openaiService.lookupCCI(term),
      this.geminiService.lookupCCI(term),
    ]);
  }

  /**
   * Query: (Optional) A query version for one of the services if mutations are not always desired.
   * For consistency with your ICD10Resolver, mutations are primary.
   * If you want a @Query, you can add one like this:
   * @Query(() => CCIResponse, { name: 'queryCCI', description: 'Performs CCI lookup (e.g., default with OpenAI).' })
   * async queryCCI(
   * @Args('term', { type: () => String }) term: string,
   * ): Promise<CCIResponse> {
   * return this.openaiService.lookupCCI(term);
   * }
   */
}