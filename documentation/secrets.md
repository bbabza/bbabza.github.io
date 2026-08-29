# Credentials & Secrets Reference

> **WARNING:** This file is in a public GitHub repository. These credentials are already present
> in the site's source code, so exposure is equivalent. However, if this repo is ever made
> private or credentials are rotated, ensure this file is updated or removed accordingly.

---

## Site Admin Login

| Field | Value |
|---|---|
| **Username** | `admin` |
| **Password** | `bbabza@admin2026` |
| **SHA-256 hash** | `5714adb1c5108de0f1f6e9aeb636733c4ac08874fc37ad9223cf8456d8513c19` |
| **Stored in** | `js/script.js` — constant `ADMIN_HASH` |
| **Session key** | `localStorage` key `bba_admin` = `'1'` when logged in |

To change the admin password:
1. Generate SHA-256 of the new password (use browser console: `crypto.subtle.digest(...)` or any online tool)
2. Replace `ADMIN_HASH` value in `js/script.js`
3. Update this file

---

## Supabase

| Field | Value |
|---|---|
| **Project URL** | `https://tiwazbntxvyvwfjzcwrv.supabase.co` |
| **Project ref** | `tiwazbntxvyvwfjzcwrv` |
| **Anon (public) key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpd2F6Ym50eHZ5dndmanpjd3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MTUxOTYsImV4cCI6MjEwMzQ5MTE5Nn0.XQ-7AadKhw_b74fUxrfGlKMkASqkzbPUz8jrS12af6E` |
| **Stored in** | `js/supabase-client.js` — constant `SUPABASE_KEY` |
| **Dashboard login** | `supabase.com` — log in with the project owner's account |

> The anon key is a **public key by design** — Supabase Row Level Security (RLS) policies
> control what operations it can perform. It is safe to include in client-side code.

---

## UPI Payment

| Field | Value |
|---|---|
| **UPI ID** | `bbabza@sbi` |
| **Payee name** | `Bezwada Bar Assn` |
| **Stored in** | `tournament/index.html` — constants `UPI_ID` and `UPI_NAME` in inline `<script>` |

---

## GitHub Repository

| Field | Value |
|---|---|
| **Repository** | `github.com/bbabza/bbabza.github.io` |
| **Deploy branch** | `main` |
| **GitHub user** | `pavankumars83` |
| **GitHub email** | `pavankumar.sakamuri@gmail.com` |

---

## Association Contact

| Field | Value |
|---|---|
| **Email** | `bbabza@gmail.com` |
| **Phone** | `0866 – 2574321` |
| **Address** | Civil Courts Campus, Gopala Reddy Road, Governorpet, Vijayawada – 520 002 |
