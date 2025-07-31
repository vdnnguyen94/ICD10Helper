// src/icd/icd-unified.types.ts

import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType({ description: 'Basic ICD-10-CA record' })
export class IcdCodeItem {
  @Field(() => String)
  code: string;

  @Field(() => String)
  description: string;

  @Field(() => [String], { nullable: true })
  includes?: string[];

  @Field(() => [String], { nullable: true })
  excludes?: string[];

  @Field(() => [String], { nullable: true })
  notes?: string[];

}
