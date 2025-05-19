import { Resolver, Query, Mutation } from '@nestjs/graphql';
import { CounterService } from '../counter/counter.service';

@Resolver()
export class CounterResolver {
  constructor(private readonly counterService: CounterService) {}

  /**
   * Get current lookup count
   */
  @Query(() => Number)
  async lookupCount(): Promise<number> {
    return this.counterService.getCount();
  }

  /**
   * Increment lookup count by 1 and return new value
   */
  @Mutation(() => Number)
  async incrementLookupCount(): Promise<number> {
    return this.counterService.increment();
  }
}