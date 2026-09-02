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

const ALLOWED_FIELDS = [
  'type', 'category', 'title', 'body', 'date_label',
  'event_day', 'event_month', 'event_time', 'event_venue',
  'is_featured', 'is_urgent', 'is_published',
];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405, req);

  let admin_password: string, operation: string, id: string, data: Record<string, unknown>;
  try {
    ({ admin_password, operation, id, data } = await req.json());
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

  if (operation === 'list_all') {
    const { data: items, error } = await supabase
      .from('news_events')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return json({ success: false, message: error.message }, 500, req);
    return json({ success: true, items }, 200, req);
  }

  if (operation === 'create') {
    const safe: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (data && key in data) safe[key] = data[key];
    }
    if (!safe.type || !safe.title || !safe.body || !safe.date_label) {
      return json({ success: false, message: 'type, title, body and date_label are required.' }, 400, req);
    }
    const { data: item, error } = await supabase.from('news_events').insert(safe).select().single();
    if (error) return json({ success: false, message: error.message }, 500, req);
    return json({ success: true, item }, 200, req);
  }

  if (operation === 'update') {
    if (!id) return json({ success: false, message: 'id is required.' }, 400, req);
    const safe: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (data && key in data) safe[key] = data[key];
    }
    if (Object.keys(safe).length === 0) return json({ success: false, message: 'No fields to update.' }, 400, req);
    const { error } = await supabase.from('news_events').update(safe).eq('id', id);
    if (error) return json({ success: false, message: error.message }, 500, req);
    return json({ success: true }, 200, req);
  }

  if (operation === 'delete') {
    if (!id) return json({ success: false, message: 'id is required.' }, 400, req);
    const { error } = await supabase.from('news_events').delete().eq('id', id);
    if (error) return json({ success: false, message: error.message }, 500, req);
    return json({ success: true }, 200, req);
  }

  return json({ success: false, message: 'Unknown operation.' }, 400, req);
});
