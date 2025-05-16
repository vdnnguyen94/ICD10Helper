import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async lookupICD10(term: string) {
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

    const res = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2,
      max_tokens: 512,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const content = res.choices[0].message?.content;
    console.log('GPT raw content:', content);
    const cleanContent = content?.trim().replace(/^```json|```$/g, '').trim();
    console.log('CLEAN CONTENT', cleanContent);
    try {
    return JSON.parse(cleanContent || '{}');
    } catch (err) {
    console.error('JSON parse error:', err);
    return {
        codes: [],
        status: 'not_found',
    };
    }
  }
}
