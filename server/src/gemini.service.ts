
// server/src/gemini.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';

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
}

