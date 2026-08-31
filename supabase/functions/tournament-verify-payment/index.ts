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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405, req);

  let ref: string, razorpay_payment_id: string, razorpay_order_id: string, razorpay_signature: string;
  try {
    ({ ref, razorpay_payment_id, razorpay_order_id, razorpay_signature } = await req.json());
  } catch {
    return json({ success: false, message: 'Invalid request body' }, 400, req);
  }

  if (!ref || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return json({ success: false, message: 'Missing required payment fields.' }, 400, req);
  }

  const KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';
  if (!KEY_SECRET) {
    return json({ success: false, message: 'Payment gateway not configured.' }, 500, req);
  }

  // Verify HMAC-SHA256 signature: sign(order_id + "|" + payment_id, KEY_SECRET)
  const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(KEY_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expectedSig = Array.from(new Uint8Array(sigBuf))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  if (expectedSig !== razorpay_signature) {
    return json({ success: false, message: 'Payment signature verification failed.' }, 400, req);
  }

  // Update registration record
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const { error } = await supabase
    .from('tournament_registrations')
    .update({ razorpay_payment_id, payment_status: 'paid' })
    .eq('ref', ref);

  if (error) {
    console.error('DB update failed:', error.message);
    return json({ success: false, message: 'DB update failed: ' + error.message }, 500, req);
  }

  return json({ success: true }, 200, req);
});
