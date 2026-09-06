-- Add UTR number column to tournament_registrations
-- Run this in Supabase SQL editor before any registrations come in

ALTER TABLE tournament_registrations
  ADD COLUMN IF NOT EXISTS utr_number text;

-- Update payment_status check values to include utr_submitted
-- (no constraint existed before, so just noting valid values here)
-- pending        → initial state after registration
-- utr_submitted  → user submitted UTR; pending verification
