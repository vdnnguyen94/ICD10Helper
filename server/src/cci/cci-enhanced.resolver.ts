import { Resolver, Query, Args }    from '@nestjs/graphql';
import { CciEnhancedService }        from './cci-enhanced.service';
import { CciEnhancedResponseDto }    from './cci-enhanced-response.dto';

@Resolver()
export class CciEnhancedResolver {
  constructor(private readonly service: CciEnhancedService) {}

  @Query(() => CciEnhancedResponseDto, { name: 'cciEnhancedSearch' })
  cciEnhancedSearch(
    @Args('term', { type: () => String }) term: string,
  ): Promise<CciEnhancedResponseDto> {
    return this.service.search(term);
  }
}
