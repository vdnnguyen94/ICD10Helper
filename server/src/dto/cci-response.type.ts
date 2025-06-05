import { Field, ObjectType } from '@nestjs/graphql';
import { CCICode } from './cci-code.type';

@ObjectType()
export class CCIResponse {
  @Field(() => [CCICode], { description: 'A list of found CCI codes with their breakdowns.' })
  codes: CCICode[];

  @Field(() => String, { description: 'Status of the lookup: "matched", "partial", or "not_found".' })
  status: 'matched' | 'partial' | 'not_found';
}