// src/icd/icd.resolver.ts

import { Resolver, Query, Args } from '@nestjs/graphql';
import { IcdCodeItem } from './icd-unified.types';
import { MongoClient, Db } from 'mongodb';
import { Inject } from '@nestjs/common';
import { UserInputError } from 'apollo-server-express';
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

  @Query(() => [IcdCodeItem], { description: 'Gets all codes within a block or a range of blocks.' })
  async getIcdByBlockRange(
    @Args('start') start: string,
    @Args('end') end: string
  ): Promise<IcdCodeItem[]> {
    
    // If the AI is looking for a single code's context.
    if (start === end) {
      // Call the getIcdContext method to get the code plus 20 above and 20 below.
      return this.getIcdContext(start);
    }
    
    // Logic for a true range search (e.g., L03 to L05)
    const collection = this.db.collection<IcdCodeItem>('ICD10CA_Catalog');
    const filter = { code: { $gte: start, $lte: `${end}z` } };

    return collection
      .find(filter, { projection: { embedding: 0, search_text: 0 } })
      .sort({ code: 1 })
      .toArray();
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

  @Query(() => IcdCodeItem, { nullable: true, description: 'Fetches a single ICD-10-CA item by its exact code.' })
  async getIcdByCode(
    @Args('code') code: string
  ): Promise<IcdCodeItem | null> {
    const collection = this.db.collection<IcdCodeItem>('ICD10CA_Catalog');
    
    // Use findOne() to get the specific document that matches the code
    const result = await collection.findOne(
        { code }, // The filter to find the document by its code
        { projection: { embedding: 0, search_text: 0 } } // Exclude unnecessary fields
    );
    
    return result;
  }

   @Query(() => [IcdCodeItem], { description: 'Smart search for an ICD code. Validates format and finds closest match if the exact code is not found.' })
  async smartSearchContext(
    @Args('code') code: string
  ): Promise<IcdCodeItem[]> {
    const icdPattern = /^[A-Z]\d{2}(\.\d[A-Z0-9]?)?$/;
    
    // 1. Validate the code's pattern
    if (!icdPattern.test(code)) {
      throw new UserInputError(`"${code}" is not a valid ICD-10-CA code format.`);
    }

    const collection = this.db.collection<IcdCodeItem>('ICD10CA_Catalog');
    
    // Fetch all codes to perform the search logic
    const allCodes = await collection
      .find({}, { projection: { embedding: 0, search_text: 0 } })
      .sort({ code: 1 })
      .toArray();

    const exactIndex = allCodes.findIndex((item) => item.code === code);

    let startIndex = -1;

    if (exactIndex !== -1) {
      // 2. If the exact code is found, start from there.
      startIndex = exactIndex;
    } else {
      // 3. If not found, find the "closest" code (the one that would come right after it alphabetically).
      // This works because the codes are sorted.
      startIndex = allCodes.findIndex((item) => item.code > code);
    }
    
    if (startIndex === -1) {
        // This case handles if the user enters a code "larger" than any in the DB, e.g., "Z99.9"
        // We can return the last 30 codes as a fallback.
        return allCodes.slice(-30);
    }

    // 4. Return the found code (or the closest one) plus the next 30 codes.
    const endIndex = Math.min(startIndex + 31, allCodes.length);
    return allCodes.slice(startIndex, endIndex);
  }
}

