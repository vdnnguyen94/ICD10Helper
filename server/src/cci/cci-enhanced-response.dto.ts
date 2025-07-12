import { ObjectType, Field, Float } from '@nestjs/graphql';
import { CciEnhancedCatalogItem } from './cci-enhanced-catalog-item.dto';

@ObjectType({ description: 'Response wrapper for enhanced CCI vector search' })
export class CciEnhancedResponseDto {
  @Field(() => [CciEnhancedCatalogItem], {
    description: 'Top-K enhanced CCI catalog items with full details',
  })
  items: CciEnhancedCatalogItem[];

  @Field(() => String, {
    description: 'Overall status: matched | partial | not_found',
  })
  status: 'matched' | 'partial' | 'not_found';

  @Field(() => Float, {
    nullable: true,
    description: 'Time taken for vector search in milliseconds',
  })
  searchTimeMs?: number;
}

