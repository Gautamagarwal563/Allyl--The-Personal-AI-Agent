import 'dotenv/config';
import express from 'express';
import { prisma } from './lib/db';
import smsRoute from './routes/sms';
import voiceRoute from './routes/voice';
import emailRoute from './routes/email';
import authRoute from './routes/auth';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // required for Twilio

// Routes
app.use('/sms', smsRoute);
app.use('/voice', voiceRoute);
app.use('/email', emailRoute);
app.use('/auth', authRoute);

// Health check
app.get('/', (_req, res) => {
  res.json({
    status: 'Allyl is running',
    time: new Date().toISOString(),
    endpoints: ['/sms', '/voice', '/email', '/auth/google']
  });
});

// Start
async function start() {
  await prisma.$connect();
  console.log('✓ Database connected');

  app.listen(PORT, () => {
    console.log(`✓ Allyl running on http://localhost:${PORT}`);
    console.log(`  SMS:    POST /sms`);
    console.log(`  Voice:  POST /voice`);
    console.log(`  Email:  POST /email`);
    console.log(`  Auth:   GET  /auth/google`);
  });
}

start().catch(console.error);
