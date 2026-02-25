const AGENTMAIL_BASE = 'https://api.agentmail.to/v0';

export async function sendEmail(to: string, subject: string, body: string): Promise<string> {
  const response = await fetch(`${AGENTMAIL_BASE}/inboxes/${process.env.AGENTMAIL_INBOX_ID}/emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}`
    },
    body: JSON.stringify({ to, subject, text: body })
  });

  const data = await response.json() as any;
  if (response.ok) return `Email sent to ${to}`;
  return `Failed to send email: ${JSON.stringify(data)}`;
}

export async function readEmails(limit = 10): Promise<string> {
  const response = await fetch(
    `${AGENTMAIL_BASE}/inboxes/${process.env.AGENTMAIL_INBOX_ID}/emails?limit=${limit}`,
    {
      headers: { Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}` }
    }
  );

  const data = await response.json() as any;
  if (!response.ok) return `Failed to read emails: ${JSON.stringify(data)}`;

  const emails = data.emails || data.items || data || [];
  if (!emails.length) return 'No emails found.';

  return emails
    .map((e: any) => `From: ${e.from}\nSubject: ${e.subject}\nDate: ${e.date || e.created_at}\n${e.text?.slice(0, 500) || ''}`)
    .join('\n\n---\n\n');
}
