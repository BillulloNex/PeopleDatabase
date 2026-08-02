/**
 * GitHub Discovery Worker — FREE, no API key required.
 * 
 * Unauthenticated: 10 search requests/min, 60 user detail requests/hr
 * With GITHUB_TOKEN: 30 search requests/min, 5,000 user detail requests/hr
 * 
 * Discovers real developer profiles from GitHub's 100M+ user base.
 */

interface GitHubUser {
  login: string;
  html_url: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  bio: string | null;
  twitter_username: string | null;
  public_repos: number;
  followers: number;
}

const GITHUB_API = 'https://api.github.com';

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'PeopleDatabase-Discovery/1.0'
  };
  if (process.env.GITHUB_TOKEN) {
    h['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}

// Diverse query combinations to maximize unique profile discovery
const SEARCH_QUERIES = [
  // By location + followers
  'location:SF followers:>50',
  'location:"San Francisco" followers:>100',
  'location:"New York" followers:>100',
  'location:London followers:>100',
  'location:Berlin followers:>50',
  'location:Toronto followers:>50',
  'location:Singapore followers:>50',
  'location:Tokyo followers:>50',
  'location:Austin followers:>50',
  'location:Seattle followers:>100',
  'location:Boston followers:>50',
  'location:Paris followers:>50',
  'location:Lagos followers:>20',
  'location:Bangalore followers:>50',
  'location:Sydney followers:>50',
  // By language + followers
  'language:rust followers:>50',
  'language:go followers:>100',
  'language:python followers:>200',
  'language:typescript followers:>100',
  'language:swift followers:>50',
  'language:kotlin followers:>50',
  'language:zig followers:>20',
  'language:elixir followers:>30',
  'language:haskell followers:>30',
  'language:c followers:>200',
  // By bio keywords
  '"machine learning" followers:>50',
  '"staff engineer" followers:>20',
  '"CTO" followers:>30',
  '"founder" followers:>50',
  '"security researcher" followers:>20',
  '"open source" followers:>100',
  '"blockchain" followers:>30',
  '"devops" followers:>30',
  '"data scientist" followers:>30',
  '"professor" followers:>20',
];

async function searchGitHubUsers(query: string, page: number = 1, perPage: number = 30): Promise<string[]> {
  const url = `${GITHUB_API}/search/users?q=${encodeURIComponent(query)}&sort=followers&order=desc&page=${page}&per_page=${perPage}`;
  
  const res = await fetch(url, { headers: headers() });
  
  if (res.status === 403 || res.status === 429) {
    console.warn(`[GitHub] Rate limited on search. Status: ${res.status}`);
    return [];
  }
  
  if (!res.ok) {
    console.error(`[GitHub] Search failed: ${res.status} ${res.statusText}`);
    return [];
  }
  
  const data = await res.json();
  return (data.items || []).map((u: any) => u.login);
}

async function getGitHubUserProfile(username: string): Promise<GitHubUser | null> {
  const res = await fetch(`${GITHUB_API}/users/${username}`, { headers: headers() });
  
  if (res.status === 403 || res.status === 429) {
    console.warn(`[GitHub] Rate limited on user fetch for ${username}`);
    return null;
  }
  
  if (!res.ok) return null;
  return await res.json();
}

function buildRawTextFromGitHubUser(user: GitHubUser): string {
  const parts: string[] = [];
  if (user.name) parts.push(`Name: ${user.name}`);
  parts.push(`GitHub: ${user.html_url}`);
  if (user.bio) parts.push(`Bio: ${user.bio}`);
  if (user.company) parts.push(`Company: ${user.company}`);
  if (user.location) parts.push(`Location: ${user.location}`);
  if (user.email) parts.push(`Email: ${user.email}`);
  if (user.blog) parts.push(`Website: ${user.blog}`);
  if (user.twitter_username) parts.push(`Twitter: https://twitter.com/${user.twitter_username}`);
  parts.push(`Public Repos: ${user.public_repos}`);
  parts.push(`Followers: ${user.followers}`);
  return parts.join('\n');
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runGitHubDiscoveryWorker(queryIndex?: number, batchSize: number = 10) {
  // Pick a query — either by explicit index or random
  const idx = queryIndex !== undefined ? queryIndex % SEARCH_QUERIES.length : Math.floor(Math.random() * SEARCH_QUERIES.length);
  const query = SEARCH_QUERIES[idx];
  // Randomize page to get different results each run
  const page = Math.floor(Math.random() * 3) + 1;
  
  console.log(`[GitHub Worker] Searching: "${query}" (page ${page}, batch ${batchSize})`);
  
  const usernames = await searchGitHubUsers(query, page, batchSize);
  console.log(`[GitHub Worker] Found ${usernames.length} usernames.`);
  
  if (usernames.length === 0) return [];

  // Fetch full profiles with 500ms delay between requests to respect rate limits
  const items: { rawText: string; sourceUrl: string }[] = [];
  
  for (const username of usernames) {
    const user = await getGitHubUserProfile(username);
    if (user && user.name) { // Only ingest users with real names
      items.push({
        rawText: buildRawTextFromGitHubUser(user),
        sourceUrl: user.html_url
      });
    }
    await sleep(500); // Respect rate limits
  }

  console.log(`[GitHub Worker] Built ${items.length} profile payloads from ${usernames.length} users.`);

  if (items.length === 0) return [];

  // Send to production bulk API
  const targetAppUrl = process.env.PRODUCTION_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://people.beenex.org';
  const bulkEndpoint = `${targetAppUrl.replace(/\/$/, '')}/api/ingest/bulk`;

  console.log(`[GitHub Worker] Sending ${items.length} profiles to ${bulkEndpoint}`);

  try {
    const res = await fetch(bulkEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.INGESTION_WEBHOOK_SECRET ? { Authorization: `Bearer ${process.env.INGESTION_WEBHOOK_SECRET}` } : {})
      },
      body: JSON.stringify({ items })
    });

    const json = await res.json();
    console.log(`[GitHub Worker] Bulk Response:`, JSON.stringify(json));
    return json.data || [];
  } catch (err: any) {
    console.error(`[GitHub Worker] Failed to send bulk payload:`, err.message);
    return [];
  }
}

// CLI entry point
if (require.main === module) {
  const queryIdx = process.argv[2] ? parseInt(process.argv[2]) : undefined;
  const batchSize = process.argv[3] ? parseInt(process.argv[3]) : 10;
  runGitHubDiscoveryWorker(queryIdx, batchSize)
    .then((results) => console.log(`[GitHub Worker] Finished. Processed ${results.length} entities.`))
    .catch((err) => console.error('[GitHub Worker] Failed:', err));
}
