import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType({ description: 'Enhanced CCI catalog item with qualifiers and attributes' })
export class CciEnhancedCatalogItem {
  @Field(() => String, { description: 'CCI code, e.g. 1.AN.87' })
  code: string;

  @Field(() => String, { description: 'Primary description of the CCI rubric' })
  description: string;

  @Field(() => [String], { description: 'Includes list from the rubric' })
  includes: string[];

  @Field(() => [String], { description: 'Excludes list from the rubric' })
  excludes: string[];

  @Field(() => [String], { description: 'Additional code references ("Code Also")' })
  codeAlso: string[];

  @Field(() => [String], { description: 'Notes array from the rubric' })
  note: string[];

  @Field(() => [QualifierDto], { description: 'All available qualifiers' })
  otherQualifiers: QualifierDto[];

  @Field(() => [QualifierDto], { description: 'Applicable qualifiers for this scenario' })
  appliedQualifiers: QualifierDto[];

  @Field(() => [AttributeDto], { description: 'All coding attributes and definitions' })
  allAttributes: AttributeDto[];

  @Field(() => [AttributeDto], { description: 'Applied attributes for this scenario' })
  appliedAttributes: AttributeDto[];

  @Field(() => Float, {
    nullable: true,
    description: 'Cosine similarity score from vector search',
  })
  similarityScore?: number | null;
}

@ObjectType({ description: 'Qualifier code entry' })
export class QualifierDto {
  @Field() code: string;
  @Field() approach: string;
  @Field() description: string;
  @Field(() => [String]) includes: string[];
}

@ObjectType({ description: 'Coding attribute entry' })
export class AttributeDto {
  @Field() name: string;
  @Field() code: string;
  @Field() description: string;
  @Field() type: string;
}


