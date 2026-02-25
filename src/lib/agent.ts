import Anthropic from '@anthropic-ai/sdk';
import { askLLM, getSystemPrompt, Message } from './llm';
import { remember, recall, saveMessage, getRecentHistory } from '../tools/memory';
import { searchWeb, scrapePage, browseWeb } from '../tools/web';
import { sendEmail, readEmails } from '../tools/email';
import { listEvents, createEvent } from '../tools/calendar';
import { makeCall } from '../tools/calls';

const tools: Anthropic.Tool[] = [
  {
    name: 'search_web',
    description: 'Search the web for any topic or question',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' }
      },
      required: ['query']
    }
  },
  {
    name: 'scrape_page',
    description: 'Read the full content of any webpage',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to scrape' }
      },
      required: ['url']
    }
  },
  {
    name: 'browse_web',
    description: 'Use a real browser to complete tasks: fill forms, click buttons, book things, log into sites',
    input_schema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'What to do in the browser' },
        url: { type: 'string', description: 'Optional starting URL' }
      },
      required: ['task']
    }
  },
  {
    name: 'send_email',
    description: "Send an email from Gautam's agent inbox",
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body' }
      },
      required: ['to', 'subject', 'body']
    }
  },
  {
    name: 'read_emails',
    description: "Read recent emails from Gautam's inbox",
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of emails to fetch (default: 10)' }
      }
    }
  },
  {
    name: 'list_events',
    description: "List upcoming events from Gautam's Google Calendar",
    input_schema: {
      type: 'object',
      properties: {
        maxResults: { type: 'number', description: 'Number of events (default: 10)' }
      }
    }
  },
  {
    name: 'create_event',
    description: "Create a new event in Gautam's Google Calendar",
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title' },
        startTime: { type: 'string', description: 'ISO 8601 start time e.g. 2026-03-01T10:00:00' },
        endTime: { type: 'string', description: 'ISO 8601 end time' },
        description: { type: 'string', description: 'Optional description' },
        location: { type: 'string', description: 'Optional location' }
      },
      required: ['title', 'startTime', 'endTime']
    }
  },
  {
    name: 'make_call',
    description: 'Make a phone call to any number on behalf of Gautam',
    input_schema: {
      type: 'object',
      properties: {
        toNumber: { type: 'string', description: 'Phone number to call e.g. +12125551234' },
        task: { type: 'string', description: 'What to say or accomplish on the call' }
      },
      required: ['toNumber', 'task']
    }
  },
  {
    name: 'remember',
    description: 'Store a fact, preference, or note permanently in memory',
    input_schema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Memory key e.g. "favorite_restaurant"' },
        value: { type: 'string', description: 'Value to store' }
      },
      required: ['key', 'value']
    }
  },
  {
    name: 'recall',
    description: 'Retrieve stored memories. Use key="all" to see everything.',
    input_schema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Memory key to look up, or "all"' }
      },
      required: ['key']
    }
  }
];

async function executeTool(name: string, input: Record<string, any>): Promise<string> {
  try {
    switch (name) {
      case 'search_web':     return await searchWeb(input.query);
      case 'scrape_page':    return await scrapePage(input.url);
      case 'browse_web':     return await browseWeb(input.task, input.url);
      case 'send_email':     return await sendEmail(input.to, input.subject, input.body);
      case 'read_emails':    return await readEmails(input.limit);
      case 'list_events':    return await listEvents(input.maxResults);
      case 'create_event':   return await createEvent(input.title, input.startTime, input.endTime, input.description, input.location);
      case 'make_call':      return await makeCall(input.toNumber, input.task);
      case 'remember':       return await remember(input.key, input.value);
      case 'recall':         return await recall(input.key);
      default:               return `Unknown tool: ${name}`;
    }
  } catch (err: any) {
    return `Tool error (${name}): ${err.message}`;
  }
}

export async function runAgent(userMessage: string, channel: 'sms' | 'voice' | 'email'): Promise<string> {
  // Load conversation history
  const history = await getRecentHistory(channel, 10);
  const messages: Message[] = history
    .reverse()
    .map(h => ({ role: h.role as 'user' | 'assistant', content: h.content }));

  // Save incoming message
  await saveMessage(channel, 'user', userMessage);

  // Agentic loop (max 5 iterations)
  let currentMessages = [...messages];
  let finalResponse = '';
  const MAX_LOOPS = 5;

  for (let i = 0; i < MAX_LOOPS; i++) {
    const { text, toolCalls } = await askLLM(userMessage, currentMessages, tools);

    if (toolCalls.length === 0) {
      finalResponse = text;
      break;
    }

    // Execute all tool calls
    const toolResults: Message[] = [];
    for (const tc of toolCalls) {
      const result = await executeTool(tc.name, tc.input);
      toolResults.push({ role: 'user', content: `Tool ${tc.name} result: ${result}` });
    }

    // Add assistant response + tool results to history for next iteration
    if (text) currentMessages.push({ role: 'assistant', content: text });
    currentMessages.push(...toolResults);

    // If we got text along with tool calls, that's the final response
    if (text && i === MAX_LOOPS - 1) {
      finalResponse = text;
    }
  }

  if (!finalResponse) finalResponse = 'Done.';

  // Trim for SMS
  if (channel === 'sms' && finalResponse.length > 1500) {
    finalResponse = finalResponse.slice(0, 1497) + '...';
  }

  // Save response
  await saveMessage(channel, 'assistant', finalResponse);

  return finalResponse;
}
