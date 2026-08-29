import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ALLOWED_ORIGINS = [
  'https://thebezwadabarassociation.com',
  'https://bbabza.github.io',
];

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
  };
}

function json(body: unknown, status = 200, req: Request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) });
  }
  if (req.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, 405, req);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return json({ success: false, message: 'Invalid form data' }, 400, req);
  }

  // Honeypot — bots fill this in, humans don't
  if (formData.get('botcheck')) {
    return json({ success: false, message: 'Spam detected' }, 400, req);
  }

  // Inject server-side secrets — never exposed to the browser
  const key = Deno.env.get('WEB3FORMS_KEY');
  if (!key) {
    return json({ success: false, message: 'Server misconfiguration' }, 500, req);
  }
  formData.set('access_key', key);

  // Set reply-to from the submitted email so replies go back to the sender
  const email = formData.get('email');
  if (email) formData.set('replyto', email.toString());

  try {
    const w3res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData,
    });
    const result = await w3res.json();
    return json(result, w3res.status, req);
  } catch {
    return json({ success: false, message: 'Failed to send message. Please try again.' }, 502, req);
  }
});
