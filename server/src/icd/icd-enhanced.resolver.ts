// src/icd/icd-enhanced.resolver.ts

import { Resolver, Query, Args } from '@nestjs/graphql';
import { IcdEnhancedService } from './icd-vector.service';
import { IcdAiEnhancedResponse } from './icd-ai-enhanced-response.dto';

@Resolver()
export class IcdEnhancedResolver {
  constructor(private readonly icdEnhancedService: IcdEnhancedService) {}

  @Query(() => IcdAiEnhancedResponse, { name: 'icdVectorSearch', description: 'Performs a vector search on the ICD-10-CA catalog.' })
  async icdVectorSearch(
    @Args('term') term: string
  ): Promise<IcdAiEnhancedResponse> {
    // This connects the GraphQL query to your existing search service
    return this.icdEnhancedService.search(term);
  }
}