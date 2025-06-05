
// server/src/gemini.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import { CCIResponse } from './dto/cci-response.type'; // Added import
import { ICD10CodeResponse } from './dto/icd10-response.type'; // Ensure this is the correct path if you keep it here

dotenv.config();

@Injectable()
export class GeminiService {
  private readonly ai: GoogleGenAI;
  private readonly logger = new Logger(GeminiService.name);
  private readonly modelId: string;

  constructor() {
    this.modelId = process.env.GEMINI_MODEL_ID || 'gemini-2.5-pro-preview-05-06';

    const useVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true';
    if (useVertex) {
      const project = process.env.GOOGLE_CLOUD_PROJECT;
      const location = process.env.GOOGLE_CLOUD_LOCATION;
      if (!project || !location) {
        throw new Error('GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION must be set for Vertex AI');
      }
      this.ai = new GoogleGenAI({
        vertexai: true,
        project,
        location,
      });
    } else {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not set');
      }
      this.ai = new GoogleGenAI({
        vertexai: false,
        apiKey,
      });
    }
  }

  /**
   * Lookup ICD-10-CA code via Gemini using GoogleGenAI
   */
  async lookupICD10(term: string): Promise<any> {
    const systemPrompt = `You are a certified Canadian medical coder using ICD-10-CA.\n` +
      `Respond with only valid JSON—no markdown or code fences. Use this structure:\n` +
      `{\n` +
      `  \"codes\": [\n` +
      `    {\n` +
      `      \"code\": \"ICD_CODE\",\n` +
      `      \"type\": \"dagger | asterisk | primary | secondary\",\n` +
      `      \"description\": \"Brief description\",\n` +
      `      \"notes\": \"Guidance if needed\"\n` +
      `    }\n` +
      `  ],\n` +
      `  \"status\": \"matched | partial | not_found\"\n` +
      `}`;
    const userPrompt = `Diagnosis: ${term}`;
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    try {
      const response = await this.ai.models.generateContent({
        model: this.modelId,
        contents: fullPrompt,
      });

      const raw = response.text;
      if (typeof raw !== 'string') {
        this.logger.error('Unexpected Gemini response', JSON.stringify(response));
        throw new Error('Invalid response from Gemini');
      }

      const cleaned = raw
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      return JSON.parse(cleaned);
    } catch (err) {
      this.logger.error('Gemini lookup failed', err as Error);
      return { codes: [], status: 'not_found' };
    }
  }
  private getCCISystemPrompt(): string {
    return `You are an expert medical coder certified by the Canadian Institute for Health Information (CIHI), specializing in the Canadian Classification of Health Interventions (CCI). CCI is based on ICD-10-CA principles.
Your task is to analyze the provided description of a medical intervention or procedure and return the most relevant CCI code(s).
Always adhere to CIHI coding guidelines and standards for CCI.
Respond with ONLY valid JSON, strictly adhering to the following structure. Do not include any markdown, code fences, or explanatory text outside of the JSON structure itself.

The JSON response must be an object with two top-level keys: "codes" and "status".
1. "codes": An array of CCI code objects. Each object in this array must contain:
    - "cciCode": A string representing the full CCI code (e.g., "1.AN.09.JA.DV"). Ensure the code is complete and correctly formatted. Do not use '^^' or other non-standard separators. The code should generally follow a 7-character structure, with segments separated by periods, but adapt to the specific intervention's requirements as per CCI rules.
    - "description": A concise, human-readable general description of the intervention represented by this CCI code.
    - "breakdown": An object detailing each component of the CCI code:
        - "field1_section": An object with "code" (e.g., "1") and "description" (e.g., "Physical/Physiological Therapeutic Interventions").
        - "field2_anatomySite": An object with "code" (e.g., "AN") and "description" (e.g., "Brain").
        - "field3_intervention": An object with "code" (e.g., "09") and "description" (e.g., "Stimulation").
        - "field4_qualifier1_approachTechnique": An object with "code" (e.g., "JA") and "description" (e.g., "External approach").
        - "field5_qualifier2_agentOrDevice": An object with "code" (e.g., "DV") and "description" (e.g., "Electrical stimulation device").
        - "field6_qualifier3_tissue": An object with "code" (can be an empty string "" or appropriate code if not applicable/left blank, e.g., "XX" if CIHI specifies a placeholder for 'no tissue' or 'not applicable') and "description" (e.g., "No tissue used", "Not applicable", or the specific tissue description).
    - "notes": A string for any additional coding guidance, clarifications, or CIHI-specific rules that apply to this code (optional, use an empty string if no notes).

2. "status": A string indicating the outcome of the lookup. Possible values are:
    - "matched": If one or more relevant CCI codes are confidently found.
    - "partial": If the information is insufficient for a definitive code, but potential leads are found.
    - "not_found": If no relevant CCI code can be determined from the input.

Example of a "breakdown" sub-object for a code like "1.AN.09.JA.DV" (assuming tissue is not applicable or explicitly left blank):
"breakdown": {
  "field1_section": { "code": "1", "description": "Physical/Physiological Therapeutic Interventions" },
  "field2_anatomySite": { "code": "AN", "description": "Brain" },
  "field3_intervention": { "code": "09", "description": "Stimulation" },
  "field4_qualifier1_approachTechnique": { "code": "JA", "description": "External approach" },
  "field5_qualifier2_agentOrDevice": { "code": "DV", "description": "Electrical stimulation device" },
  "field6_qualifier3_tissue": { "code": "", "description": "No tissue used / Not applicable" }
}

If multiple distinct interventions are described or if multiple CCI codes could apply according to CIHI rules (e.g., combination codes, or equally valid alternatives), include each as a separate object within the "codes" array. Prioritize accuracy and adherence to CIHI CCI coding standards. Do not invent codes or descriptions.
The user will provide the intervention term or scenario.`;
  }
  /**
   * Lookup CCI code via Gemini
   */
  /**
   * NEW METHOD: Lookup CCI code via Gemini, consistent with your existing patterns
   */
  async lookupCCI(term: string): Promise<CCIResponse> { // Ensure CCIResponse is imported
    const systemPrompt = this.getCCISystemPrompt(); // Uses the CCI prompt generation method
    const userPrompt = `Intervention: ${term}`;
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`; // Combine prompts into a single string

    try {
      const response = await this.ai.models.generateContent({ // Using YOUR established pattern
        model: this.modelId, // Ensure this.modelId is appropriate for the task (e.g., latest compatible)
        contents: fullPrompt, // Pass the combined prompt as a single string
      });

      const raw = response.text; // Using YOUR established response handling (property access)

      if (typeof raw !== 'string') {
        this.logger.error('Unexpected Gemini CCI response type for "raw"', {'response': response});
        throw new Error('Invalid response type from Gemini for CCI (raw.text)');
      }

      const cleaned = raw
        .trim()
        .replace(/^```json\s*/i, '') // Remove markdown ```json if present
        .replace(/\s*```$/i, '')     // Remove trailing ```
        .trim();

      this.logger.debug(`Gemini CCI Raw: ${raw}`);
      this.logger.debug(`Gemini CCI Cleaned: ${cleaned}`);
      
      if (!cleaned) {
        this.logger.warn('Gemini CCI lookup returned empty cleaned content.');
        return { codes: [], status: 'not_found' };
      }
      
      return JSON.parse(cleaned) as CCIResponse;
    } catch (err) {
      this.logger.error('Gemini CCI lookup failed', { error: err, term: term });
      return { codes: [], status: 'not_found' }; // Ensure this matches CCIResponse structure
    }
  }
}

