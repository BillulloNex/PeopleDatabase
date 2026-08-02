/**
 * Web Spider Discovery Worker — Google-style recursive web crawler.
 * 
 * 100% FREE. Zero API keys. Just HTTP requests.
 * 
 * Strategy:
 * 1. Start from "people-rich" seed URLs (team pages, YC portfolio, speaker lists, directories)
 * 2. Fetch the HTML content
 * 3. Extract all links from the page
 * 4. Filter for likely-person-profile links (LinkedIn, personal sites, about pages)
 * 5. Send discovered profiles to the bulk ingest API
 * 6. Follow promising links to discover more seed pages
 */

// ============================================================
// SEED URL REGISTRY — People-rich starting points across the web
// ============================================================
const SEED_REGISTRIES: { category: string; urls: string[] }[] = [
  {
    category: 'YC & Accelerators',
    urls: [
      'https://www.ycombinator.com/companies',
      'https://www.techstars.com/portfolio',
      'https://www.500.co/companies',
    ]
  },
  {
    category: 'University Faculty',
    urls: [
      'https://cs.stanford.edu/people/faculty',
      'https://www.eecs.mit.edu/people/',
      'https://www.cs.cmu.edu/people/faculty',
      'https://www.cs.berkeley.edu/people/faculty',
      'https://www.cs.princeton.edu/people/faculty',
      'https://www.cs.cornell.edu/people',
      'https://www.cs.columbia.edu/people/faculty/',
      'https://www.cs.washington.edu/people/faculty',
    ]
  },
  {
    category: 'Conference Speakers & Thought Leaders',
    urls: [
      'https://www.ted.com/speakers',
      'https://conferences.oreilly.com/speakers',
    ]
  },
  {
    category: 'Open Source Maintainers',
    urls: [
      'https://github.com/orgs/facebook/people',
      'https://github.com/orgs/google/people',
      'https://github.com/orgs/microsoft/people',
      'https://github.com/orgs/apple/people',
      'https://github.com/orgs/vercel/people',
      'https://github.com/orgs/rust-lang/people',
      'https://github.com/orgs/golang/people',
      'https://github.com/orgs/nodejs/people',
      'https://github.com/orgs/denoland/people',
    ]
  },
  {
    category: 'VC & Investor Portfolios',
    urls: [
      'https://a16z.com/about/',
      'https://www.sequoiacap.com/our-team/',
      'https://www.greylock.com/team/',
      'https://www.benchmark.com/people',
    ]
  },
  {
    category: 'Company Team Pages',
    urls: [
      'https://openai.com/about',
      'https://deepmind.google/about/',
      'https://www.anthropic.com/company',
      'https://stripe.com/about',
      'https://www.cloudflare.com/people/',
      'https://linear.app/about',
    ]
  },
  {
    category: 'Professional Directories',
    urls: [
      'https://www.crunchbase.com/lists/most-active-angel-investors/people',
      'https://pitchbook.com/profiles',
    ]
  }
];

// Patterns that indicate a URL likely leads to a person's profile
const PERSON_URL_PATTERNS = [
  /linkedin\.com\/in\//i,
  /github\.com\/[^/]+$/i,
  /twitter\.com\/[^/]+$/i,
  /x\.com\/[^/]+$/i,
  /\/people\//i,
  /\/team\//i,
  /\/about\//i,
  /\/author\//i,
  /\/speaker\//i,
  /\/profile\//i,
  /\/faculty\//i,
  /\/staff\//i,
  /\/bio\//i,
  /\/person\//i,
  /\/members\//i,
];

// Patterns for pages that contain LISTS of people (follow these to find more)
const DIRECTORY_URL_PATTERNS = [
  /\/team/i,
  /\/people/i,
  /\/about/i,
  /\/speakers/i,
  /\/faculty/i,
  /\/staff/i,
  /\/directory/i,
  /\/leadership/i,
  /\/portfolio/i,
  /\/companies/i,
  /\/members/i,
  /\/contributors/i,
  /\/authors/i,
];

// Domains to skip (not useful for person discovery)
const SKIP_DOMAINS = new Set([
  'fonts.googleapis.com', 'cdn.jsdelivr.net', 'unpkg.com',
  'maps.google.com', 'play.google.com', 'apps.apple.com',
  'youtube.com', 'www.youtube.com', 'vimeo.com',
  'facebook.com', 'www.facebook.com', 'instagram.com',
  'tiktok.com', 'reddit.com', 'www.reddit.com',
  'amazon.com', 'www.amazon.com', 'ebay.com',
  'wikipedia.org', // We have Wikidata worker for this
]);

async function fetchPage(url: string, timeoutMs: number = 8000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'PeopleDatabaseBot/1.0 (+https://people.beenex.org/bot)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) return null;

    return await res.text();
  } catch {
    return null;
  }
}

function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  // Extract href attributes from anchor tags
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match;

  while ((match = hrefRegex.exec(html)) !== null) {
    let href = match[1];
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;

    try {
      const absolute = new URL(href, baseUrl).toString();
      // Only HTTP(S) links
      if (absolute.startsWith('http://') || absolute.startsWith('https://')) {
        const domain = new URL(absolute).hostname;
        if (!SKIP_DOMAINS.has(domain)) {
          links.push(absolute);
        }
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return [...new Set(links)];
}

function extractTextContent(html: string): string {
  // Strip HTML tags and get clean text
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000);
}

function isPersonUrl(url: string): boolean {
  return PERSON_URL_PATTERNS.some(p => p.test(url));
}

function isDirectoryUrl(url: string): boolean {
  return DIRECTORY_URL_PATTERNS.some(p => p.test(url));
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runWebSpiderWorker(
  categoryIndex?: number,
  maxPages: number = 5,
  maxDepth: number = 1
) {
  // Pick a seed category — by index or random
  const idx = categoryIndex !== undefined
    ? categoryIndex % SEED_REGISTRIES.length
    : Math.floor(Math.random() * SEED_REGISTRIES.length);
  
  const category = SEED_REGISTRIES[idx];
  // Pick a random seed URL from the category
  const seedUrl = category.urls[Math.floor(Math.random() * category.urls.length)];

  console.log(`[Web Spider] Category: "${category.category}" | Seed: ${seedUrl} | Max pages: ${maxPages} | Max depth: ${maxDepth}`);

  const visited = new Set<string>();
  const queue: { url: string; depth: number }[] = [{ url: seedUrl, depth: 0 }];
  const discoveredProfiles: { rawText: string; sourceUrl: string }[] = [];
  let pagesCrawled = 0;

  while (queue.length > 0 && pagesCrawled < maxPages) {
    const { url, depth } = queue.shift()!;

    if (visited.has(url)) continue;
    visited.add(url);

    console.log(`[Web Spider] Crawling (depth ${depth}): ${url}`);
    const html = await fetchPage(url);
    if (!html) {
      console.log(`[Web Spider] Failed to fetch: ${url}`);
      continue;
    }

    pagesCrawled++;
    const text = extractTextContent(html);
    const links = extractLinks(html, url);

    console.log(`[Web Spider] Found ${links.length} links on ${url}`);

    // If this page itself looks like a person profile page, ingest it
    if (isPersonUrl(url) && text.length > 100) {
      discoveredProfiles.push({ rawText: text, sourceUrl: url });
    }

    // Check all extracted links
    for (const link of links) {
      if (visited.has(link)) continue;

      // If the link looks like a person profile, queue it for ingestion
      if (isPersonUrl(link)) {
        discoveredProfiles.push({ rawText: `Profile found at: ${link}`, sourceUrl: link });
      }

      // If the link looks like a directory page and we haven't hit max depth, follow it
      if (depth < maxDepth && isDirectoryUrl(link) && !visited.has(link)) {
        queue.push({ url: link, depth: depth + 1 });
      }
    }

    // Be polite: 1 second between requests to same domain
    await sleep(1000);
  }

  console.log(`[Web Spider] Crawled ${pagesCrawled} pages, discovered ${discoveredProfiles.length} potential profiles.`);

  if (discoveredProfiles.length === 0) return [];

  // Deduplicate by sourceUrl
  const seen = new Set<string>();
  const uniqueProfiles = discoveredProfiles.filter(p => {
    if (seen.has(p.sourceUrl)) return false;
    seen.add(p.sourceUrl);
    return true;
  });

  // Send to production bulk API
  const targetAppUrl = process.env.PRODUCTION_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://people.beenex.org';
  const bulkEndpoint = `${targetAppUrl.replace(/\/$/, '')}/api/ingest/bulk`;

  // Send in batches of 10 to avoid overwhelming the LLM
  const BATCH_SIZE = 10;
  const allResults: any[] = [];

  for (let i = 0; i < uniqueProfiles.length; i += BATCH_SIZE) {
    const batch = uniqueProfiles.slice(i, i + BATCH_SIZE);
    console.log(`[Web Spider] Sending batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} profiles) to ${bulkEndpoint}`);

    try {
      const res = await fetch(bulkEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.INGESTION_WEBHOOK_SECRET ? { Authorization: `Bearer ${process.env.INGESTION_WEBHOOK_SECRET}` } : {})
        },
        body: JSON.stringify({ items: batch })
      });

      const json = await res.json();
      console.log(`[Web Spider] Batch response:`, JSON.stringify(json).slice(0, 500));
      if (json.data) allResults.push(...json.data);
    } catch (err: any) {
      console.error(`[Web Spider] Batch send failed:`, err.message);
    }

    await sleep(2000); // Wait between batches
  }

  return allResults;
}

// CLI entry point
if (require.main === module) {
  const catIdx = process.argv[2] ? parseInt(process.argv[2]) : undefined;
  const maxPages = process.argv[3] ? parseInt(process.argv[3]) : 5;
  runWebSpiderWorker(catIdx, maxPages, 1)
    .then((results) => console.log(`[Web Spider] Finished. Processed ${results.length} entities.`))
    .catch((err) => console.error('[Web Spider] Failed:', err));
}
