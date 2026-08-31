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

  let token: string, updates: Record<string, string>, new_password: string | undefined;
  try {
    ({ token, updates, new_password } = await req.json());
  } catch {
    return json({ success: false, message: 'Invalid request body' }, 400, req);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: session } = await supabase
    .from('member_sessions')
    .select('enrollment_no, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (!session || new Date(session.expires_at) < new Date()) {
    return json({ success: false, message: 'Session expired. Please log in again.' }, 401, req);
  }

  const payload: Record<string, string> = {};

  for (const key of ['name', 'address', 'mobile', 'description']) {
    if (updates?.[key] !== undefined) payload[key] = updates[key];
  }

  // Photo upload via base64
  if (updates?.photo_base64) {
    try {
      const base64Data = updates.photo_base64.replace(/^data:image\/\w+;base64,/, '');
      const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      const ext = updates.photo_base64.startsWith('data:image/png') ? 'png' : 'jpg';
      const filePath = `${session.enrollment_no.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('member-photos')
        .upload(filePath, binaryData, {
          contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
          upsert: true,
        });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('member-photos').getPublicUrl(filePath);
        payload.photo_url = publicUrl;
      }
    } catch (_) { /* skip photo on error */ }
  }

  if (new_password) {
    if (new_password.length < 6) {
      return json({ success: false, message: 'Password must be at least 6 characters.' }, 400, req);
    }
    payload.password_hash = await sha256(new_password);
  }

  if (Object.keys(payload).length === 0) {
    return json({ success: true, photo_url: null }, 200, req);
  }

  const { error } = await supabase
    .from('members')
    .update(payload)
    .eq('enrollment_no', session.enrollment_no);

  if (error) {
    return json({ success: false, message: 'Update failed: ' + error.message }, 500, req);
  }

  return json({ success: true, photo_url: payload.photo_url ?? null }, 200, req);
});
