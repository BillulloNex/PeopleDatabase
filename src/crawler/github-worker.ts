import { extractPersonProfileWithAI } from '../lib/openrouter';
import { upsertExtractedProfile } from '../resolver/matcher';

export async function runGitHubIngestWorker(username: string = 'torvalds') {
  console.log(`[GitHub Worker] Fetching GitHub profile details for user: ${username}...`);
  
  try {
    const res = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        'User-Agent': 'PeopleDatabase-Bot/1.0',
        ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {})
      }
    });

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.statusText}`);
    }

    const userData = await res.json();
    const rawProfileText = JSON.stringify(userData);
    const profileUrl = userData.html_url || `https://github.com/${username}`;

    const extracted = await extractPersonProfileWithAI(rawProfileText, profileUrl);
    
    // Enrich with direct GitHub API attributes
    extracted.fullName = userData.name || userData.login;
    extracted.bio = userData.bio || extracted.bio;
    extracted.company = userData.company || extracted.company;
    extracted.location = userData.location || extracted.location;
    if (userData.email) extracted.emails.push(userData.email);
    if (userData.blog) {
      const blogUrl = userData.blog.startsWith('http') ? userData.blog : `https://${userData.blog}`;
      extracted.socialLinks.push({ platform: 'website', url: blogUrl });
    }
    extracted.socialLinks.push({ platform: 'github', url: profileUrl, handle: username });

    const person = await upsertExtractedProfile(extracted);
    console.log(`[GitHub Worker] Successfully upserted entity: ${person.fullName} (${person.id})`);
    return person;
  } catch (err) {
    console.error(`[GitHub Worker] Failed to ingest GitHub user ${username}:`, err);
    throw err;
  }
}

if (require.main === module) {
  const userArg = process.argv[2] || 'torvalds';
  runGitHubIngestWorker(userArg)
    .then((person) => console.log(`[GitHub Worker] Finished. Updated ${person.fullName}`))
    .catch((err) => console.error('[GitHub Worker] Error:', err));
}
