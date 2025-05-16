import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ICD10Code {
  @Field()
  code: string;

  @Field()
  type: 'dagger' | 'asterisk' | 'primary' | 'secondary';

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  notes?: string;
}
