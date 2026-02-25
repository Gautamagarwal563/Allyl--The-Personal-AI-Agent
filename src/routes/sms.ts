import { Router, Request, Response } from 'express';
import twilio from 'twilio';
import { runAgent } from '../lib/agent';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { Body, From } = req.body;

  console.log(`[SMS] From: ${From} | Message: ${Body}`);

  // Validate it's from your number (optional security check)
  // if (From !== process.env.MY_PHONE_NUMBER) {
  //   return res.status(403).send('Unauthorized');
  // }

  try {
    console.log('[SMS] Running agent...');
    const reply = await runAgent(Body, 'sms');
    console.log('[SMS] Reply:', reply?.slice(0, 100));

    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(reply);

    res.type('text/xml').send(twiml.toString());
  } catch (err: any) {
    console.error('[SMS] Error:', err.message, err.stack);
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Something went wrong. Try again.');
    res.type('text/xml').send(twiml.toString());
  }
});

export default router;
