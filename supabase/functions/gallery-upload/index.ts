import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ALLOWED_ORIGINS = [
  'https://thebezwadabarassociation.com',
  'https://bbabza.github.io',
];

const REPO = 'bbabza/bbabza.github.io';
const CATEGORIES = ['events', 'welfare', 'heritage', 'other'];
const MAX_BYTES = 4 * 1024 * 1024;

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function json(body: unknown, status = 200, req: Request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function sanitizeFilename(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const ext = (dot > 0 ? name.slice(dot) : '.jpg').toLowerCase();
  return (base || 'photo') + ext;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405, req);

  let admin_password: string, category: string, filename: string, content_base64: string;
  try {
    ({ admin_password, category, filename, content_base64 } = await req.json());
  } catch {
    return json({ success: false, message: 'Invalid request body' }, 400, req);
  }

  const adminHash = Deno.env.get('ADMIN_HASH') ?? '';
  if (!adminHash || (await sha256(admin_password)) !== adminHash) {
    return json({ success: false, message: 'Invalid admin password.' }, 401, req);
  }

  if (!CATEGORIES.includes(category)) {
    return json({ success: false, message: 'Invalid category.' }, 400, req);
  }
  if (!filename || !content_base64) {
    return json({ success: false, message: 'filename and content_base64 are required.' }, 400, req);
  }
  // Rough size check on the base64 string (base64 is ~4/3 of raw bytes)
  if (content_base64.length > MAX_BYTES * 1.4) {
    return json({ success: false, message: 'Photo is too large (max 4 MB).' }, 400, req);
  }

  const path = `gallery/${category}/${Date.now()}-${sanitizeFilename(filename)}`;
  const githubToken = Deno.env.get('GITHUB_PAT') ?? '';
  if (!githubToken) {
    return json({ success: false, message: 'Server is not configured with a GitHub token.' }, 500, req);
  }

  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${githubToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'bba-gallery-upload',
    },
    body: JSON.stringify({ message: `Gallery: add photo to ${category}`, content: content_base64 }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return json({ success: false, message: err.message || `GitHub upload failed: ${res.status}` }, 502, req);
  }

  return json({ success: true, path }, 200, req);
});
