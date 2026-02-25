export async function makeCall(toNumber: string, task: string): Promise<string> {
  const response = await fetch('https://api.vapi.ai/call/phone', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VAPI_API_KEY}`
    },
    body: JSON.stringify({
      phoneNumberId: process.env.VAPI_PHONE_ID,
      customer: { number: toNumber },
      assistant: {
        firstMessage: `Hi, I'm calling on behalf of Gautam. ${task}`,
        model: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-6',
          messages: [
            {
              role: 'system',
              content: `You are calling on behalf of Gautam Agarwal. Your task: ${task}. Be polite, concise, and professional. Get the job done in under 2 minutes.`
            }
          ]
        },
        voice: { provider: 'vapi', voiceId: 'elliot' }
      }
    })
  });

  const data = await response.json() as any;
  if (response.ok) return `Call initiated to ${toNumber}. Call ID: ${data.id}`;
  return `Failed to make call: ${JSON.stringify(data)}`;
}

export async function sendSMS(to: string, message: string): Promise<void> {
  const twilio = await import('twilio');
  const client = twilio.default(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  );
  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to
  });
}
