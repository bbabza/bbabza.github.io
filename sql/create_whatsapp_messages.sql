-- WhatsApp broadcast send log
-- Run this in Supabase SQL editor before deploying the whatsapp-broadcast edge function

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_name     text,
  recipient_mobile   text NOT NULL,
  template_name      text NOT NULL,
  template_language  text NOT NULL,
  status             text NOT NULL,   -- 'sent' | 'failed'
  meta_message_id    text,
  error_message      text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
-- No policies added: this table is only ever read/written via the service-role
-- key inside the whatsapp-broadcast edge function (same pattern as member_sessions).
