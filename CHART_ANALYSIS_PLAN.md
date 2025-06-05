# Chart Analysis Feature: Implementation Plan

## 1. Introduction
This document outlines the plan for a new "Chart Analysis" feature. This feature will allow a medical coder to paste the text of a patient document (e.g., a discharge summary) and receive AI-generated coding suggestions for both ICD-10 CA (diagnoses) and CCI (procedures).

The implementation includes two critical components:
- A preliminary privacy check to prevent the exposure of Personal Health Information (PHI).
- Context-aware coding logic that differentiates between inpatient and outpatient coding rules.

## 2. Core Concepts: Inpatient vs. Outpatient Coding

| Feature               | Inpatient Coding                                                                 | Outpatient Coding                                                                 |
|----------------------|----------------------------------------------------------------------------------|----------------------------------------------------------------------------------|
| **Setting**          | Patient is formally admitted to a hospital with a physician's order.            | Patient receives care in a clinic, ER (and is sent home), or same-day surgery.  |
| **Primary Diagnosis**| Principal Diagnosis (PDx): The condition chiefly responsible for admission.      | Main Reason for Encounter: Diagnosis/symptom that led to the visit.             |
| **Secondary Diagnoses**| Code all co-existing conditions affecting treatment/LOS.                       | Code only diagnoses managed/addressed during the visit.                         |
| **Uncertain Diagnoses**| Permitted: code "probable", "suspected", etc., as confirmed.                   | Not permitted: must code only confirmed conditions or symptoms.                 |
| **Procedure Coding** | Code all significant procedures during the entire admission.                     | Code only procedures/services during that single encounter.                     |

## 3. Implementation Plan

### Step 1: UI/UX - The Chart Analysis Page
- **File:** `src/pages/ChartAnalysisPage.jsx`
- **Route:** New route and NavLink in `App.jsx` → `/chart-analysis`

**UI Components:**
- A large `<textarea>` for users to paste document text
- A dropdown/toggle to select context: "Inpatient" or "Outpatient"
- An `<Analyze Document>` button
- Two result display sections: one for ICD-10 CA, one for CCI (reuses `AIResultCard` and `CCIResultCard`)

---

### Step 2: Backend - The PHI/HIPAA Gatekeeper

**GraphQL Mutation:**

\`\`\`graphql
mutation AnalyzeDocument($documentText: String!, $context: String!) {
  analyzeDocument(documentText: $documentText, context: $context) {
    # diagnoses and procedures
  }
}
\`\`\`

**Privacy Check Service:**

_File: `openai.service.ts`_

\`\`\`ts
async checkForPHI(documentText: string) {
  // Implementation goes here
}
\`\`\`

**PHI Check Prompt:**

\`\`\`text
You are a privacy and compliance officer. Your only task is to analyze the following text for Personal Health Information (PHI) as defined by PHIPA and HIPAA. Identify the presence of names, addresses, phone numbers, email addresses, health card numbers, dates of birth, or any other personally identifiable information.

Respond with ONLY a valid JSON object in the format:
{"containsPHI": boolean, "findings": ["list of PHI types found"]}
\`\`\`

**Backend Logic:**
- The `analyzeDocument` resolver will first call `checkForPHI`.
- If PHI is found (`containsPHI: true`), the process stops and an error is returned.
- If no PHI is found (`containsPHI: false`), coding logic proceeds.

---

### Step 3: Backend - Context-Aware Coding Logic

**New Method in `openai.service.ts`:**

\`\`\`ts
async codeDocument(documentText: string, context: 'inpatient' | 'outpatient') {
  // Implementation goes here
}
\`\`\`

**Inpatient Prompt:**

\`\`\`text
You are an expert Canadian medical coder specializing in inpatient charts (DAD). Analyze the provided document. Your tasks are:
1. Determine the Principal Diagnosis (PDx) based on the condition chiefly responsible for the admission after study.
2. Identify all relevant secondary diagnoses that affect treatment or length of stay.
3. Identify all significant CCI procedures performed during the admission.

Respond with ONLY a valid JSON object in the format:
{"diagnoses": { ... }, "procedures": { ... }}
\`\`\`

**Outpatient Prompt:**

\`\`\`text
You are an expert Canadian medical coder specializing in outpatient charts (NACRS). Analyze the provided document. Your tasks are:
1. Determine the Main Reason for the Encounter.
2. Identify other diagnoses addressed only during this visit. Do not code uncertain diagnoses; use symptom codes instead.
3. Identify all CCI procedures performed only during this visit.

Respond with ONLY a valid JSON object in the format:
{"diagnoses": { ... }, "procedures": { ... }}
\`\`\`

---

### Step 4: Frontend - Displaying Combined Results

**User Flow:**
1. User pastes text & selects context
2. Clicks "Analyze Document"
3. Loading: "Checking for PHI..."
4. If PHI found → display alert
5. If no PHI → loading: "Analyzing Document...", "Generating Codes..."
6. Once complete:
   - ICD-10 results shown in `AIResultCard`
   - CCI results shown in `CCIResultCard`

---

## 4. Overall Workflow Summary

\`\`\`mermaid
graph TD
  A[User pastes document & selects context] --> B[Frontend calls analyzeDocument]
  B --> C[Backend: PHI Check]
  C -->|PHI Found| D[Frontend shows alert & stops]
  C -->|No PHI| E[Backend: Context-Aware Coding]
  E --> F[Backend returns JSON result]
  F --> G[Frontend displays ICD-10 + CCI results]
\`\`\`
