# 🏏 IPL Fantasy Cricket — Production Deployment Guide
## Stack: Next.js on Vercel + Flask API on Render + Supabase PostgreSQL

---

## 📁 Project Structure

```
ipl-fantasy/
├── .github/workflows/deploy.yml   ← Auto-deploy on git push
├── supabase/
│   └── migrations/001_initial_schema.sql
├── backend/                       ← Flask API → Render
│   ├── app.py
│   ├── requirements.txt
│   └── render.yaml
└── frontend/                      ← Next.js → Vercel
    ├── src/
    │   ├── pages/index.tsx        ← Full UI
    │   ├── lib/api.ts             ← All API calls
    │   ├── lib/store.ts           ← Auth state (Zustand)
    │   └── styles/globals.css
    ├── package.json
    ├── next.config.js
    └── .env.example
```

---

## 🚀 STEP-BY-STEP DEPLOYMENT

### STEP 1 — Supabase (Database)

1. Go to **[supabase.com](https://supabase.com)** → New Project
2. Choose a region closest to you (e.g. `ap-south-1` for India)
3. Set a strong database password → **Save it**
4. Once created, go to **SQL Editor** → paste contents of `supabase/migrations/001_initial_schema.sql` → Run
5. Go to **Settings → API** → copy:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_KEY` (keep secret!)
6. Go to **Settings → Database** → copy the **Connection string (URI)** → `DATABASE_URL`

---

### STEP 2 — Render (Flask Backend)

1. Push your code to GitHub
2. Go to **[render.com](https://render.com)** → New → Web Service
3. Connect your GitHub repo
4. Settings:
   ```
   Root Directory:  backend
   Runtime:         Python
   Build Command:   pip install -r requirements.txt
   Start Command:   gunicorn app:app --workers 2 --bind 0.0.0.0:$PORT
   Region:          Singapore (closest to India)
   Plan:            Free
   ```
5. Add Environment Variables:
   ```
   DATABASE_URL        = (paste from Supabase Step 6)
   SUPABASE_URL        = (paste from Supabase Step 5)
   SUPABASE_ANON_KEY   = (paste from Supabase Step 5)
   SUPABASE_SERVICE_KEY= (paste from Supabase Step 5)
   JWT_SECRET_KEY      = (click "Generate" in Render)
   ALLOWED_ORIGINS     = https://your-app.vercel.app
   CRICAPI_KEY         = (optional — from cricapi.com)
   ```
6. Deploy → copy the URL: `https://ipl-fantasy-api.onrender.com`

---

### STEP 3 — Vercel (Next.js Frontend)

1. Go to **[vercel.com](https://vercel.com)** → New Project
2. Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Add Environment Variables:
   ```
   NEXT_PUBLIC_API_URL         = https://ipl-fantasy-api.onrender.com
   NEXT_PUBLIC_SUPABASE_URL    = (from Supabase)
   NEXT_PUBLIC_SUPABASE_ANON   = (from Supabase)
   ```
5. Deploy → your site is live at `https://your-app.vercel.app`

---

### STEP 4 — Update CORS

Once you have your Vercel URL, update the `ALLOWED_ORIGINS` env var in Render:
```
ALLOWED_ORIGINS = https://your-app.vercel.app,https://your-custom-domain.com
```

---

### STEP 5 — Make Admin User

After deploying, register an account on your site, then in Supabase SQL Editor:
```sql
UPDATE profiles SET is_admin = TRUE WHERE username = 'your-username';
```

---

## 🔁 Auto-Deploy (CI/CD)

Every `git push` to `main` auto-deploys both frontend and backend.

Set these GitHub Secrets (Settings → Secrets → Actions):
```
RENDER_DEPLOY_HOOK       = (Render → Service → Settings → Deploy Hook)
VERCEL_TOKEN             = (vercel.com → Settings → Tokens)
VERCEL_ORG_ID            = (vercel.com → Settings → General)
VERCEL_PROJECT_ID        = (vercel.com → Project → Settings → General)
NEXT_PUBLIC_API_URL      = https://ipl-fantasy-api.onrender.com
NEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON= your-anon-key
```

---

## 💰 Cost Breakdown (All Free Tier)

| Service | Free Tier | Limits |
|---------|-----------|--------|
| **Vercel** | ✅ Free | 100GB bandwidth/month |
| **Render** | ✅ Free | Sleeps after 15min inactivity |
| **Supabase** | ✅ Free | 500MB DB, 2GB bandwidth |
| **Total** | **₹0/month** | Great for testing & small user base |

> ⚡ **Render free tier sleeps** — first request after inactivity takes ~30s to wake up.
> Upgrade to Render Starter ($7/mo) for always-on API when you go live.

---

## 🌐 Custom Domain (Optional)

1. Buy a domain (e.g. `cricketdream.in` on GoDaddy/Namecheap — ~₹500/year)
2. In Vercel → Project → Settings → Domains → Add Domain
3. Follow DNS instructions (usually takes 5-10 minutes)
4. Update `ALLOWED_ORIGINS` in Render with your new domain

---

## 🔑 Admin Workflow

Once deployed and logged in as admin:
1. **Add matches** → `Admin Panel → Update Match Result`
2. **Enter player scores** after each match → points auto-calculate
3. **Leaderboard** updates automatically

---

## 🎯 Live Cricket Scores (Optional)

1. Sign up at **[cricapi.com](https://cricapi.com)** — free 100 calls/day
2. Add `CRICAPI_KEY` to Render environment variables
3. The `/api/cricket/live` endpoint will then show real IPL scores

---

## 📞 Support

- Supabase docs: https://supabase.com/docs
- Vercel docs: https://vercel.com/docs
- Render docs: https://render.com/docs
- Flask docs: https://flask.palletsprojects.com
