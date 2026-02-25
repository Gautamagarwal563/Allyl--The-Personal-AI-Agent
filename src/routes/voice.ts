import { Router, Request, Response } from 'express';
import { runAgent } from '../lib/agent';

const router = Router();

// VAPI sends conversation turns here
router.post('/', async (req: Request, res: Response) => {
  const body = req.body;

  console.log('[Voice] VAPI webhook:', JSON.stringify(body).slice(0, 200));

  // VAPI sends different message types
  const messageType = body.message?.type;

  if (messageType === 'assistant-request') {
    // VAPI is asking for the assistant config (if using server-side assistant)
    return res.json({
      assistant: {
        firstMessage: "Hey Gautam, what do you need?",
        model: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-6',
          systemPrompt: "You are Allyl, Gautam's personal AI assistant on a voice call. Be direct, concise, and conversational. No markdown. Max 2-3 sentences per response."
        },
        voice: { provider: 'vapi', voiceId: 'elliot' }
      }
    });
  }

  if (messageType === 'function-call') {
    // Handle tool calls from VAPI
    const fn = body.message.functionCall;
    const { runAgent } = await import('../lib/agent');
    const result = await runAgent(fn.parameters?.message || '', 'voice');
    return res.json({ result });
  }

  if (messageType === 'transcript' && body.message.transcript) {
    // Process user speech
    const userText = body.message.transcript;
    const reply = await runAgent(userText, 'voice');
    return res.json({ response: reply });
  }

  if (messageType === 'end-of-call-report') {
    console.log('[Voice] Call ended:', body.message.summary);
    return res.json({ received: true });
  }

  res.json({ received: true });
});

export default router;
