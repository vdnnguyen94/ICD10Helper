import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
dotenv.config();
import { CCIResponse } from './dto/cci-response.type'; // Added import
import { ICD10CodeResponse } from './dto/icd10-response.type'; // Ensure this is the correct path if you keep it here


@Injectable()
export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
   /**
   * Produce a 1,536-dimensional embedding for any input text
   */
  
   async embedText(text: string): Promise<number[]> {
     const resp = await this.openai.embeddings.create({
       model:  process.env.OPENAI_EMBEDDING_MODEL!,
       input:  text,
     });
     return resp.data[0].embedding;
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
    async lookupCCI(term: string): Promise<CCIResponse> {
    const systemPrompt = this.getCCISystemPrompt();
    const userPrompt = `Intervention: ${term}`;

    try {
      const res = await this.openai.chat.completions.create({
        model: 'gpt-4o', // Or your preferred OpenAI model
        temperature: 0.2, // Adjust as needed
        max_tokens: 2048, // CCI responses with breakdown can be larger
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: "json_object" }, // Use JSON mode for reliable JSON output
      });

      const content = res.choices[0].message?.content;
      
      // With JSON mode, the content should be a valid JSON string.
      // The .replace for ```json might not be needed but is harmless.
      const cleanContent = content?.trim().replace(/^```json|```$/g, '').trim();

      if (!cleanContent) {
        console.log('OpenAI CCI lookup returned empty content.');
        return { codes: [], status: 'not_found' };
      }
      
      return JSON.parse(cleanContent) as CCIResponse;
    } catch (err) {
      console.log('OpenAI CCI lookup failed:', err);
      return { codes: [], status: 'not_found' };
    }
  }

}
