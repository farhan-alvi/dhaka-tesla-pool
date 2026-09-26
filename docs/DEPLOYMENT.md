# Deployment (free tier only, PRD §6)

## Reproducible Docker deployment (always works, use this if in doubt)

Any machine with Docker installed can run the whole stack:
```bash
git clone <your-repo-url>
cd dhaka-tesla-pool
docker compose up --build
```
Frontend: http://localhost:3000 · Backend: http://localhost:4000/health

## Optional: public free-tier hosting

**Render.com (free tier)** is a straightforward option:

1. Push this repo to GitHub.
2. On Render: **New → PostgreSQL** (free tier) → note the internal connection string.
3. **New → Web Service** for `backend/`:
   - Build command: `npm install && npx prisma generate`
   - Start command: `npx prisma migrate deploy && node prisma/seed.js && node src/server.js`
   - Env vars: `DATABASE_URL` (from step 2), `JWT_SECRET`, `PORT=4000`
4. **New → Web Service** (or **Static Site** with `next export`, but this app
   uses server features so a Web Service is simpler) for `frontend/`:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Env var: `NEXT_PUBLIC_API_URL=<your backend's Render URL>`
5. Free-tier services spin down after inactivity — the first request after
   idle can take ~30s to wake up; document this in your demo video.

**Railway.app** works the same way (Postgres plugin + two services) and also
has a free tier with usage limits.

If free hosting isn't available/practical when you submit, the Docker Compose
setup above is the documented, reproducible fallback per PRD §6.

Once deployed, put the live URL here:
```
Frontend: <fill in>
Backend:  <fill in>
```
