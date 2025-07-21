// src/cci/cci-gemini-enhanced.types.ts
import { ObjectType, Field, Float } from '@nestjs/graphql';
import { QualifierDto, AttributeDto } from './cci-enhanced-catalog-item.dto';

// --- FIX: Define missing DTOs locally ---
@ObjectType()
export class CodeDto {
  @Field()
  code: string;

  @Field()
  description: string;
}

@ObjectType()
export class AppliedAttribute {
  @Field(() => CodeDto, { nullable: true })
  S: CodeDto | null;

  @Field(() => CodeDto, { nullable: true })
  L: CodeDto | null;

  @Field(() => CodeDto, { nullable: true })
  E: CodeDto | null;
}
// --- End of FIX ---

@ObjectType()
// --- FIX: Re-defined the object instead of extending to prevent conflicts ---
export class CciGeminiEnhancedResultItem {
  @Field(() => String)
  code: string;

  @Field(() => String)
  description: string;

  @Field(() => [String])
  includes: string[];

  @Field(() => [String])
  excludes: string[];

  @Field(() => [String])
  code_also: string[];

  @Field(() => [String])
  note: string[];

  @Field(() => [QualifierDto])
  otherQualifiers: QualifierDto[];

  @Field(() => [AttributeDto])
  allAttributes: AttributeDto[];

  // Gemini-specific fields
  @Field(() => Boolean)
  isChosen: boolean;

  @Field(() => String, { nullable: true })
  reasoning?: string;

  @Field(() => QualifierDto, { nullable: true })
  appliedQualifier: QualifierDto | null;

  @Field(() => AppliedAttribute, { nullable: true })
  appliedAttributes: AppliedAttribute | null;

  @Field(() => Float, { nullable: true })
  similarityScore?: number | null;
}