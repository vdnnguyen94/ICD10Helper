// src/openai.service.ts

import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { CCIResponse } from './dto/cci-response.type';
import { ICD10CodeResponse } from './dto/icd10-response.type';

dotenv.config();

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly client: OpenAI;

  // Centralize model names for easier updates
  private readonly embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  private readonly chatModel = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in the environment variables.');
    }
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Creates a vector embedding for a given text input.
   * This method is used by the vector search service.
   * @param text The input string to embed.
   * @returns A promise that resolves to a numerical vector embedding.
   */
  async createEmbedding(text: string): Promise<number[]> {
    // Ensure input text is clean and not empty
    const inputText = text.trim().replace(/\n/g, ' ');
    if (!inputText) {
      this.logger.warn('createEmbedding called with empty text.');
      // Return a zero-vector or handle as an error, depending on desired behavior
      return []; 
    }

    try {
      const resp = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: inputText,
      });
      return resp.data[0].embedding;
    } catch (error) {
      this.logger.error('Failed to create embedding from OpenAI', error);
      throw new Error('Error in creating embedding.');
    }
  }

  /**
   * Looks up an ICD-10 code using the OpenAI chat model.
   * @param term The diagnostic term to look up.
   */
  async lookupICD10(term: string): Promise<ICD10CodeResponse> {
    const systemPrompt = `You are a certified Canadian medical coder using ICD-10-CA. Respond with codes in strict JSON format for any diagnosis using this structure:
{
  "codes": [
    {
      "code": "ICD_CODE",
      "type": "dagger | asterisk | primary | secondary",
      "description": "Brief description of code",
      "notes": "Guidance if needed"
    }
  ],
  "status": "matched | partial | not_found"
}`;

    const userPrompt = `Diagnosis: ${term}`;

    try {
      const res = await this.client.chat.completions.create({
        model: this.chatModel,
        temperature: 0.2,
        max_tokens: 512,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: "json_object" },
      });

      const content = res.choices[0].message?.content;
      if (!content) {
        this.logger.warn('OpenAI ICD-10 lookup returned empty content for term:', term);
        return { codes: [], status: 'not_found' };
      }

      return JSON.parse(content) as ICD10CodeResponse;
    } catch (err) {
      this.logger.error('OpenAI ICD-10 lookup or JSON parsing failed:', err);
      return { codes: [], status: 'not_found' };
    }
  }

  /**
   * Looks up a CCI code using the OpenAI chat model.
   * @param term The intervention term to look up.
   */
  async lookupCCI(term: string): Promise<CCIResponse> {
    const systemPrompt = this.getCCISystemPrompt();
    const userPrompt = `Intervention: ${term}`;

    try {
      const res = await this.client.chat.completions.create({
        model: this.chatModel,
        temperature: 0.2,
        max_tokens: 2048,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: "json_object" },
      });

      const content = res.choices[0].message?.content;

      if (!content) {
        this.logger.warn('OpenAI CCI lookup returned empty content for term:', term);
        return { codes: [], status: 'not_found' };
      }
      
      return JSON.parse(content) as CCIResponse;
    } catch (err) {
      this.logger.error('OpenAI CCI lookup or JSON parsing failed:', err);
      return { codes: [], status: 'not_found' };
    }
  }

  /**
   * Returns the detailed system prompt for CCI code lookup.
   */
  private getCCISystemPrompt(): string {
    // The prompt you provided is very detailed and well-structured, which is excellent.
    // No changes were needed here.
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

  async chatCompletion(
    messages: { role: 'system' | 'user'; content: string }[]
  ) {
    return this.client.chat.completions.create({
      model: this.chatModel,
      messages,
    });
  }
}