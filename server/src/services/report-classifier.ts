import { getLlmClient, getLlmModel } from './llm-client.js';

const SYSTEM_PROMPT = `You are a plausibility checker for a road-safety incident reporting app.
You are given a report's incident type, severity level, and free-text description.
Judge only INTERNAL CONSISTENCY and PLAUSIBILITY of the text itself:
- Does the description match the claimed incident type and severity?
- Is the description generic, spammy, nonsensical, or a copy-paste placeholder (e.g. "test", "asdf", unrelated content)?
- Are there obvious contradictions within the text?
Do NOT judge whether the underlying event is true or false — you cannot verify real-world facts, only internal
consistency and effort of the report. Respond with ONLY a compact JSON object, no other text:
{"plausibility": <number 0 to 1>, "reason": <short string explaining a low score, or null if score is high>}`;

export interface ReportClassification {
  plausibility: number | null;
  reason: string | null;
}

export class ReportClassifierService {
  static async scoreReport(input: {
    description: string;
    incidentTypeName?: string | null;
    severityLevelName?: string | null;
  }): Promise<ReportClassification> {
    const openai = getLlmClient();

    const userContent = `Incident type: ${input.incidentTypeName || 'unknown'}
Severity level: ${input.severityLevelName || 'unknown'}
Description: ${input.description || '(empty)'}`;

    try {
      const completion = await openai.chat.completions.create({
        model: getLlmModel(),
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        max_tokens: 100,
        temperature: 0,
      });

      const text = completion.choices[0]?.message?.content?.trim() || '';
      return ReportClassifierService.parseResponse(text);
    } catch (error) {
      console.error('Report classifier LLM request failed:', error);
      return { plausibility: null, reason: null };
    }
  }

  private static parseResponse(text: string): ReportClassification {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return { plausibility: null, reason: null };

      const parsed = JSON.parse(match[0]);
      const plausibility = typeof parsed.plausibility === 'number'
        ? Math.max(0, Math.min(1, parsed.plausibility))
        : null;
      const reason = typeof parsed.reason === 'string' ? parsed.reason : null;

      return { plausibility, reason };
    } catch (error) {
      return { plausibility: null, reason: null };
    }
  }
}
