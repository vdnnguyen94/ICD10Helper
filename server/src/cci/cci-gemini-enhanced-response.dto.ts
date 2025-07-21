// src/cci/cci-gemini-enhanced-response.dto.ts
import { ObjectType, Field, Int } from '@nestjs/graphql';
import { CciGeminiEnhancedResultItem } from './cci-gemini-enhanced.types';

@ObjectType()
export class CciGeminiEnhancedResponseDto {
  @Field(() => [CciGeminiEnhancedResultItem])
  items: CciGeminiEnhancedResultItem[];

  @Field(() => Int)
  searchTimeMs: number;
}