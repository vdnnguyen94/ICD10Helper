import { Field, ObjectType } from '@nestjs/graphql';
import { ICD10Code } from './icd10-code.type';

@ObjectType()
export class ICD10CodeResponse {
  @Field(() => [ICD10Code])
  codes: ICD10Code[];

  @Field()
  status: 'matched' | 'partial' | 'not_found';
}
