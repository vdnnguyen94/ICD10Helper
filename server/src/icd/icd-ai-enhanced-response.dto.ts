// src/icd/icd-ai-enhanced-response.dto.ts

import { ObjectType, Field } from '@nestjs/graphql';
import { IcdCodeItem } from './icd-unified.types';

@ObjectType({ description: 'AI-enhanced ICD-10-CA result' })
export class IcdAiEnhancedResult extends IcdCodeItem {
  @Field(() => Boolean)
  isChosen: boolean;

  @Field(() => String, { nullable: true })
  rationale?: string;

  @Field(() => Number, { nullable: true })
  similarityScore?: number;
}

@ObjectType({ description: 'Wrapper for AI-enhanced ICD results' })
export class IcdAiEnhancedResponse {
  @Field(() => [IcdAiEnhancedResult])
  items: IcdAiEnhancedResult[];

  @Field(() => Number)
  searchTimeMs: number;

  @Field(() => String, { nullable: true })
  status?: string;
}
