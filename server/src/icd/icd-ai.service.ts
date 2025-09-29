import { Inject, Injectable, Logger } from '@nestjs/common';
import { IcdEnhancedService } from './icd-vector.service';
import { OpenAIService } from '../openai.service';
import { IcdAiEnhancedResult } from './icd-ai-enhanced-response.dto';
import { FinalCodingPackage } from './final-coding-package.dto';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { IcdReadResolver } from './icd-read.resolver';
import { IcdCodeItem } from './icd-unified.types';

@Injectable()
export class IcdAiService {
  private readonly logger = new Logger(IcdAiService.name);

  constructor(
    private readonly icdEnhancedService: IcdEnhancedService,
    private readonly openaiService: OpenAIService,
    private readonly icdReadResolver: IcdReadResolver,
  ) {}

  async getFullCodingPackage(term: string): Promise<FinalCodingPackage> {
    const start = Date.now();
    
    const initialCandidates = await this.icdEnhancedService.search(term);
    if (initialCandidates.status !== 'matched' || initialCandidates.items.length === 0) {
      return {
        results: [],
        summary: 'No relevant ICD-10-CA codes were found for the provided term.',
        processingTimeMs: Date.now() - start,
      };
    }

    const tools: ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'getIcdByBlockRange',
          description: 'Fetches a list of ICD-10-CA codes within a specific block range (e.g., A00 to A09). Use this when the initial candidate list is missing a required code from a known chapter or block.',
          parameters: {
            type: 'object',
            properties: {
              start: {
                type: 'string',
                description: 'The starting ICD code of the block (e.g., "A01").',
              },
              end: {
                type: 'string',
                description: 'The ending ICD code of the block (e.g., "A01"). If searching within a single block like "L03", start and end should be the same value.',
              },
            },
            required: ['start', 'end'],
          },
        },
      },
    ];

    const specialRules = this.getInfectionRulePrompt(term);
    const initialPrompt = this.buildAiPrompt(term, initialCandidates.items, specialRules);
    const messages: ChatCompletionMessageParam[] = [{ role: 'user', content: initialPrompt }];

    for (let i = 0; i < 5; i++) {
        const aiResponse = await this.openaiService.chatCompletionWithTools(messages, tools);
        const responseMessage = aiResponse.choices[0].message;

        const toolCalls = responseMessage.tool_calls;
        if (toolCalls) {
            messages.push(responseMessage); 

            for (const toolCall of toolCalls) {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments);
          
                let functionResponse: any;

                if (functionName === 'getIcdByBlockRange') {
                    this.logger.log(`AI requested tool: getIcdByBlockRange with args:`, functionArgs);
                    functionResponse = await this.icdReadResolver.getIcdByBlockRange(
                    functionArgs.start,
                    functionArgs.end,
                    );
                } else {
                    functionResponse = { error: `Unknown tool called: ${functionName}` };
                }
          
                messages.push({
                    tool_call_id: toolCall.id,
                    role: 'tool',
                    content: JSON.stringify(functionResponse),
                });
            }
        continue; 
      }
      
        try {
            if (responseMessage.content) {
                const partialPackage = JSON.parse(responseMessage.content);

                const finalResults = (await Promise.all(
                    partialPackage.results.map(async (aiResult) => {
                        let fullCodeDetails = await this.icdReadResolver.getIcdByCode(aiResult.code);
                        let correctedRationale = aiResult.rationale;

                        if (!fullCodeDetails) {
                            this.logger.warn(`AI invented code '${aiResult.code}'. Attempting correction...`);
                            fullCodeDetails = await this.findClosestValidCode(aiResult.code);

                            if (fullCodeDetails) {
                                this.logger.log(`Correction successful. Replaced '${aiResult.code}' with '${fullCodeDetails.code}'.`);
                                correctedRationale = `[System Correction: The AI-suggested code '${aiResult.code}' was not found. Using the closest valid code '${fullCodeDetails.code}' instead.] ${aiResult.rationale}`;
                            } else {
                                this.logger.error(`Correction failed for '${aiResult.code}'. Could not find a valid parent. Discarding.`);
                                return null;
                            }
                        }

                        return {
                            ...aiResult,
                            code: fullCodeDetails.code,
                            description: fullCodeDetails.description,
                            rationale: correctedRationale,
                            includes: fullCodeDetails.includes,
                            excludes: fullCodeDetails.excludes,
                            notes: fullCodeDetails.notes,
                        };
                    })
                )).filter(Boolean);

                const finalPackage = {
                    ...partialPackage,
                    results: finalResults,
                };
    
                return { ...finalPackage, processingTimeMs: Date.now() - start };
            }
        } catch (error) {
            this.logger.error('Failed to parse or process final AI response:', error);
            throw new Error('AI returned an invalid final response.');
        }
    }

    throw new Error('AI failed to provide a final answer after the maximum number of attempts.');
  }
  
  private async findClosestValidCode(code: string): Promise<IcdCodeItem | null> {
    let currentCode = code;
    while (currentCode.length >= 3) {
      currentCode = currentCode.slice(0, -1);
      const found = await this.icdReadResolver.getIcdByCode(currentCode);
      if (found) {
        return found;
      }
    }
    return null;
  }

  private getInfectionRulePrompt(term: string): string {
    const infectionKeywords = ['mrsa', 'vre', 'infection', 'cellulitis', 'abscess', 'sepsis', 'bacterial'];
    if (infectionKeywords.some(keyword => term.toLowerCase().includes(keyword))) {
        this.logger.log('Infection keywords detected. Adding special coding rule to prompt.');
        return `
      **--- CRITICAL CODING RULE: Drug-Resistant Infections ---**
      According to CIHI standards, a drug-resistant infection like MRSA **requires three separate codes**. These codes **must be linked** with a diagnosis cluster (e.g., cluster 'A'). The required codes are:
      1.  **Site of Infection:** The code for the condition itself (e.g., Cellulitis from Chapter XII).
      2.  **Causative Organism:** The code for the bacteria (e.g., B95.6 for Staphylococcus aureus from Chapter I).
      3.  **Drug Resistance:** The code for the specific resistance (e.g., U82.1 for Methicillin resistance from Chapter XX).
    `;
    }
    return '';
  }

  private buildAiPrompt(term: string, candidates: IcdAiEnhancedResult[], specialRules: string = ''): string {
    const candidateJson = JSON.stringify(candidates.map(c => ({
      code: c.code, description: c.description, includes: c.includes, excludes: c.excludes, notes: c.notes
    })), null, 2);

    return `
      You are an expert, meticulous ICD-10-CA medical coder. Your task is to create a complete and accurate coding package based on a clinical scenario, strictly following Canadian CIHI coding standards.

      **--- ICD-10-CA Chapter Guide ---**
      - **Chapter I (A00-B99):** Certain infectious and parasitic diseases.
      - **Chapter II (C00-D48):** Neoplasms.
      - **Chapter XII (L00-L99):** Diseases of the skin and subcutaneous tissue.
      - **Chapter XIX (S00-T98):** Injury, poisoning, and other consequences of external causes.
      - **Chapter XX (U00-U99):** Codes for special purposes (e.g., Antibiotic Resistance).
      - **Chapter XXI (V01-Y98):** External causes of morbidity and mortality.


      ${specialRules}

      **Clinical Scenario:**
      \`\`\`
      ${term}
      \`\`\`

      **Top 100 Candidate Codes (from initial search):**
      \`\`\`json
      ${candidateJson}
      \`\`\`

      **--- Your Step-by-Step Task ---**
      1.  **Analyze and Plan:** Read the clinical scenario and any special rules. Identify ALL the individual codes you will need to find (e.g., for "MRSA Cellulitis", you need a condition code, an organism code, and a resistance code).
      2.  **Gather Information (Use Tools):**
          * First, check the 'Candidate Codes' list for the codes you planned to find.
          * For any codes that are still missing, use the \`getIcdByBlockRange\` tool. You can call the tool multiple times if necessary to gather all required codes.
      3.  **Synthesize Final Answer (STOP Using Tools):**
          * **Crucial:** Once you have found ALL the codes from your plan, your task changes. You MUST stop calling tools.
          * Your very next response MUST be the final JSON object containing all the codes you have gathered. Do not write any text or make any more tool calls after this point.

      **--- VERY STRICT OUTPUT FORMAT ---**
      Your final response must ONLY be a single, valid JSON object with this exact structure:
      
      {
        "results": [
          {
            "code": "string",
            "description": "string",
            "rationale": "A detailed explanation for choosing this specific code.",
            "diagnosisType": "string (e.g., M, MP, 1, 2, 3, 9, OP)",
            "diagnosisCluster": "string (e.g., A, B) or null",
            "prefix": "string (e.g., Q, 5, 6) or null"
          }
        ],
        "summary": "A narrative summary of the coding decisions."
      }
    `;
  }
}