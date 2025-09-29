// src/icd/icd-ai.service.ts

import { Inject, Injectable, Logger } from '@nestjs/common';
import { IcdEnhancedService } from './icd-vector.service';
import { OpenAIService } from '../openai.service';
import { IcdAiEnhancedResult } from './icd-ai-enhanced-response.dto';
import { FinalCodingPackage } from './final-coding-package.dto';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { IcdReadResolver } from './icd-read.resolver';

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

    const tools = [ /* ... tools definition remains the same ... */ ];

    // --- MODIFICATION START ---
    // Conditionally generate the special rule for the prompt.
    let specialRules = '';
    const infectionKeywords = ['mrsa', 'vre', 'infection', 'cellulitis', 'abscess', 'sepsis', 'bacterial'];
    if (infectionKeywords.some(keyword => term.toLowerCase().includes(keyword))) {
        this.logger.log('Infection keywords detected. Adding special coding rule to prompt.');
        specialRules = this.getInfectionRulePrompt();
    }
    // --- MODIFICATION END ---

    // Build the initial user prompt with the potentially added special rules.
    const initialPrompt = this.buildAiPrompt(term, initialCandidates.items, specialRules);
    const messages: ChatCompletionMessageParam[] = [{ role: 'user', content: initialPrompt }];

    // The rest of the loop logic remains the same.
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
            const finalPackage = JSON.parse(responseMessage.content);
            return { ...finalPackage, processingTimeMs: Date.now() - start };
        } else {
            this.logger.error('AI returned a final response with null content.');
            throw new Error('AI returned an empty final response.');
        }
        } catch (error) {
        this.logger.error('Failed to parse final AI response:', responseMessage.content, error);
        throw new Error('AI returned a non-JSON or invalid final response.');
        }
    }
    
    throw new Error('AI failed to provide a final answer after multiple tool calls.');
  }

  /**
   * NEW: A helper function to contain the dynamic rule for infections.
   * This keeps the main prompt builder clean.
   */
  private getInfectionRulePrompt(): string {
    return `
      **--- CRITICAL CODING RULE: Drug-Resistant Infections ---**
      According to CIHI standards, a drug-resistant infection like MRSA **requires three separate codes**. [cite_start]These codes **must be linked** with a diagnosis cluster (e.g., cluster 'A')[cite: 433, 695]. The required codes are:
      1.  [cite_start]**Site of Infection:** The code for the condition itself (e.g., Cellulitis from Chapter XII)[cite: 692].
      2.  [cite_start]**Causative Organism:** The code for the bacteria (e.g., B95.6 for Staphylococcus aureus from Chapter I)[cite: 693].
      3.  [cite_start]**Drug Resistance:** The code for the specific resistance (e.g., U82.1 for Methicillin resistance from Chapter XX)[cite: 694].
    `;
  }

  /**
   * MODIFIED: This function now accepts a 'specialRules' string that is injected into the prompt.
   */
  private buildAiPrompt(term: string, candidates: IcdAiEnhancedResult[], specialRules: string = ''): string {
    const candidateJson = JSON.stringify(candidates.map(c => ({
      code: c.code, description: c.description, includes: c.includes, excludes: c.excludes, notes: c.notes
    })), null, 2);

    // The main prompt template now dynamically includes special rules only when they are passed in.
    return `
      You are an expert, meticulous ICD-10-CA medical coder. Your task is to create a complete and accurate coding package based on a clinical scenario, strictly following Canadian CIHI coding standards.

      **--- ICD-10-CA Chapter Guide ---**
      To find the correct codes, use this guide to determine the correct block to search for each component of the diagnosis:
      - **Chapter I (A00-B99):** Certain infectious and parasitic diseases (e.g., Staphylococcus aureus).
      - **Chapter II (C00-D48):** Neoplasms.
      - **Chapter XII (L00-L99):** Diseases of the skin and subcutaneous tissue (e.g., Cellulitis, Abscess).
      - **Chapter XIX (S00-T98):** Injury, poisoning, and other consequences of external causes.
      - **Chapter XX (U00-U99):** Codes for special purposes (e.g., U82-U84 for Antibiotic Resistance).
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

      **Instructions:**
      1.  **Deconstruct the Scenario:** Break down the clinical text into its fundamental components (condition, anatomical site, organism, drug resistance, etc.).
      2.  **Find the Codes:** For EACH component, find the best code. If any special rules have been provided above, you MUST follow them.
          * First, check the list of candidate codes.
          * If a required code is missing, you **MUST** use the \`getIcdByBlockRange\` tool to find it. Use the Chapter Guide to determine the correct blocks to search.
      3.  **Final Assembly:** Once all codes are found, assemble the final JSON package. Ensure any required diagnosis clusters are applied and the rationale for each code is clear.
      
      **--- VERY STRICT OUTPUT FORMAT ---**
      When you are ready to provide the final answer, respond ONLY with a single, valid JSON object and nothing else. The JSON object MUST conform to this exact structure:
      
      {
        "results": [
          {
            "code": "string",
            "description": "string",
            "rationale": "A detailed explanation for choosing this specific code based on the rules.",
            "diagnosisType": "string (e.g., M, MP, 1, 2, 3, 9, OP)",
            "diagnosisCluster": "string (e.g., A, B) or null",
            "prefix": "string (e.g., Q, 5, 6) or null"
          }
        ],
        "summary": "A narrative summary of the coding decisions for a human reader."
      }
    `;
  }
}
//     private agentFunctions = [
//     {
//       name: 'extractPrincipalDiagnosis',
//       description: 'Pick the single best ICD-10-CA code for the principal diagnosis',
//       parameters: {
//         type: 'object',
//         properties: {
//           scenario: { type: 'string', description: 'Full clinical text' }
//         },
//         required: ['scenario']
//       }
//     },
//     {
//       name: 'identifyContextBlocks',
//       description: 'Given PD code and its notes, decide which code‐ranges to fetch next',
//       parameters: {
//         type: 'object',
//         properties: {
//           scenario:   { type: 'string' },
//           pdCode:     { type: 'string' },
//           pdNotes:    { type: 'array', items: { type: 'string' } }
//         },
//         required: ['scenario','pdCode','pdNotes']
//       }
//     },
//     {
//       name: 'refineCandidates',
//       description: 'From a block of codes & the scenario, return the top-N candidates per block',
//       parameters: {
//         type: 'object',
//         properties: {
//           scenario: { type: 'string' },
//           candidatesByBlock: {
//             type: 'object',
//             additionalProperties: {
//               type: 'array',
//               items: { type: 'object', properties: {
//                 code: { type: 'string' }, description: { type: 'string' }
//               }, required: ['code','description'] }
//             }
//           }
//         },
//         required: ['scenario','candidatesByBlock']
//       }
//     },
//     {
//       name: 'assembleFinalSequence',
//       description: 'Given chosen codes + context, apply ICD rules and output final sequence + rationale',
//       parameters: {
//         type: 'object',
//         properties: {
//           scenario: { type: 'string' },
//           chosenCodes: {
//             type: 'array',
//             items: { type: 'string' }
//           }
//         },
//         required: ['scenario','chosenCodes']
//       }
//     }
//   ]

//     async codeScenario(scenario: string) {
//     // 1️⃣ Extract Principal Diagnosis
//     const pdResp = await this.openaiService.chatCompletionWithTools(
//         [{ role: 'user', content: scenario }],
//         [ this.agentFunctions[0] ],
//     );
//     const pdArgs = JSON.parse(pdResp.choices[0].message.function_call!.arguments);
//     const pdCode = pdArgs.principalCode;
//     const pdNotes = pdArgs.rationaleNotes;

//   // 2️⃣ Identify Contextual Blocks
//   const blkResp = await this.openaiService.chatCompletionWithTools(
//     [
//       { role: 'system', content: `PD code=${pdCode}, notes=${pdNotes}` },
//       { role: 'user', content: scenario }
//     ],
//     [ this.agentFunctions[1] ],
//   );
//   const blkArgs = JSON.parse(blkResp.choices[0].message.function_call!.arguments);


//   // blkArgs might be { blocks: [ { start:"B95",end:"B97" }, ... ] }

//     // 3️⃣ Fetch blocks via the injected resolver
//     const candidatesByBlock: Record<string, string[]> = {};
//     for (const b of blkArgs.blocks) {
//         candidatesByBlock[`${b.start}-${b.end}`] =
//         await this.icdReadResolver
//             .getIcdByBlockRange(b.start, b.end)
//             .then(list => list.map(item => ({ code: item.code, description: item.description })));
//     }


//   // 4️⃣ Refine
//   const refResp = await this.openaiService.chatCompletionWithTools(
//     [
//       { role: 'system', content: 'Here are your candidate lists by block' },
//       { role: 'user', content: JSON.stringify(candidatesByBlock) }
//     ],
//     [ this.agentFunctions[2] ],
//   );
//   const refined = JSON.parse(refResp.choices[0].message.function_call!.arguments);

//   // 5️⃣ Assemble final sequence
//   const chosenCodes = [pdCode, ...Object.values(refined).flat()];
//   const finResp = await this.openaiService.chatCompletionWithTools(
//     [
//       { role: 'system', content: 'Apply ICD-10-CA sequencing rules' },
//       { role: 'user', content: scenario },
//       { role: 'assistant', content: `Chosen codes: ${chosenCodes.join(',')}` }
//     ],
//     [ this.agentFunctions[3] ],
//   );
//   return JSON.parse(finResp.choices[0].message.function_call!.arguments);
// }
