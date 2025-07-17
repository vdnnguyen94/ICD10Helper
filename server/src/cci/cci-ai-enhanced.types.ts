import { ObjectType, Field, Float } from '@nestjs/graphql';
import { CciEnhancedCatalogItem } from './cci-enhanced-catalog-item.dto';

@ObjectType({ description: 'A single attribute chosen by the AI, with its category' })
export class CciAiChosenAttribute {
  @Field(() => String, { description: 'Attribute category, e.g. "S", "L", or "E"' })
  type: string;

  @Field(() => String, { description: 'Attribute code, e.g. "A", "-", or "/"' })
  code: string;
}

@ObjectType({ description: 'An AI-enhanced CCI search result, with selection metadata' })
export class CciAiEnhancedResult {
  @Field(
    () => CciEnhancedCatalogItem,
    { description: 'Full rubric definition (code, description, includes, excludes, codeAlso)' }
  )
  rubric: CciEnhancedCatalogItem;

  @Field(() => Float, { description: 'Similarity score from the original vector search' })
  score: number;

  @Field(() => Boolean, { description: 'True if the AI selected this rubric' })
  isChosen: boolean;

  @Field(() => String, { description: 'The qualifier the AI selected, e.g. "SE-GX"' })
  chosenQualifier: string;

  @Field(
    () => [CciAiChosenAttribute],
    { description: 'The AI’s chosen attributes, typed by category' }
  )
  chosenAttributes: CciAiChosenAttribute[];

  @Field(() => String, { description: 'Why the AI picked this rubric, qualifier, and attributes' })
  rationale: string;
}
