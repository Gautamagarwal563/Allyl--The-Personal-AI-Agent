import { Router, Request, Response } from 'express';
import { runAgent } from '../lib/agent';

const router = Router();

// AgentMail sends incoming emails here
router.post('/', async (req: Request, res: Response) => {
  const { from, subject, text, html } = req.body;

  console.log(`[Email] From: ${from} | Subject: ${subject}`);

  const body = text || html?.replace(/<[^>]*>/g, '') || '';
  const message = `Email from ${from}\nSubject: ${subject}\n\n${body}`;

  try {
    const reply = await runAgent(message, 'email');
    console.log('[Email] Agent reply:', reply.slice(0, 100));
    res.json({ success: true, reply });
  } catch (err: any) {
    console.error('[Email] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
