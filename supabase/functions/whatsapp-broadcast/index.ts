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

const GRAPH_VERSION = 'v21.0';
const COUNTRY_CODE = '91';

function normalizeMobile(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  const last10 = digits.slice(-10);
  if (last10.length !== 10) return null;
  return COUNTRY_CODE + last10;
}

type Recipient = { name?: string; mobile: string; values?: string[] };

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405, req);

  let admin_password: string, operation: string;
  let template_name: string, template_language: string, recipients: Recipient[];
  try {
    const b = await req.json();
    admin_password = b.admin_password;
    operation = b.operation;
    template_name = b.template_name;
    template_language = b.template_language;
    recipients = b.recipients;
  } catch {
    return json({ success: false, message: 'Invalid request body' }, 400, req);
  }

  const adminHash = Deno.env.get('ADMIN_HASH') ?? '';
  if (!adminHash || (await sha256(admin_password)) !== adminHash) {
    return json({ success: false, message: 'Invalid admin password.' }, 401, req);
  }

  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? '';
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';
  const wabaId = Deno.env.get('WHATSAPP_WABA_ID') ?? '';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  if (operation === 'list_templates') {
    if (!accessToken || !wabaId) {
      return json({ success: false, message: 'WhatsApp is not configured yet.' }, 500, req);
    }
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}/message_templates?fields=name,status,language,category,components&limit=100`;
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + accessToken } });
    const body = await res.json();
    if (!res.ok) return json({ success: false, message: body?.error?.message || 'Failed to fetch templates.' }, 502, req);
    const templates = (body.data || []).filter((t: { status: string }) => t.status === 'APPROVED');
    return json({ success: true, templates }, 200, req);
  }

  if (operation === 'list_log') {
    const { data: items, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return json({ success: false, message: error.message }, 500, req);
    return json({ success: true, items }, 200, req);
  }

  if (operation === 'send') {
    if (!accessToken || !phoneNumberId) {
      return json({ success: false, message: 'WhatsApp is not configured yet.' }, 500, req);
    }
    if (!template_name || !template_language || !Array.isArray(recipients) || recipients.length === 0) {
      return json({ success: false, message: 'template_name, template_language and recipients are required.' }, 400, req);
    }

    const results: Array<{ name?: string; mobile: string; status: string; messageId?: string; error?: string }> = [];
    for (const r of recipients) {
      const e164 = normalizeMobile(r.mobile);
      if (!e164) {
        results.push({ name: r.name, mobile: r.mobile, status: 'failed', error: 'Invalid mobile number.' });
        await supabase.from('whatsapp_messages').insert({
          recipient_name: r.name || null,
          recipient_mobile: r.mobile,
          template_name, template_language,
          status: 'failed', error_message: 'Invalid mobile number.',
        });
        continue;
      }

      const parameters = (r.values || []).map((v) => ({ type: 'text', text: String(v ?? '') }));
      const payload = {
        messaging_product: 'whatsapp',
        to: e164,
        type: 'template',
        template: {
          name: template_name,
          language: { code: template_language },
          components: parameters.length ? [{ type: 'body', parameters }] : [],
        },
      };

      try {
        const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
          body: JSON.stringify(payload),
        });
        const body = await res.json();
        if (res.ok) {
          const messageId = body?.messages?.[0]?.id || null;
          results.push({ name: r.name, mobile: r.mobile, status: 'sent', messageId });
          await supabase.from('whatsapp_messages').insert({
            recipient_name: r.name || null,
            recipient_mobile: r.mobile,
            template_name, template_language,
            status: 'sent', meta_message_id: messageId,
          });
        } else {
          const errMsg = body?.error?.message || 'Send failed.';
          results.push({ name: r.name, mobile: r.mobile, status: 'failed', error: errMsg });
          await supabase.from('whatsapp_messages').insert({
            recipient_name: r.name || null,
            recipient_mobile: r.mobile,
            template_name, template_language,
            status: 'failed', error_message: errMsg,
          });
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'Network error.';
        results.push({ name: r.name, mobile: r.mobile, status: 'failed', error: errMsg });
        await supabase.from('whatsapp_messages').insert({
          recipient_name: r.name || null,
          recipient_mobile: r.mobile,
          template_name, template_language,
          status: 'failed', error_message: errMsg,
        });
      }
    }

    return json({ success: true, results }, 200, req);
  }

  return json({ success: false, message: 'Unknown operation.' }, 400, req);
});
