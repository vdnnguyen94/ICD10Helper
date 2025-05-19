import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Counter } from './counter.schema';

@Injectable()
export class CounterService {
  constructor(
    @InjectModel(Counter.name) private counterModel: Model<Counter>,
  ) {}

  async getCount(): Promise<number> {
    let doc = await this.counterModel.findOne().exec();
    if (!doc) {
      doc = new this.counterModel({ count: 100 });
      await doc.save();
    }
    return doc.count;
  }

  async increment(): Promise<number> {
    const doc = await this.counterModel.findOneAndUpdate(
      {},
      { $inc: { count: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();
    return doc.count;
  }
}