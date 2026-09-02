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

  let operation: string, mobile: string, firebase_id_token: string, new_password: string;
  try {
    ({ operation, mobile, firebase_id_token, new_password } = await req.json());
  } catch {
    return json({ success: false, message: 'Invalid request body' }, 400, req);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // ── Step 1: check if mobile is registered ─────────────────
  if (operation === 'check_mobile') {
    if (!mobile?.trim()) {
      return json({ success: false, message: 'Mobile number required.' }, 400, req);
    }
    const { data } = await supabase
      .from('members')
      .select('enrollment_no')
      .eq('mobile', mobile.trim())
      .maybeSingle();
    return json({ success: true, exists: !!data }, 200, req);
  }

  // ── Step 2: verify Firebase token + reset password ─────────
  if (operation === 'reset') {
    if (!firebase_id_token || !new_password || new_password.length < 6) {
      return json({ success: false, message: 'Token and password (min 6 chars) required.' }, 400, req);
    }

    const FIREBASE_API_KEY = Deno.env.get('FIREBASE_API_KEY') ?? '';
    if (!FIREBASE_API_KEY) {
      return json({ success: false, message: 'Server configuration error.' }, 500, req);
    }

    // Verify Firebase ID token via Google Identity Toolkit
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: firebase_id_token }),
      },
    );

    if (!verifyRes.ok) {
      return json({ success: false, message: 'OTP verification failed. Please try again.' }, 401, req);
    }

    const verifyData = await verifyRes.json();
    const phoneE164: string = verifyData.users?.[0]?.phoneNumber ?? '';

    if (!phoneE164) {
      return json({ success: false, message: 'Could not verify phone number.' }, 401, req);
    }

    // Normalize to last 10 digits (strip country code)
    const phone10 = phoneE164.replace(/^\+\d{1,3}/, '').slice(-10);

    const { data: member } = await supabase
      .from('members')
      .select('enrollment_no, name, practice_area, enrolled_year, status, address, mobile, photo_url, description, cc_no, gender, membership_type, yearly_renewed_date, res_phone, office_phone')
      .eq('mobile', phone10)
      .maybeSingle();

    if (!member) {
      return json({ success: false, message: 'No member found with this phone number.' }, 404, req);
    }

    const password_hash = await sha256(new_password);
    await supabase.from('members').update({ password_hash }).eq('enrollment_no', member.enrollment_no);

    // Auto-create session so user is logged in immediately after reset
    const token = generateToken();
    await supabase.from('member_sessions').insert({
      token,
      enrollment_no: member.enrollment_no,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return json({ success: true, token, member }, 200, req);
  }

  return json({ success: false, message: 'Unknown operation.' }, 400, req);
});
