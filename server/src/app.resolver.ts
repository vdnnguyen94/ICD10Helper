import { Resolver, Query } from '@nestjs/graphql';

@Resolver()
export class AppResolver {
  @Query(() => String)
  hello(): string {
    return 'Hello from VAN NGUYEN NestJS API';
  }
  @Query(() => String)
  checkEnv(): string {
    return `Allowed Origins: ${process.env.ALLOWED_ORIGINS || 'NOT SET'}`;
  }
  
}
