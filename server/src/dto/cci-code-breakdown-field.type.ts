import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CCICodeBreakdownField {
  @Field(() => String, { description: 'The code for this specific field component (e.g., "1", "AN"). Can be empty for optional fields like tissue if not applicable.' })
  code: string;

  @Field(() => String, { nullable: true, description: 'The description of this field component (e.g., "Physical/Physiological Therapeutic Interventions").' })
  description?: string;
}