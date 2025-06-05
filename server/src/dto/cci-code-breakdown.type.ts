import { Field, ObjectType } from '@nestjs/graphql';
import { CCICodeBreakdownField } from './cci-code-breakdown-field.type';

@ObjectType()
export class CCICodeBreakdown {
  @Field(() => CCICodeBreakdownField, { description: 'Field 1: Section' })
  field1_section: CCICodeBreakdownField;

  @Field(() => CCICodeBreakdownField, { description: 'Field 2: Anatomy Site (Group)' })
  field2_anatomySite: CCICodeBreakdownField;

  @Field(() => CCICodeBreakdownField, { description: 'Field 3: Intervention' })
  field3_intervention: CCICodeBreakdownField;

  @Field(() => CCICodeBreakdownField, { description: 'Field 4: Qualifier 1 (Approach/Technique)' })
  field4_qualifier1_approachTechnique: CCICodeBreakdownField;

  @Field(() => CCICodeBreakdownField, { description: 'Field 5: Qualifier 2 (Agent or Device)' })
  field5_qualifier2_agentOrDevice: CCICodeBreakdownField;

  @Field(() => CCICodeBreakdownField, { nullable: true, description: 'Field 6: Qualifier 3 (Tissue). May not always be present or applicable.' })
  field6_qualifier3_tissue?: CCICodeBreakdownField;
}