export async function searchWeb(query: string): Promise<string> {
  const response = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`
    },
    body: JSON.stringify({ query, limit: 5 })
  });

  const data = await response.json() as any;
  if (!data.success) return `Search failed: ${data.error}`;

  return data.data
    .map((r: any) => `${r.title}\n${r.url}\n${r.description || r.markdown?.slice(0, 300) || ''}`)
    .join('\n\n');
}

export async function scrapePage(url: string): Promise<string> {
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`
    },
    body: JSON.stringify({ url, formats: ['markdown'] })
  });

  const data = await response.json() as any;
  if (!data.success) return `Scrape failed: ${data.error}`;

  return data.data?.markdown?.slice(0, 3000) || 'No content found';
}

export async function browseWeb(task: string, url?: string): Promise<string> {
  const response = await fetch('https://api.browser-use.com/api/v1/run-sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.BROWSER_USE_API_KEY}`
    },
    body: JSON.stringify({ task: url ? `Go to ${url} and ${task}` : task })
  });

  const data = await response.json() as any;
  return data.result || data.output || JSON.stringify(data);
}
