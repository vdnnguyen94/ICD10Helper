// src/icd/icd-ai.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { IcdEnhancedService } from './icd-vector.service';
import { OpenAIService } from '../openai.service';
import { IcdAiEnhancedResult } from './icd-ai-enhanced-response.dto';
import { FinalCodingPackage } from './final-coding-package.dto';

@Injectable()
export class IcdAiService {
  private readonly logger = new Logger(IcdAiService.name);

  constructor(
    private readonly icdEnhancedService: IcdEnhancedService,
    private readonly openaiService: OpenAIService,
  ) {}

  async getFullCodingPackage(term: string): Promise<FinalCodingPackage> {
    const start = Date.now();
    
    // 1. Get initial candidates from vector search
    const initialCandidates = await this.icdEnhancedService.search(term);
    if (initialCandidates.status !== 'matched' || initialCandidates.items.length === 0) {
      return {
        results: [],
        summary: 'No relevant ICD-10-CA codes were found for the provided term.',
        processingTimeMs: Date.now() - start,
      };
    }

    try {
      // 2. Build a comprehensive prompt for the AI
      const prompt = this.buildAiPrompt(term, initialCandidates.items);

      // 3. Get the structured response from the AI
      // ---- FIX STARTS HERE ----
      const aiResponse = await this.openaiService.chatCompletion([
        { role: 'user', content: prompt },
      ]);

      const aiResponseString = aiResponse.choices[0].message?.content;

      if (!aiResponseString) {
        this.logger.error('AI returned empty content for the coding package prompt.');
        throw new Error('AI returned no content.');
      }
      // ---- FIX ENDS HERE ----
      
      // 4. Parse the AI's JSON response
      const finalPackage = JSON.parse(aiResponseString);

      return {
        ...finalPackage,
        processingTimeMs: Date.now() - start,
      };

    } catch (error) {
      this.logger.error('Error during AI coding package generation:', error);
      throw new Error('Failed to generate the final coding package from AI.');
    }
  }

  private buildAiPrompt(term: string, candidates: IcdAiEnhancedResult[]): string {
    const candidateJson = JSON.stringify(candidates.map(c => ({
      code: c.code,
      description: c.description,
      includes: c.includes,
      excludes: c.excludes,
      notes: c.notes,
      similarityScore: c.similarityScore
    })), null, 2);

    return `
      You are an expert ICD-10-CA medical coder with deep knowledge of the Canadian Institute for Health Information (CIHI) coding standards for both DAD (inpatient) and NACRS (ambulatory) abstracts.

      Your task is to analyze the following clinical scenario and the provided list of candidate ICD-10-CA codes to generate a complete and accurate final coding package.

      **Clinical Scenario:**
      \`\`\`
      ${term}
      \`\`\`

      **Top 100 Candidate Codes (from a vector search):**
      \`\`\`json
      ${candidateJson}
      \`\`\`

      **Instructions:**
      1.  **Analyze the Scenario:** Carefully read the clinical scenario to identify all significant diagnoses and circumstances.
      2.  **Select Codes:** Choose the most appropriate codes from the candidate list. If a necessary code (e.g., an external cause, a specific organism) is suggested by an instructional note (like "Use additional code") but is not in the list, you must state that it's required in your rationale but do not invent a code.
      3.  **Apply Diagnosis Types:** Assign the correct diagnosis type for each code (e.g., M, 1, 2, 3, 9 for DAD; MP, OP for NACRS). Assume the context is DAD unless the scenario clearly indicates an emergency or day surgery visit (then use NACRS).
      4.  **Apply Diagnosis Clusters:** Use a diagnosis cluster character (e.g., 'A', 'B') to link multiple codes that describe a single condition (e.g., an infection with its organism and drug resistance, or a complication with its external cause).
      5.  **Apply Prefixes:** If the scenario mentions an unconfirmed diagnosis ("?pneumonia", "suspected", "probable"), apply prefix 'Q'. If it describes a post-admission condition for an inpatient, apply prefix '5' (before first intervention) or '6' (after first intervention) to Type 2 diagnoses.
      6.  **Provide Rationale:** For each chosen code, provide a concise, clear rationale explaining why it was selected and how it fits into the overall scenario.
      7.  **Generate a Summary:** Write a brief narrative summary explaining the final coding package.

      **Output Format:**
      Your entire response MUST be a single, valid JSON object. Do not include any text, notes, or markdown before or after the JSON object. The JSON object must conform to this structure:
      \`\`\`json
      {
        "results": [
          {
            "code": "string",
            "description": "string",
            "diagnosisType": "string",
            "diagnosisCluster": "string | null",
            "prefix": "string | null",
            "rationale": "string"
          }
        ],
        "summary": "string"
      }
      \`\`\`
    `;
  }
}