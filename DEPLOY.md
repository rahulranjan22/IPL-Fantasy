# 🏏 IPL Fantasy Cricket — Production Deployment Guide
## Stack: Next.js (full-stack) on Vercel + Supabase PostgreSQL

---

## Project Structure

```
ipl-fantasy/
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_leaderboard_rpc.sql
└── frontend/                        ← Next.js full-stack → Vercel
    ├── src/
    │   ├── pages/
    │   │   ├── index.tsx            ← Homepage
    │   │   ├── api/                 ← Server-side API routes
    │   │   │   ├── teams.ts
    │   │   │   ├── players.ts
    │   │   │   ├── matches/
    │   │   │   ├── scores/
    │   │   │   └── cricket/
    │   │   └── ...                  ← Other pages
    │   ├── lib/
    │   │   ├── supabase.ts          ← Supabase clients
    │   │   ├── api.ts               ← API calls (Supabase + routes)
    │   │   └── store.ts             ← Auth state (Zustand)
    │   └── styles/globals.css
    ├── package.json
    ├── next.config.js
    └── .env.example
```

---

## STEP-BY-STEP DEPLOYMENT

### STEP 1 — Supabase (Database + Auth)

1. Go to **[supabase.com](https://supabase.com)** → New Project
2. Choose a region closest to you (e.g. `ap-south-1` for India)
3. Set a strong database password → **Save it**
4. Once created, go to **SQL Editor**:
   - Paste contents of `supabase/migrations/001_initial_schema.sql` → Run
   - Paste contents of `supabase/migrations/002_leaderboard_rpc.sql` → Run
5. Go to **Settings → API** → copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

---

### STEP 2 — Vercel (Next.js Full-Stack)

1. Go to **[vercel.com](https://vercel.com)** → New Project
2. Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Add Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL    = (from Supabase Step 5)
   NEXT_PUBLIC_SUPABASE_ANON   = (from Supabase Step 5)
   SUPABASE_SERVICE_ROLE_KEY   = (from Supabase Step 5 — keep secret!)
   CRICAPI_KEY                 = (optional — from cricapi.com)
   ```
5. Deploy → your site is live at `https://your-app.vercel.app`

---

### STEP 3 — Make Admin User

After deploying, register an account on your site, then in Supabase SQL Editor:
```sql
UPDATE profiles SET is_admin = TRUE WHERE username = 'your-username';
```

---

## Auto-Deploy (CI/CD)

Every `git push` to `main` auto-deploys via Vercel.

Set these GitHub Secrets (Settings → Secrets → Actions):
```
VERCEL_TOKEN               = (vercel.com → Settings → Tokens)
VERCEL_ORG_ID              = (vercel.com → Settings → General)
VERCEL_PROJECT_ID          = (vercel.com → Project → Settings → General)
NEXT_PUBLIC_SUPABASE_URL   = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON  = your-anon-key
SUPABASE_SERVICE_ROLE_KEY  = your-service-role-key
```

---

## Cost Breakdown (All Free Tier)

| Service | Free Tier | Limits |
|---------|-----------|--------|
| **Vercel** | Free | 100GB bandwidth/month, serverless functions |
| **Supabase** | Free | 500MB DB, 2GB bandwidth, 50K auth users |
| **Total** | **$0/month** | Great for testing & small user base |

> No more cold starts! Vercel serverless functions wake up instantly unlike Render free tier.

---

## Live Cricket Scores (Optional)

1. Sign up at **[cricapi.com](https://cricapi.com)** — free 100 calls/day
2. Add `CRICAPI_KEY` to Vercel environment variables
3. The `/api/cricket/live` endpoint will then show real IPL scores

---

## Custom Domain (Optional)

1. Buy a domain (e.g. `cricketdream.in`)
2. In Vercel → Project → Settings → Domains → Add Domain
3. Follow DNS instructions (usually takes 5-10 minutes)

---

## Admin Workflow

Once deployed and logged in as admin:
1. **Add matches** → Admin Panel → Matches tab
2. **Enter player scores** after each match → Scores tab
3. **Calculate fantasy points** → finalizes rankings
4. **Leaderboard** updates automatically

---

## Support

- Supabase docs: https://supabase.com/docs
- Vercel docs: https://vercel.com/docs
- Next.js API Routes: https://nextjs.org/docs/api-routes/introduction
