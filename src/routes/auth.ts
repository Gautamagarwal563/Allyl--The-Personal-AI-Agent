import { Router, Request, Response } from 'express';
import { getAuthUrl, handleCallback } from '../tools/calendar';

const router = Router();

router.get('/google', (_req: Request, res: Response) => {
  const url = getAuthUrl();
  res.redirect(url);
});

router.get('/google/callback', async (req: Request, res: Response) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('No code provided');

  try {
    await handleCallback(code as string);
    res.send(`
      <html><body style="font-family:sans-serif;padding:40px;background:#0a0a0a;color:#fff">
        <h2>✓ Google Calendar connected</h2>
        <p>You can close this tab. Allyl can now manage your calendar.</p>
      </body></html>
    `);
  } catch (err: any) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

export default router;
