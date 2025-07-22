import { Resolver, Query, Args }    from '@nestjs/graphql';
import { CciEnhancedService }        from './cci-enhanced.service';
import { CciEnhancedResponseDto }    from './cci-enhanced-response.dto';
import { BadRequestException } from '@nestjs/common';

@Resolver()
export class CciEnhancedResolver {
  constructor(private readonly service: CciEnhancedService) {}

  @Query(() => CciEnhancedResponseDto, { name: 'cciEnhancedSearch' })
  cciEnhancedSearch(
    @Args('term', { type: () => String }) term: string,
  ): Promise<CciEnhancedResponseDto> {
    return this.service.search(term);
  }

    // 1.1 Exact-code lookup
  @Query(() => CciEnhancedResponseDto, {
    name: 'cciSearchByCode',
    description:
      'Lookup a single CCI rubric by its full code (e.g. "3.IP.10" or "3.IP.10.VX")',
  })
  async cciSearchByCode(
    @Args('code', { type: () => String }) code: string,
  ): Promise<CciEnhancedResponseDto> {
    // 1) Validate format: digits.2-letters.digits + optional .qualifier
    const codeRegex = /^\d+\.[A-Z]{2}\.\d+(?:\.[A-Z0-9]+)?$/;
    if (!codeRegex.test(code)) {
      throw new BadRequestException(
        `"${code}" is not valid CCI. Use e.g. "3.IP.10" or "3.IP.10.VX".`,
      );
    }

    // 2) Delegate to service
    return this.service.searchByCode(code);
  }
}
