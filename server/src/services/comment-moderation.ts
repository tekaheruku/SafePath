import { getLlmClient, getLlmModel } from './llm-client.js';

const SYSTEM_PROMPT = `You moderate comments on a community road-safety reporting app. Users are encouraged to share
what they saw, how they feel, or even off-topic remarks — that is all fine and must NOT be flagged.
Flag ONLY clear violations: harassment or hate speech targeting a person/group, threats, doxxing
(sharing someone's private info), or spam/scam links. Do not flag comments merely for being
off-topic, low-effort, sarcastic, or critical. Respond with ONLY a compact JSON object, no other text:
{"violates": <bool>, "reason": <short string explaining the violation, or null if it does not violate>}`;

export interface CommentModeration {
  violates: boolean;
  reason: string | null;
}

export class CommentModerationService {
  static async checkComment(content: string): Promise<CommentModeration> {
    if (!content || !content.trim()) {
      return { violates: false, reason: null };
    }

    const openai = getLlmClient();

    try {
      const completion = await openai.chat.completions.create({
        model: getLlmModel(),
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content },
        ],
        max_tokens: 80,
        temperature: 0,
      });

      const text = completion.choices[0]?.message?.content?.trim() || '';
      return CommentModerationService.parseResponse(text);
    } catch (error) {
      console.error('Comment moderation LLM request failed:', error);
      return { violates: false, reason: null };
    }
  }

  private static parseResponse(text: string): CommentModeration {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return { violates: false, reason: null };

      const parsed = JSON.parse(match[0]);
      const violates = typeof parsed.violates === 'boolean' ? parsed.violates : false;
      const reason = typeof parsed.reason === 'string' ? parsed.reason : null;

      return { violates, reason: violates ? reason : null };
    } catch (error) {
      return { violates: false, reason: null };
    }
  }
}
