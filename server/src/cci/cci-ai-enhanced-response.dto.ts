import { ObjectType, Field } from '@nestjs/graphql';
import { CciAiEnhancedResult } from './cci-ai-enhanced.types';

@ObjectType({ description: 'Wrapper for AI-enhanced CCI search results' })
export class CciAiEnhancedResponse {
  @Field(
    () => [CciAiEnhancedResult],
    { description: 'All candidate rubrics, flagged by AI choice' }
  )
  results: CciAiEnhancedResult[];

  @Field(() => String, { description: 'Overall status: matched, partial, or not_found' })
  status: string;
}
