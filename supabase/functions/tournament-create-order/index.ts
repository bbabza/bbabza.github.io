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

  let ref: string, amount: number, name: string, mobile: string, email: string;
  try {
    ({ ref, amount, name, mobile, email } = await req.json());
  } catch {
    return json({ success: false, message: 'Invalid request body' }, 400, req);
  }

  if (!ref || !amount || amount <= 0) {
    return json({ success: false, message: 'ref and amount are required.' }, 400, req);
  }

  const KEY_ID     = Deno.env.get('RAZORPAY_KEY_ID')     ?? '';
  const KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';

  if (!KEY_ID || !KEY_SECRET) {
    return json({ success: false, message: 'Payment gateway not configured.' }, 500, req);
  }

  // Create Razorpay order
  const credentials = btoa(`${KEY_ID}:${KEY_SECRET}`);
  const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: ref,
      notes: { name: name ?? '', mobile: mobile ?? '', ref },
    }),
  });

  if (!rzpRes.ok) {
    const err = await rzpRes.text();
    console.error('Razorpay order creation failed:', err);
    return json({ success: false, message: 'Failed to create payment order. Please try again.' }, 502, req);
  }

  const order = await rzpRes.json();

  // Persist order_id to tournament_registrations
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  await supabase
    .from('tournament_registrations')
    .update({ razorpay_order_id: order.id })
    .eq('ref', ref);

  return json({ success: true, order_id: order.id, key_id: KEY_ID }, 200, req);
});
