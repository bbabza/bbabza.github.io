-- Add new columns to members table
-- Run this in Supabase SQL editor before importing the CSV

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS gender             text,
  ADD COLUMN IF NOT EXISTS membership_type    text,
  ADD COLUMN IF NOT EXISTS yearly_renewed_date date,
  ADD COLUMN IF NOT EXISTS res_phone          text,
  ADD COLUMN IF NOT EXISTS office_phone       text;

-- Optional: update status default to lowercase to match new convention
ALTER TABLE members ALTER COLUMN status SET DEFAULT 'active';
