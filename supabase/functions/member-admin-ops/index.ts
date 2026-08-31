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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405, req);

  let admin_password: string, operation: string, enrollment_no: string, new_password: string, updates: Record<string, unknown>;
  try {
    ({ admin_password, operation, enrollment_no, new_password, updates } = await req.json());
  } catch {
    return json({ success: false, message: 'Invalid request body' }, 400, req);
  }

  const adminHash = Deno.env.get('ADMIN_HASH') ?? '';
  if (!adminHash || (await sha256(admin_password)) !== adminHash) {
    return json({ success: false, message: 'Invalid admin password.' }, 401, req);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  if (operation === 'set_password') {
    if (!enrollment_no?.trim() || !new_password || new_password.length < 6) {
      return json({ success: false, message: 'Enrollment number and password (min 6 chars) are required.' }, 400, req);
    }
    const password_hash = await sha256(new_password);
    const { error } = await supabase
      .from('members')
      .update({ password_hash })
      .eq('enrollment_no', enrollment_no.trim());

    if (error) return json({ success: false, message: 'Update failed: ' + error.message }, 500, req);
    return json({ success: true }, 200, req);
  }

  if (operation === 'update_member') {
    if (!enrollment_no?.trim()) {
      return json({ success: false, message: 'Enrollment number required.' }, 400, req);
    }
    const allowed = ['name', 'practice_area', 'enrolled_year', 'status', 'mobile', 'address', 'description', 'is_bar_council_member', 'is_office_bearer', 'office_bearer_position'];
    const safe: Record<string, unknown> = {};
    for (const key of allowed) {
      if (updates && key in updates) safe[key] = updates[key];
    }
    if (Object.keys(safe).length === 0) {
      return json({ success: false, message: 'No valid fields to update.' }, 400, req);
    }
    const { error } = await supabase.from('members').update(safe).eq('enrollment_no', enrollment_no.trim());
    if (error) return json({ success: false, message: 'Update failed: ' + error.message }, 500, req);
    return json({ success: true }, 200, req);
  }

  return json({ success: false, message: 'Unknown operation.' }, 400, req);
});
