import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type Model = 'claude' | 'grok' | 'auto';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Route to the right model based on task
function pickModel(message: string): Model {
  const lower = message.toLowerCase();
  if (
    lower.includes('twitter') ||
    lower.includes('x.com') ||
    lower.includes('trending') ||
    lower.includes('elon')
  ) {
    return 'grok'; // Grok has live X data
  }
  return 'claude'; // default — best tool use
}

export async function askLLM(
  message: string,
  history: Message[],
  tools: Anthropic.Tool[] = [],
  model: Model = 'auto'
): Promise<{ text: string; toolCalls: Array<{ name: string; input: Record<string, any>; id: string }> }> {
  const resolvedModel = model === 'auto' ? pickModel(message) : model;

  if (resolvedModel === 'grok' && process.env.XAI_API_KEY) {
    return askGrok(message, history);
  }

  return askClaude(message, history, tools);
}

async function askClaude(
  message: string,
  history: Message[],
  tools: Anthropic.Tool[]
): Promise<{ text: string; toolCalls: Array<{ name: string; input: Record<string, any>; id: string }> }> {
  const messages: Anthropic.MessageParam[] = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message }
  ];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: getSystemPrompt(),
    messages,
    tools: tools.length > 0 ? tools : undefined
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');

  const toolCalls = response.content
    .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    .map(b => ({ name: b.name, input: b.input as Record<string, any>, id: b.id }));

  return { text, toolCalls };
}

// Grok via xAI REST API (OpenAI-compatible format, no SDK needed)
async function askGrok(
  message: string,
  history: Message[]
): Promise<{ text: string; toolCalls: Array<{ name: string; input: Record<string, any>; id: string }> }> {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.XAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'grok-2-latest',
      messages: [
        { role: 'system', content: getSystemPrompt() },
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: message }
      ]
    })
  });

  const data = await response.json() as any;
  return {
    text: data.choices?.[0]?.message?.content || '',
    toolCalls: []
  };
}

export function getSystemPrompt(): string {
  return `You are Gautam's personal AI assistant. You are direct, sharp, and helpful.

PERSONALITY:
- Concise by default — no filler, no "Great question!"
- Proactive: if you can do something, do it rather than asking
- When in doubt, act then inform

CAPABILITIES (use tools proactively):
- search_web: search and scrape any URL or topic
- send_email: send emails from your AgentMail inbox
- read_emails: check recent emails
- remember: store a fact/preference permanently
- recall: look up stored memories
- set_reminder: schedule a future SMS/notification
- browse: navigate and interact with websites

CONTEXT:
- You're talking to Gautam via SMS, voice, or email
- Keep SMS replies short (2-3 sentences max unless asked for detail)
- Voice replies should be conversational, no markdown
- Email replies can be longer and formatted

Current time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}`;
}
