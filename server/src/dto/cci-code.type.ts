import { Field, ObjectType } from '@nestjs/graphql';
import { CCICodeBreakdown } from './cci-code-breakdown.type';

@ObjectType()
export class CCICode {
  @Field(() => String, { description: 'The full CCI code.' })
  cciCode: string;

  @Field(() => String, { nullable: true, description: 'A general description of the CCI code.' })
  description?: string;

  @Field(() => CCICodeBreakdown, { description: 'Detailed breakdown of the CCI code components.' })
  breakdown: CCICodeBreakdown;

  @Field(() => String, { nullable: true, description: 'Additional notes or coding guidance.' })
  notes?: string;
}