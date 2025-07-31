// src/icd/icd.resolver.ts

import { Resolver, Query, Args } from '@nestjs/graphql';
import { IcdCodeItem } from './icd-unified.types';
import { MongoClient, Db } from 'mongodb';
import { Inject } from '@nestjs/common';

@Resolver(() => IcdCodeItem)
export class IcdReadResolver {
  private db: Db;

  constructor(@Inject('ICD_MONGO_CLIENT') client: MongoClient) {
    this.db = client.db('ICD10CA_System');
  }


  @Query(() => [IcdCodeItem])
  async getIcdContext(@Args('code') code: string): Promise<IcdCodeItem[]> {
    const collection = this.db.collection<IcdCodeItem>('ICD10CA_Catalog');
    const all = await collection
      .find({}, { projection: { embedding: 0, search_text: 0 } })
      .sort({ code: 1 })
      .toArray();

    const index = all.findIndex((item) => item.code === code);
    if (index === -1) return [];

    const start = Math.max(index - 30, 0);
    const end = Math.min(index + 31, all.length); // include selected + 30 after

    return all.slice(start, end);
  }

  @Query(() => [IcdCodeItem])
  async getIcdByBlockRange(
    @Args('start') start: string,
    @Args('end') end: string
  ): Promise<IcdCodeItem[]> {
    const nextEnd = this.incrementCode(end);
    const collection = this.db.collection<IcdCodeItem>('ICD10CA_Catalog');

    return collection
      .find(
        { code: { $gte: start, $lt: nextEnd } },
        { projection: { embedding: 0, search_text: 0 } }
      )
      .sort({ code: 1 })
      .toArray();
  }

  private incrementCode(code: string): string {
    const letter = code[0];
    const number = parseInt(code.slice(1), 10);
    const nextNumber = number + 1;
    return `${letter}${nextNumber.toString().padStart(2, '0')}`;
  }

  @Query(() => [IcdCodeItem])
async getIcdAbove(@Args('code') code: string): Promise<IcdCodeItem[]> {
  const collection = this.db.collection<IcdCodeItem>('ICD10CA_Catalog');
  const all = await collection
    .find({}, { projection: { embedding: 0, search_text: 0 } })
    .sort({ code: 1 })
    .toArray();

  const index = all.findIndex((item) => item.code === code);
  if (index === -1) return [];

  const start = Math.max(index - 30, 0);
  return all.slice(start, index); // codes above, excluding the current code
}

  @Query(() => [IcdCodeItem])
  async getIcdBelow(@Args('code') code: string): Promise<IcdCodeItem[]> {
    const collection = this.db.collection<IcdCodeItem>('ICD10CA_Catalog');
    const all = await collection
      .find({}, { projection: { embedding: 0, search_text: 0 } })
      .sort({ code: 1 })
      .toArray();

    const index = all.findIndex((item) => item.code === code);
    if (index === -1) return [];

    const end = Math.min(index + 31, all.length);
    return all.slice(index + 1, end); // codes below, excluding the current code
  }
}
