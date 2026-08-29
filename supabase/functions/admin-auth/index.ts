import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://thebezwadabarassociation.com',
  'https://bbabza.github.io',
];

const MAX_ATTEMPTS = 5;
const BLOCK_MINUTES = 15;

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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) });
  }
  if (req.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, 405, req);
  }

  let username: string, password: string;
  try {
    ({ username, password } = await req.json());
  } catch {
    return json({ success: false, message: 'Invalid request' }, 400, req);
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // ── Rate limiting ──────────────────────────────────────────
  const { data: attempt } = await supabase
    .from('admin_login_attempts')
    .select('attempts, blocked_until')
    .eq('ip', ip)
    .maybeSingle();

  const now = new Date();

  if (attempt?.blocked_until && new Date(attempt.blocked_until) > now) {
    const mins = Math.ceil((new Date(attempt.blocked_until).getTime() - now.getTime()) / 60000);
    return json({
      success: false,
      message: `Too many failed attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`,
    }, 429, req);
  }

  // ── Credential verification (server-side — hash never leaves server) ──
  const adminUser = Deno.env.get('ADMIN_USER') ?? 'admin';
  const adminHash = Deno.env.get('ADMIN_HASH') ?? '';
  const hash = await sha256(password);
  const valid = username === adminUser && hash === adminHash;

  if (valid) {
    // Clear any previous failed attempts on success
    await supabase.from('admin_login_attempts').delete().eq('ip', ip);
    return json({ success: true }, 200, req);
  }

  // ── Record failed attempt ──────────────────────────────────
  const newAttempts = (attempt?.attempts ?? 0) + 1;
  const blockedUntil = newAttempts >= MAX_ATTEMPTS
    ? new Date(now.getTime() + BLOCK_MINUTES * 60 * 1000).toISOString()
    : null;

  await supabase.from('admin_login_attempts').upsert(
    { ip, attempts: newAttempts, last_attempt: now.toISOString(), blocked_until: blockedUntil },
    { onConflict: 'ip' },
  );

  const left = MAX_ATTEMPTS - newAttempts;
  return json({
    success: false,
    message: left > 0
      ? `Invalid username or password. ${left} attempt${left !== 1 ? 's' : ''} remaining.`
      : `Too many failed attempts. You are blocked for ${BLOCK_MINUTES} minutes.`,
  }, 401, req);
});
