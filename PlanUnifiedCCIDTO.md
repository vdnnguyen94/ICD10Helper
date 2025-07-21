# Plan: Unified DTO & Dual-AI Resolvers

## 🔍 Objective
- Ensure **both** OpenAI _and_ Gemini GraphQL queries return **identical** fields/types.
- Expose a **dual** resolver endpoint that fans out to both models and returns side-by-side results.

---

## 1) Define Unified DTO
File: src/cci/cci-unified.types.ts
- CodeDto
- AppliedAttribute
- CciUnifiedResultItem
- CciUnifiedResponseDto

---

## 2) Update OpenAI Resolver
File: src/cci/cci-ai-enhanced.resolver.ts
1. Imports → CciUnifiedResponseDto, CciUnifiedResultItem
2. @Query returns CciUnifiedResponseDto (name: cciAiEnhancedSearch)
3. Map top-50 candidates + OpenAI selections → unified items
4. Sort (chosen first, then code α, then similarity ↓), slice top 20
5. Return { items: CciUnifiedResultItem[], searchTimeMs }

---

## 3) Update Gemini Resolver
File: src/cci/cci-gemini-enhanced.resolver.ts
1. Imports → CciUnifiedResponseDto, CciUnifiedResultItem
2. @Query returns CciUnifiedResponseDto (name: cciGeminiEnhancedSearch)
3. Use service’s merged+sorted top 20
4. Map each CciGeminiEnhancedResultItem → CciUnifiedResultItem
5. Return { items: CciUnifiedResultItem[], searchTimeMs }

---

## 4) Create Dual Resolver
File: src/cci/cci-dual-enhanced.resolver.ts

@Resolver()
public class CciDualEnhancedResolver {
  @Query(name = "cciDualEnhancedSearch")
  public CciDualEnhancedResponse cciDualEnhancedSearch(@Args("term") String term) {
    // 1) fetchTop50Rubrics once
    // 2) OpenAI path → unified items + time
    // 3) Gemini path → unified items + time
    // 4) return both lists + times
  }
}

---

## 5) Schema & Cleanup
- Remove duplicate CodeDto/AppliedAttribute definitions.
- Import shared types everywhere.
- Restart Nest to regenerate the schema.

---

## 6) Testing Queries

### OpenAI-only
\`\`\`graphql
query {
  cciAiEnhancedSearch(term: "…STEMI…") {
    searchTimeMs
    items { /* unified fields */ }
  }
}
\`\`\`

### Gemini-only
\`\`\`graphql
query {
  cciGeminiEnhancedSearch(term: "…STEMI…") {
    searchTimeMs
    items { /* unified fields */ }
  }
}
\`\`\`

### Dual
\`\`\`graphql
query {
  cciDualEnhancedSearch(term: "…STEMI…") {
    searchTimeMsOpenAI
    searchTimeMsGemini
    openai { /* unified fields */ }
    gemini { /* unified fields */ }
  }
}
\`\`\`

---

**Branch:** \`unify-ai-result\`  
**Files to modify:**  
- cci-unified.types.ts  
- cci-ai-enhanced.resolver.ts  
- cci-gemini-enhanced.resolver.ts  
- cci-dual-enhanced.resolver.ts  
- Remove duplicates in cci-gemini-enhanced.types.ts
