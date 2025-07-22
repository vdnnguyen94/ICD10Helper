// src/cci/cci-gemini-enhanced.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { CciEnhancedService } from './cci-enhanced.service';
import { GeminiService } from '../gemini.service';
import {
  CciEnhancedCatalogItem,
  AttributeDto,
  QualifierDto,
} from './cci-enhanced-catalog-item.dto';
import { CciGeminiEnhancedResponseDto } from './cci-gemini-enhanced-response.dto';
import { CciGeminiEnhancedResultItem } from './cci-gemini-enhanced.types';

// Shape of one AI analysis item
interface GeminiCciAnalysis {
    code: string;
    chosenQualifier: string | { code: string; description: string };
    chosenAttributes: { type: 'S' | 'L' | 'E'; code: string }[];
    rationale: string;
}

@Injectable()
export class CciGeminiEnhancedService {
  private readonly logger = new Logger(CciGeminiEnhancedService.name);

  constructor(
    private readonly cciService: CciEnhancedService,
    private readonly geminiService: GeminiService,
  ) {}

  /**  
   * Entry point: fetch top 50, ask Gemini, merge, and return top 20
   */
  async search(term: string): Promise<CciGeminiEnhancedResponseDto> {
    const start = Date.now();
    if (!term?.trim()) {
      return { items: [], searchTimeMs: 0 };
    }

    // 1) Vector search
    const candidates = await this.cciService.fetchTop50Rubrics(term);
    if (!candidates.length) {
      return { items: [], searchTimeMs: Date.now() - start };
    }

    // 2) Build prompt & call Gemini
    const prompt = this.buildMetaAIPrompt(term, candidates);
    const gemResp = await this.geminiService.generateContent(prompt);
    this.logger.debug('⟵ raw Gemini text:', gemResp.text);

    const raw = typeof gemResp.text === 'string' ? gemResp.text : '[]';
    const json = raw.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();

    let analyses: GeminiCciAnalysis[] = [];
    try {
      analyses = JSON.parse(
        raw.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim()
      );
    } catch {
      analyses = [];
    }

// 3) Build a map of AI selections by rubric code
const selectionMap = new Map<string, GeminiCciAnalysis>();
analyses.forEach(a => {
  // Extract the base code (e.g., "1.IJ.50") from the full code ("1.IJ.50.GQ-OA")
  const baseCode = a.code.split('.').slice(0, 3).join('.');
  if (baseCode) {
    selectionMap.set(baseCode, a);
  }
});

// 4) Merge AI picks back into the original 50 candidates
const merged: CciGeminiEnhancedResultItem[] = candidates.map(rubric => {

    const ai = selectionMap.get(rubric.code);

    // **FIX STARTS HERE**
    // Safely get the qualifier code regardless of whether the AI returned a string or an object.
    const rawQualifier = ai?.chosenQualifier;
    const chosenQualifierCode = typeof rawQualifier === 'string'
        ? rawQualifier
        : (typeof rawQualifier === 'object' && rawQualifier !== null)
        ? rawQualifier.code
        : null;
    // **FIX ENDS HERE**

    const fullQualifierCode =
      chosenQualifierCode && chosenQualifierCode.includes('.')
        ? chosenQualifierCode // It's already the full code
        : chosenQualifierCode
        ? `${rubric.code}.${chosenQualifierCode}` // Prepend base code to suffix
        : null;

    // Now lookup against the rubric.otherQualifiers
    const appliedQualifier: QualifierDto | null =
      fullQualifierCode
        ? rubric.otherQualifiers.find(q => q.code === fullQualifierCode) || null
        : null;
      // attributes
    // build a quick lookup of chosen attribute codes
    const chosenMap = new Map<string, string>();
    ai?.chosenAttributes.forEach(a => chosenMap.set(a.type, a.code));
    const appliedAttributes: { S: AttributeDto | null; L: AttributeDto | null; E: AttributeDto | null } | null = ai
    ? {
        S:
            rubric.allAttributes.find(
            x => x.name === 'S' && x.code === chosenMap.get('S'),
            ) || null,
        L:
            rubric.allAttributes.find(
            x => x.name === 'L' && x.code === chosenMap.get('L'),
            ) || null,
        E:
            rubric.allAttributes.find(
            x => x.name === 'E' && x.code === chosenMap.get('E'),
            ) || null,
        }: null;

    return {
        code: rubric.code,
        description: rubric.description,
        includes: rubric.includes,
        excludes: rubric.excludes,
        code_also: rubric.codeAlso,
        note: rubric.note,                         // ← wire up the missing `note` field
        otherQualifiers: rubric.otherQualifiers,
        allAttributes: rubric.allAttributes,
        similarityScore: rubric.similarityScore ?? 0,
        isChosen: !!ai,
        appliedQualifier,
        appliedAttributes,
        reasoning: ai?.rationale ?? '',
      };
    });

    // 5) Sort by similarity and take the top 20
    const top20 = merged
      .sort((a, b) => {
        // 1) chosen first
        if (a.isChosen !== b.isChosen) {
          return (b.isChosen ? 1 : 0) - (a.isChosen ? 1 : 0);
        }
        // 2) if both chosen → sort by code (numeric segments sorted numerically)
        if (a.isChosen) {
          return a.code.localeCompare(b.code, undefined, { numeric: true });
        }
        // 3) if both not chosen → sort by similarity score
        return (b.similarityScore ?? 0) - (a.similarityScore ?? 0);
      })
      .slice(0, 20);

    return {
      items: top20,
      searchTimeMs: Date.now() - start,
    };
  }

  /**  
   * PRIVATE: prompt builder (as before)
   */
    private buildMetaAIPrompt(
    term: string,
    candidates: CciEnhancedCatalogItem[],
    ): string {
    const lines: string[] = [];

    // 1) Role & instructions
    lines.push(
        `You are a certified CCI coder. A clinician describes:`,
        `"${term}"`,
        ``,
        `Below are ${candidates.length} candidate CCI rubric objects in full JSON.`,
        `Each object contains every field from our vector search:`,
        `code, description, includes, excludes, codeAlso,`,
        `otherQualifiers, allAttributes, similarityScore, etc.`,
        ``,
        `CIHI Coding Rules (Fletcher 2022):`,
        ` 1. Sections:`,
        `    • 1 = Therapeutic`,
        `    • 2 = Diagnostic`,
        `    • 3 = Imaging`,
        `    • …`,
        ` 2. Combined Diagnostic+Therapeutic in ONE rubric:`,
        `    • If both are bundled, code ONLY the THERAPEUTIC part.`,
        ` 3. Supplemental references:`,
        `    • If includes or codeAlso says “see X.YZ.AB.^^” and that code fits,`,
        `      include X.YZ.AB as a separate entry.`,
        ` 4. Qualifier (Fields 4–6):`,
        `    • Pick exactly one from otherQualifiers.`,
        `    ONLY CHOSEN if it is mentioned from the search term. we code to the highest accuracy`,
        ` 5. Attributes (S, L, E):`,
        `    Each domain S, L, E must have at least 1 code,`,
        `    ONLY CHOSEN if it is mentioned from the search term. we code to the highest accuracy`,
        `    • Mandatory → pick the option matching the term.`,
        `    • Optional → pick the option matching the term; if It doesnt have any match return "-" for that domain.`,
        `    • If type is "N/A" return the  "/" for that domain.`,
        `    • Never more than one per domain.`,
        ``,
        `Output = JSON array of {`,
        `  code, chosenQualifier, chosenAttributes:[{type,code}], rationale`,
        `}`,
        `No markdown fences or extra text.`,
        ``,
        `Here are the full candidate objects:`
    );

    // 2) Serialize each candidate
    candidates.forEach((c, i) => {
        const json = JSON.stringify(c, null, 2).replace(/`/g, '');
        lines.push(``, `--- Candidate ${i + 1} ---`, json);
    });

    return lines.join('\n');
    }
}
