import fs from 'fs';
import path from 'path';
import { getLlmClient, getLlmModel, getVisionModel } from './llm-client.js';

const TEXT_SYSTEM_PROMPT = `You are a plausibility checker for a road-safety incident reporting app.
You are given a report's incident type, severity level, and free-text description.
Judge only INTERNAL CONSISTENCY and PLAUSIBILITY of the text itself:
- Does the description match the claimed incident type and severity?
- Is the description generic, spammy, nonsensical, or a copy-paste placeholder (e.g. "test", "asdf", unrelated content)?
- Are there obvious contradictions within the text?
Do NOT judge whether the underlying event is true or false — you cannot verify real-world facts, only internal
consistency and effort of the report. Respond with ONLY a compact JSON object, no other text:
{"plausibility": <number 0 to 1>, "reason": <short string explaining a low score, or null if score is high>}`;

// Small local vision models describe images fine but do not reliably follow
// "respond with JSON only" instructions, so this prompt asks for nothing but a
// plain-text description — the judgment against the claim happens afterward via
// the text model, which does follow JSON instructions reliably.
const DESCRIBE_PHOTO_PROMPT = `Describe what is shown in this photo in 1-2 plain sentences. Focus on anything
relevant to a road-safety report: vehicles, damage, road conditions, hazards, people, or lack thereof. Do not
guess at causes or context you cannot see — describe only what is visible.`;

const PHOTO_JUDGE_PROMPT = `You are a plausibility checker for a road-safety incident reporting app.
You are given a plain-text description of a submitted photo (written by a separate vision model, not the
reporter), along with the report's claimed incident type and severity. Judge only whether the photo's described
content plausibly matches the claim:
- Does the photo's content look like it could depict the claimed incident type (e.g. vehicle damage for a "Car Crash" report)?
- Is the photo clearly unrelated to the claim (e.g. a person, an unrelated object, a blank/placeholder image)?
Do NOT judge whether the underlying event is staged or genuine — you cannot verify that, only whether the photo's
content plausibly matches the claim. Respond with ONLY a compact JSON object, no other text:
{"plausibility": <number 0 to 1>, "reason": <short string explaining a low score, or null if score is high>}`;

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export interface ReportClassification {
  plausibility: number | null;
  reason: string | null;
}

export interface ReportScoreBreakdown {
  text: ReportClassification;
  photo: ReportClassification;
}

export interface ReportScoreResult extends ReportClassification {
  breakdown: ReportScoreBreakdown;
}

export class ReportClassifierService {
  static async scoreReport(input: {
    description: string;
    incidentTypeName?: string | null;
    severityLevelName?: string | null;
    photoUrl?: string | null;
  }): Promise<ReportScoreResult> {
    const [textResult, photoResult] = await Promise.all([
      ReportClassifierService.scoreText(input),
      input.photoUrl
        ? ReportClassifierService.scorePhoto(input.photoUrl, input.incidentTypeName, input.severityLevelName)
        : Promise.resolve({ plausibility: null, reason: null }),
    ]);

    const combined = ReportClassifierService.combine(textResult, photoResult);
    return { ...combined, breakdown: { text: textResult, photo: photoResult } };
  }

  private static combine(text: ReportClassification, photo: ReportClassification): ReportClassification {
    if (text.plausibility !== null && photo.plausibility !== null) {
      const plausibility = (text.plausibility + photo.plausibility) / 2;
      const reasons = [
        text.reason ? `Text: ${text.reason}` : null,
        photo.reason ? `Photo: ${photo.reason}` : null,
      ].filter(Boolean);
      return { plausibility, reason: reasons.length ? reasons.join(' | ') : null };
    }
    if (text.plausibility !== null) return text;
    if (photo.plausibility !== null) return photo;
    return { plausibility: null, reason: null };
  }

  private static async scoreText(input: {
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
          { role: 'system', content: TEXT_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        max_tokens: 100,
        temperature: 0,
      });

      const text = completion.choices[0]?.message?.content?.trim() || '';
      return ReportClassifierService.parseResponse(text);
    } catch (error) {
      console.error('Report text classifier LLM request failed:', error);
      return { plausibility: null, reason: null };
    }
  }

  /**
   * Small local vision models (e.g. moondream) reliably describe an image in
   * plain text but do NOT reliably follow "respond with only JSON" instructions —
   * in testing it just wrote a prose description and ignored the format entirely.
   * So this is a two-stage pipeline: ask the vision model only for a plain-text
   * description (something it's actually good at), then hand that description to
   * the text model (which does follow JSON instructions) to judge plausibility.
   */
  private static async scorePhoto(
    photoUrl: string,
    incidentTypeName?: string | null,
    severityLevelName?: string | null
  ): Promise<ReportClassification> {
    try {
      const dataUri = ReportClassifierService.readPhotoAsDataUri(photoUrl);
      if (!dataUri) return { plausibility: null, reason: null };

      const description = await ReportClassifierService.describePhoto(dataUri);
      if (!description) return { plausibility: null, reason: null };

      return ReportClassifierService.judgePhotoDescription(description, incidentTypeName, severityLevelName);
    } catch (error) {
      console.error('Report photo classifier LLM request failed:', error);
      return { plausibility: null, reason: null };
    }
  }

  private static async describePhoto(dataUri: string): Promise<string | null> {
    const openai = getLlmClient();

    const completion = await openai.chat.completions.create({
      model: getVisionModel(),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: DESCRIBE_PHOTO_PROMPT },
            { type: 'image_url', image_url: { url: dataUri } },
          ] as any,
        },
      ],
      max_tokens: 120,
      temperature: 0,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    return text || null;
  }

  private static async judgePhotoDescription(
    description: string,
    incidentTypeName?: string | null,
    severityLevelName?: string | null
  ): Promise<ReportClassification> {
    const openai = getLlmClient();

    const userContent = `Incident type: ${incidentTypeName || 'unknown'}
Severity level: ${severityLevelName || 'unknown'}
Photo description: ${description}`;

    const completion = await openai.chat.completions.create({
      model: getLlmModel(),
      messages: [
        { role: 'system', content: PHOTO_JUDGE_PROMPT },
        { role: 'user', content: userContent },
      ],
      max_tokens: 100,
      temperature: 0,
    });

    const text = completion.choices[0]?.message?.content?.trim() || '';
    return ReportClassifierService.parseResponse(text);
  }

  /**
   * Resolves a report's relative photo_url (e.g. "/uploads/xyz.jpg", the same
   * convention written by server/src/controllers/upload.ts) to a base64 data
   * URI. Returns null for anything unreadable so scoring degrades gracefully.
   */
  private static readPhotoAsDataUri(photoUrl: string): string | null {
    if (!photoUrl.startsWith('/uploads/')) return null;

    const filename = path.basename(photoUrl);
    const filePath = path.join(process.cwd(), 'uploads', filename);
    if (!fs.existsSync(filePath)) return null;

    const mime = MIME_TYPES[path.extname(filename).toLowerCase()];
    if (!mime) return null;

    const buffer = fs.readFileSync(filePath);
    return `data:${mime};base64,${buffer.toString('base64')}`;
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
