import { google } from 'googleapis';
import { prisma } from '../lib/db';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export function getAuthUrl(): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent'
  });
}

export async function handleCallback(code: string): Promise<void> {
  const { tokens } = await oauth2Client.getToken(code);
  await prisma.memory.upsert({
    where: { key: 'google_tokens' },
    update: { value: JSON.stringify(tokens) },
    create: { key: 'google_tokens', value: JSON.stringify(tokens) }
  });
}

async function getCalendar() {
  const tokenRecord = await prisma.memory.findUnique({ where: { key: 'google_tokens' } });
  if (!tokenRecord) throw new Error('Google Calendar not authorized. Visit /auth/google to connect.');
  oauth2Client.setCredentials(JSON.parse(tokenRecord.value));
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function listEvents(maxResults = 10): Promise<string> {
  const calendar = await getCalendar();
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime'
  });

  const events = res.data.items || [];
  if (!events.length) return 'No upcoming events.';

  return events
    .map(e => {
      const start = e.start?.dateTime || e.start?.date;
      return `${e.summary} — ${start}${e.location ? ` @ ${e.location}` : ''}`;
    })
    .join('\n');
}

export async function createEvent(
  title: string,
  startTime: string,
  endTime: string,
  description?: string,
  location?: string
): Promise<string> {
  const calendar = await getCalendar();
  const event = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: title,
      description,
      location,
      start: { dateTime: startTime, timeZone: 'America/New_York' },
      end: { dateTime: endTime, timeZone: 'America/New_York' }
    }
  });
  return `Event created: ${event.data.summary} on ${event.data.start?.dateTime}`;
}
