# Partnerschaft India Portal — Setup Guide

## What's Included
| File | Purpose |
|------|---------|
| login.html | Login page (email + password) |
| register.html | Vendor + Client registration |
| vendor.html | Vendor dashboard (profile + status) |
| client.html | Client dashboard (stats + requirements list) |
| client-submit.html | Submit a new requirement |
| admin.html | BK's management dashboard |
| forgot.html | Password reset |
| SETUP.sql | Supabase database schema |

---

## Step 1 — Create Supabase Project

1. Go to https://supabase.com → New Project
2. Name: `partnerschaft-india`
3. Password: save securely
4. Region: **Southeast Asia (Singapore)** — closest to India
5. Wait for project to be ready (~2 min)

---

## Step 2 — Run Database Schema

1. In Supabase → left sidebar → **SQL Editor**
2. Click **New Query**
3. Paste the contents of `SETUP.sql`
4. Click **Run** → should see "Setup complete"

---

## Step 3 — Configure the Portal

Open each HTML file and replace these two lines at the top:

```javascript
const _SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
const _SUPABASE_ANON = 'YOUR_ANON_PUBLIC_KEY';
```

**Where to find them:**
- Supabase Dashboard → **Settings** → **API**
- Copy: Project URL + Project API Key (anon / public)

Also update this line with your admin email:
```javascript
const ADMIN_EMAIL = 'business@partnerschaft.in';
```

---

## Step 4 — Enable Email Auth

1. Supabase → **Authentication** → **Providers**
2. Enable **Email** provider
3. Turn OFF "Confirm email" initially (for testing), turn ON for production

---

## Step 5 — Set Admin Policies

After you create your admin account (use your email):
1. Supabase → Authentication → Users → find your user → copy the UUID
2. Supabase → SQL Editor → run:
```sql
CREATE POLICY "admin_all_profiles"     ON profiles     FOR ALL USING (auth.uid() = 'PASTE-YOUR-UUID');
CREATE POLICY "admin_all_vendors"      ON vendors      FOR ALL USING (auth.uid() = 'PASTE-YOUR-UUID');
CREATE POLICY "admin_all_clients"      ON clients      FOR ALL USING (auth.uid() = 'PASTE-YOUR-UUID');
CREATE POLICY "admin_all_requirements" ON requirements FOR ALL USING (auth.uid() = 'PASTE-YOUR-UUID');
```

---

## Step 6 — Upload to Hosting

Upload the entire `portal/` folder to your web host alongside the main site files.

URL structure:
```
partnerschaft.in/portal/login.html
partnerschaft.in/portal/register.html
partnerschaft.in/portal/vendor.html
partnerschaft.in/portal/client.html
partnerschaft.in/portal/admin.html
```

---

## Step 7 — Share With Vendors

Send vendors this link:
```
https://www.partnerschaft.in/portal/register.html
```

They select **Vendor / Expert**, fill the form, and submit.
You will see them in the Admin Dashboard under **Vendors → Pending Review**.

---

## Vendor Flow
1. Register → Email verification
2. Status: **Pending** (you see it in admin)
3. You review → **Approve** or **Reject**
4. Approved vendors: you contact them when a matching requirement comes in

## Client Flow
1. Register → Email verification → Dashboard
2. Submit requirements → you receive notification
3. Update status from Admin → Vendor Identified → Proposal Sent → etc.

---

## Need Help?
All portal data is in Supabase → **Table Editor** for direct access.
