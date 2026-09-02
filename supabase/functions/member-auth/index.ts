import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://thebezwadabarassociation.com',
  'https://bbabza.github.io',
];

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

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405, req);

  let enrollment_no: string, password: string;
  try {
    ({ enrollment_no, password } = await req.json());
  } catch {
    return json({ success: false, message: 'Invalid request body' }, 400, req);
  }

  if (!enrollment_no?.trim() || !password) {
    return json({ success: false, message: 'Enrollment number and password are required.' }, 400, req);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: member } = await supabase
    .from('members')
    .select('enrollment_no, name, practice_area, enrolled_year, status, address, mobile, photo_url, description, cc_no, password_hash')
    .eq('enrollment_no', enrollment_no.trim())
    .maybeSingle();

  if (!member || !member.password_hash) {
    return json({ success: false, message: 'Invalid enrollment number or password.' }, 401, req);
  }

  const hash = await sha256(password);
  if (hash !== member.password_hash) {
    return json({ success: false, message: 'Invalid enrollment number or password.' }, 401, req);
  }

  const token = generateToken();
  await supabase.from('member_sessions').insert({
    token,
    enrollment_no: member.enrollment_no,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  const { password_hash: _ph, ...memberData } = member;
  return json({ success: true, token, member: memberData }, 200, req);
});
