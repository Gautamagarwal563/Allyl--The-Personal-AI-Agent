import { prisma } from '../lib/db';

export async function remember(key: string, value: string): Promise<string> {
  await prisma.memory.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
  return `Remembered: ${key} = ${value}`;
}

export async function recall(key: string): Promise<string> {
  if (key === 'all') {
    const all = await prisma.memory.findMany({ orderBy: { updatedAt: 'desc' } });
    if (!all.length) return 'No memories stored yet.';
    return all.map(m => `${m.key}: ${m.value}`).join('\n');
  }
  const memory = await prisma.memory.findUnique({ where: { key } });
  return memory ? memory.value : `No memory found for "${key}"`;
}

export async function getRecentHistory(channel: string, limit = 10) {
  return prisma.conversation.findMany({
    where: { channel },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

export async function saveMessage(channel: string, role: 'user' | 'assistant', content: string) {
  return prisma.conversation.create({
    data: { channel, role, content }
  });
}
