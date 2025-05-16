import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { OpenAIService } from '../openai.service';
import { ICD10CodeResponse } from '../dto/icd10-response.type';

@Resolver()
export class ICD10Resolver {
  constructor(private readonly openaiService: OpenAIService) {}

  @Query(() => ICD10CodeResponse)
  async lookupICD10(
    @Args('term', { type: () => String }) term: string,
  ): Promise<ICD10CodeResponse> {
    return await this.openaiService.lookupICD10(term);
  }
  @Mutation(() => ICD10CodeResponse)
  lookupICD10Mutation(@Args('term') term: string): Promise<ICD10CodeResponse> {
    return this.openaiService.lookupICD10(term);
  }
}
