# CCI Module: Architecture & Incremental Implementation Plan

### 1. Add CCI components and test in the browser

Instead of using Nest CLI, you can manually wire up just the service and resolver and verify via GraphQL Playground:

1. **Create your service and resolver files** under `src/cci/`:

   * `cci.service.ts` (implements the lookup logic)
   * `cci.resolver.ts` (exposes a `@Query() cciSearch(term: string)` endpoint)

2. **Register them** in your root `AppModule`:

```ts
import { CciService } from './cci/cci.service';
import { CciResolver } from './cci/cci.resolver';

@Module({
  providers: [CciService, CciResolver, /* ...other providers */]
})
export class AppModule {}
```

3. **Start your server** in dev mode:

```bash
npm run start:dev
```

4. **Open GraphQL Playground** in your browser:

```
http://localhost:3000/graphql
```

5. **Run a test query**:

```graphql
query {
  cciSearch(term: "Drainage, ventricles of brain") {
    items {
      code
      description
      qualifiers { code approach description }
      attributes { code description }
    }
    status
  }
}
```

---

### 2. Define GraphQL DTOs (in `src/cci/dto/`)

**a) `cci-catalog-item.type.ts`**

```ts
@ObjectType()
export class CciAttributeValue {
  @Field() code: string;
  @Field() description?: string;
}

@ObjectType()
export class CciQualifier {
  @Field() code: string;
  @Field() approach: string;
  @Field() description: string;
}

@ObjectType()
export class CciCatalogItem {
  @Field() code: string;
  @Field() description: string;
  @Field(() => [String]) includes: string[];
  @Field(() => [String]) excludes: string[];
  @Field(() => [String]) codeAlso: string[];
  @Field(() => [String]) note: string[];
  @Field(() => [CciAttributeValue]) attributes: CciAttributeValue[];
  @Field(() => [CciQualifier]) qualifiers: CciQualifier[];
  @Field(() => Float) similarityScore: number;
}
```

**b) `cci-search-response.type.ts`**

```ts
@ObjectType()
export class CciSearchResponse {
  @Field(() => [CciCatalogItem]) items: CciCatalogItem[];
  @Field() status: 'matched' | 'partial' | 'not_found';
}
```

---

### 3. Implement core services

#### a) `CciVectorSearchService`

* Method: `searchByVector(vec: number[], opts: { k: number; numCandidates: number; }): Promise<CciCatalogItem[]>`
* Encapsulates MongoDB `$vectorSearch` aggregation.

#### b) `CciEnrichmentService`

* Methods:

  * `enrichAttributes(rawAttrs, definitions)`: maps codes → human labels
  * `splitQualifiers(allQuals, prompt)`: returns `{ applied, others }`

#### c) `CciLookupService`

* Orchestrates full flow:

  1. call OpenAI embed → `queryVec`
  2. call `CciVectorSearchService.searchByVector(queryVec)`
  3. call `CciEnrichmentService` to post-process hits
  4. return top‑N items or feed into LLM for final pick

---

### 4. Wire up the Resolver (`CciResolver`)

```ts
@Resolver()
export class CciResolver {
  constructor(private lookup: CciLookupService) {}

  @Query(() => CciSearchResponse)
  async cciSearch(@Args('term') term: string) {
    return this.lookup.search(term);
  }
}
```

---

### 5. Testing strategy (Jest)

* **Unit**:

  * `vector-search.service.spec.ts`: mock MongoCollection, assert correct pipeline.
  * `enrichment.service.spec.ts`: pure‑fn tests mapping codes → labels, qualifier split.
  * `lookup.service.spec.ts`: mock OpenAI + vectorSearch + enrichment, assert orchestration.

* **Integration**:

  * Spin up an in‑memory Mongo (e.g. `mongodb-memory-server`), ingest a few docs, run resolver query.

---

### 6. CI / Process

1. **Feature branch** per capability (e.g. `feature/cci-vector-search`).
2. **PR** with lint + unit tests passing as pre‑merge checks.
3. **Incremental releases**: version minor bump for each new sub-feature—vector search, enrichment, LLM fallback.

---

### 7. Next Steps / MVP

1. Deliver `CciVectorSearchService` + its unit tests.
2. Create GraphQL types + basic resolver wired to vectorSearch only.
3. Add `CciEnrichmentService` + tests; update resolver to return enriched items.
4. Integrate `OpenAIService.lookupCCI` as optional fallback or combined step.
5. Add end‑to‑end integration tests and update documentation.
