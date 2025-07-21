// src/cci/cci-gemini-enhanced.types.ts

import { ObjectType, Field, Float } from '@nestjs/graphql';
import { QualifierDto, AttributeDto } from './cci-enhanced-catalog-item.dto';
import { AppliedAttribute } from './cci-unified.types';

@ObjectType({ description: 'A single Gemini-enhanced CCI search result item' })
export class CciGeminiEnhancedResultItem {
  @Field(() => String, { description: 'CCI code, e.g. 1.IJ.50' })
  code: string;

  @Field(() => String, { description: 'Primary description of the rubric' })
  description: string;

  @Field(() => [String], { description: 'Includes list from the rubric' })
  includes: string[];

  @Field(() => [String], { description: 'Excludes list from the rubric' })
  excludes: string[];

  @Field(() => [String], { description: 'Additional code references ("Code Also")' })
  code_also: string[];

  @Field(() => [String], { description: 'Notes array from the rubric' })
  note: string[];

  @Field(() => [QualifierDto], { description: 'All available qualifiers' })
  otherQualifiers: QualifierDto[];

  @Field(() => [AttributeDto], { description: 'All coding attributes and definitions' })
  allAttributes: AttributeDto[];

  @Field(() => Boolean, { description: 'True if Gemini selected this rubric' })
  isChosen: boolean;

  @Field(() => QualifierDto, { nullable: true, description: 'The qualifier Gemini selected' })
  appliedQualifier: QualifierDto | null;

  @Field(() => AppliedAttribute, { nullable: true, description: 'Gemini’s chosen attributes' })
  appliedAttributes: AppliedAttribute | null;

  @Field(() => String, { nullable: true, description: 'Why Gemini picked this rubric, qualifier, and attributes' })
  reasoning?: string;

  @Field(() => Float, { nullable: true, description: 'Similarity score from the original vector search' })
  similarityScore?: number | null;
}

@ObjectType({ description: 'Wrapper for Gemini-enhanced CCI search results' })
export class CciGeminiEnhancedResponseDto {
  @Field(() => [CciGeminiEnhancedResultItem], { description: 'Top results from Gemini AI' })
  items: CciGeminiEnhancedResultItem[];

  @Field(() => Float, { description: 'Search time in milliseconds' })
  searchTimeMs: number;
}
