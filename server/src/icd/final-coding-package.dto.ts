// src/icd/final-coding-package.dto.ts

import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType({ description: 'A single, fully-rationalized ICD-10-CA code within a final package.' })
export class FinalCodingResult {
  @Field(() => String)
  code: string;

  @Field(() => String)
  description: string;

  @Field(() => String, { description: 'The rationale for choosing this code.' })
  rationale: string;
  
  @Field(() => String, { description: 'The diagnosis type (e.g., M, MP, 1, 2, 3, 9, OP).' })
  diagnosisType: string;

  @Field(() => String, { nullable: true, description: 'The diagnosis cluster (e.g., A, B) to link related codes.' })
  diagnosisCluster?: string;

  @Field(() => String, { nullable: true, description: 'The diagnosis prefix (e.g., Q, 5, 6).' })
  prefix?: string;

  @Field(() => [String], { nullable: true, description: 'List of inclusion terms for this code.' })
  includes?: string[];

  @Field(() => [String], { nullable: true, description: 'List of exclusion terms for this code.' })
  excludes?: string[];

  @Field(() => [String], { nullable: true, description: 'List of notes for this code.' })
  notes?: string[];
}

@ObjectType({ description: 'The complete, AI-generated coding package for a clinical scenario.' })
export class FinalCodingPackage {
  @Field(() => [FinalCodingResult])
  results: FinalCodingResult[];

  @Field(() => String, { description: 'A narrative summary of the coding decisions.' })
  summary: string;

  @Field(() => Number)
  processingTimeMs: number;
}