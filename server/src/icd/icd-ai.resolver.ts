// src/icd/icd-ai.resolver.ts

import { Resolver, Query, Args } from '@nestjs/graphql';
import { IcdAiService } from './icd-ai.service';
import { FinalCodingPackage } from './final-coding-package.dto';

@Resolver(() => FinalCodingPackage)
export class IcdAiResolver {
  constructor(private readonly icdAiService: IcdAiService) {}

  @Query(() => FinalCodingPackage, { name: 'getFullCodingPackage' })
  async getFullCodingPackage(
    @Args('term') term: string
  ): Promise<FinalCodingPackage> {
    return this.icdAiService.getFullCodingPackage(term);
  }
}