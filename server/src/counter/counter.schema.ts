import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Counter extends Document {
  @Prop({ default: 100 })
  count: number;
}
export const CounterSchema = SchemaFactory.createForClass(Counter);