// src/cci/cci-unified.types.ts

import { ObjectType, Field, Float } from '@nestjs/graphql';
import { QualifierDto, AttributeDto } from './cci-enhanced-catalog-item.dto';

@ObjectType({ description: 'Applied attributes for domains S, L, E' })
export class AppliedAttribute {
  @Field(() => AttributeDto, { nullable: true, description: 'Status (S) attribute' })
  S: AttributeDto | null;

  @Field(() => AttributeDto, { nullable: true, description: 'Location (L) attribute' })
  L: AttributeDto | null;

  @Field(() => AttributeDto, { nullable: true, description: 'Extent (E) attribute' })
  E: AttributeDto | null;
}

@ObjectType({ description: 'Unified CCI result item from any AI model' })
export class CciUnifiedResultItem {
  @Field(() => String, { description: 'CCI code, e.g. 1.IJ.50' })
  code: string;

  @Field(() => String, { description: 'Primary description of the rubric' })
  description: string;

  @Field(() => [String], { description: 'Includes list from the rubric' })
  includes: string[];

  @Field(() => [String], { description: 'Excludes list from the rubric' })
  excludes: string[];

  @Field(() => [String], { description: 'Additional code references ("Code Also")' })
  codeAlso: string[];

  @Field(() => [String], { description: 'Notes array from the rubric' })
  notes: string[];

  @Field(() => [QualifierDto], { description: 'All possible qualifiers' })
  otherQualifiers: QualifierDto[];

  @Field(() => [AttributeDto], { description: 'All coding attributes and definitions' })
  allAttributes: AttributeDto[];

  @Field(() => Boolean, { description: 'True if the AI selected this rubric' })
  isChosen: boolean;

  @Field(() => QualifierDto, { nullable: true, description: 'The qualifier the AI selected' })
  appliedQualifier: QualifierDto | null;

  @Field(() => AppliedAttribute, { nullable: true, description: 'The AI’s chosen attributes' })
  appliedAttributes: AppliedAttribute | null;

  @Field(() => String, { description: 'Why the AI picked this rubric, qualifier, and attributes' })
  reasoning: string;

  @Field(() => Float, { nullable: true, description: 'Similarity score from the original vector search' })
  similarityScore?: number | null;
}

@ObjectType({ description: 'Wrapper for unified CCI AI results' })
export class CciUnifiedResponseDto {
  @Field(() => [CciUnifiedResultItem], { description: 'Top-K results, flagged by AI choice' })
  items: CciUnifiedResultItem[];

  @Field(() => Float, { description: 'Search time in milliseconds' })
  searchTimeMs: number;
}
