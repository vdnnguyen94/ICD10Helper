# ICD-10-CA Lookup and AI Enhancement Strategy

This document outlines the implementation strategy for building a reliable and intelligent ICD-10-CA lookup system with vector search, GPT-4o AI refinement, and contextual information display.

---

## ✅ Data Structure and Embedding

- ICD-10-CA codes are stored in MongoDB (`ICD10CA_Sytem.ICD10CA_Catalog`)
- Each document includes:
  - `code`, `description`, `includes`, `excludes`, `notes`
  - `search_text`: concatenated field used for semantic embedding
  - `embedding`: 1536-dim vector using OpenAI `text-embedding-3-small`

### Ingestion Plan:
1. Upload all ICD JSON records using `insertMany()`
2. Run a separate script (`fix-icd-embeddings.ts`) to add `embedding` field per document
3. Create a MongoDB Atlas vector index:
   - Index name: `icd_search`
   - Path: `embedding`
   - Type: vector
   - Dimensions: 1536
   - Similarity: cosine

---

## 🔍 Vector Search + GPT-4o AI

- Top 100 results are retrieved using `$vectorSearch` based on user query
- GPT-4o is used to:
  - Select the best matching code
  - Identify mandatory additional codes if needed
  - Provide rationale for the match
- Only selected fields are passed to GPT (exclude `embedding`, `search_text`)

---

## 🖱️ Frontend Design

- Each ICD-10 code is **clickable** to show:
  - Full details (description, includes, excludes, notes)
  - Parent code details (e.g., A01.0 → A01)
- **Expandable navigation**:
  - Users can click to view "30 codes above" or "30 below"
  - Uses pre-sorted alphabetical code list
- Planned optional grouping:
  - Organize codes by **block** and **chapter**
  - Add fields like `blockCode`, `blockTitle`, `chapterCode`, `chapterTitle`

---

## 🧠 Rules for Additional ICD Codes

The following cases trigger **mandatory or recommended additional codes**:

### 1. Use Additional Code
- Codes with "use additional code" instruction (e.g., K12.3 → D70.0)
- Must detect these and include in UI or AI prompt

### 2. Drug-Resistant Infections
- Requires 3 codes:
  - Site of infection (e.g., J15.2)
  - Organism (e.g., B95.6)
  - Resistance (e.g., U82.1)
- Must apply a **diagnosis cluster** (e.g., cluster A) to link the codes

### 3. Adverse Effects / Poisoning
- Code the **effect** (e.g., thrombocytopenia)
- Then code the **cause** (e.g., Y44.2 – adverse drug effect)

### 4. Neoplasms
- Secondary malignancies must be followed by a code for the **primary site**

### 5. Dagger / Asterisk Pairs
- Underlying condition (dagger) + manifestation (asterisk)
- Both codes must be assigned together

---

## 🧰 Future Enhancements

- JSON schema to support:
  - `requires_additional_codes: true`
  - `related_codes: ["B95.6", "U82.1"]`
  - `dagger: true`, `asterisk: true`
  - `clusterGroup: "A"`
- Advanced frontend features:
  - Filter by chapter/block
  - Explain related codes or clusters using tooltips
- Smart AI reranker prompt to highlight “use additional code” rules

---

## ✅ Summary

You are building an ICD-10-CA system that combines:
- Accurate search
- Context-rich browsing
- Real-world clinical coding rules
- GPT-powered explanation and decision support

This goes beyond a lookup tool into a coder’s intelligent assistant.

