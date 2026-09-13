import OpenAI from 'openai';
import { db } from '../config/knex.js';
import { ChatRole } from '@safepath/shared';
import { FIRST_AID_DISCLAIMER, matchFirstAidTopic, shouldEscalate } from '../data/first-aid-topics.js';

const SYSTEM_PROMPT = `You are the SafePath Safety Assistant, a chat helper inside an incident-reporting app.
You help someone at the scene of an incident (accident, injury, roadside emergency, etc.) figure out
practical, immediate things they can safely do for themselves or a victim while officials are on the way.
Be genuinely useful — give concrete, numbered, actionable steps (comfort, positioning, keeping someone
safe/warm/still, basic wound care, what to watch for) the way a calm bystander with first-aid training would.
Boundaries — do not cross these:
- Never give a diagnosis, never name a specific medical condition as certain, never suggest medication,
  dosages, or any invasive treatment (don't tell them to realign, splint tightly, remove embedded objects, etc.).
- Never suggest transporting or moving a seriously injured person yourself, and never suggest attempting
  anything beyond basic, non-invasive first aid.
- If the situation sounds life-threatening or beyond basic first aid, still give the immediate safe actions
  they can take right now (e.g. keep still, apply pressure, keep warm) AND clearly say officials/paramedics
  need to handle the rest from there.
- If the situation is genuinely unclear, ask ONE short clarifying question before giving steps.
- Keep replies concise (a handful of short sentences or a short numbered list), calm, and easy to follow
  under stress. End with a brief reminder that officials will take over full care when they arrive.`;

let client: OpenAI | null = null;

// Points at a local Ollama server (OpenAI-compatible /v1 API), not OpenAI's hosted API.
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      baseURL: process.env.LOCAL_LLM_BASE_URL || 'http://localhost:11434/v1',
      apiKey: 'ollama', // ignored by Ollama, but the SDK requires a non-empty string
      timeout: 30_000,
    });
  }
  return client;
}

export interface ChatReply {
  sessionId: string;
  reply: string;
  escalate: boolean;
}

export class ChatService {
  static async getOrCreateSession(sessionId: string | undefined, userId: string | null): Promise<string> {
    if (sessionId) {
      const existing = await db('chat_sessions').where({ id: sessionId }).first();
      if (existing) return existing.id;
    }
    const [session] = await db('chat_sessions')
      .insert({ user_id: userId })
      .returning('id');
    return typeof session === 'string' ? session : session.id;
  }

  static async saveMessage(sessionId: string, role: ChatRole, content: string): Promise<void> {
    await db('chat_messages').insert({ session_id: sessionId, role, content });
  }

  static async getHistory(sessionId: string) {
    return db('chat_messages').where({ session_id: sessionId }).orderBy('created_at', 'asc');
  }

  static async getReply(sessionId: string, message: string): Promise<ChatReply> {
    await ChatService.saveMessage(sessionId, 'user', message);

    const escalate = shouldEscalate(message);
    const topic = matchFirstAidTopic(message);

    let reply: string;
    if (topic) {
      reply = `${topic.title}:\n${topic.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n${FIRST_AID_DISCLAIMER}`;
    } else {
      reply = await ChatService.getLlmReply(sessionId, message);
    }

    await ChatService.saveMessage(sessionId, 'assistant', reply);
    return { sessionId, reply, escalate };
  }

  private static async getLlmReply(sessionId: string, message: string): Promise<string> {
    const openai = getClient();

    try {
      const history = await ChatService.getHistory(sessionId);
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.slice(-10).map((m: any) => ({ role: m.role, content: m.content } as OpenAI.Chat.ChatCompletionMessageParam)),
      ];

      const completion = await openai.chat.completions.create({
        model: process.env.LOCAL_LLM_MODEL || 'llama3.2:3b',
        messages,
        max_tokens: 250,
        temperature: 0.3,
      });

      const text = completion.choices[0]?.message?.content?.trim();
      return text || `I want to make sure I guide you safely. Could you describe what's happening in a bit more detail? ${FIRST_AID_DISCLAIMER}`;
    } catch (error) {
      console.error('Local LLM request failed:', error);
      return `I'm having trouble reaching the assistant service right now. In the meantime, keep the person still, comfortable, and warm, and make sure officials have been notified — they'll take it from there. ${FIRST_AID_DISCLAIMER}`;
    }
  }
}
