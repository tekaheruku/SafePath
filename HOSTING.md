# Hosting SafePath from Local Hardware (Cloudflare Tunnel)

This documents how to take the local dev project and serve it publicly from this
machine using free Cloudflare Quick Tunnels, so it's reachable from phones/other
computers without port forwarding or a domain.

## Architecture

```
Browser (any device)
   │
   ▼
https://<website>.trycloudflare.com   ──▶  cloudflared  ──▶  localhost:3002 (Next.js, production build)
                                                                   │
                                                                   ▼ (server-side rewrite, /api/v1/*)
                                                             localhost:3001 (Express backend)
                                                                   ▲
https://<backend>.trycloudflare.com   ──▶  cloudflared  ──▶ ──────┘
   ▲
   │ (used directly by the BROWSER for client-side API calls + Socket.IO)
```

Two separate tunnels are used — one for the Next.js frontend (what users visit),
one for the Express backend (what the browser's JS and Socket.IO connect to
directly). `cloudflared` is installed at:
`C:\Program Files (x86)\cloudflared\cloudflared.exe`

### Why two tunnels, and the one real limitation

Quick Tunnels (the free, no-account, no-domain kind) hand out a **random**
`*.trycloudflare.com` URL every time `cloudflared` starts. That URL only stays
the same as long as that specific `cloudflared` process keeps running.

The frontend's `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL` are baked into
the Next.js build at build time. So: **if the backend tunnel restarts and gets
a new URL, the website must be rebuilt** with the new URL. Restarting the
*website's* tunnel does not require a rebuild — only restarting the *backend's*
tunnel does. Keep both `cloudflared` processes running continuously to avoid
this churn; only rebuild when you deliberately restart the backend tunnel.

If you eventually want stable, unchanging URLs, that requires a real domain
added to a Cloudflare account and a named (not "quick") tunnel — ask to set
that up when ready.

## Files involved

- `server/.env` — backend secrets/config. Relevant keys:
  - `CORS_ORIGIN` — must match the **website's** current tunnel URL (for Socket.IO CORS).
  - `FRONTEND_URL` — should also match the website's current tunnel URL (used in emails, etc).
- `website/.env.local` — frontend config. Relevant keys:
  - `BACKEND_URL`, `BACKEND_REWRITE_URL` — keep as `http://localhost:3001` / `http://127.0.0.1:3001` (server-side only, same machine, never needs to change).
  - `NEXT_PUBLIC_API_URL` — must be `https://<backend-tunnel-url>/api/v1`.
  - `NEXT_PUBLIC_SOCKET_URL` — must be `https://<backend-tunnel-url>`.

## Starting everything from scratch

Run each of these as separate background processes (separate terminals, or
`&` background jobs). Do this from the repo root `e:\Builds\Test-Build-2\SafePath`.

**1. Start the backend:**
```bash
cd server
npm run dev
```
Confirm it's up: `curl http://localhost:3001/health`

**2. Tunnel the backend:**
```bash
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3001
```
Copy the printed `https://xxxx.trycloudflare.com` URL — this is the **backend URL**.

**3. Point the frontend at the backend tunnel:**
Edit `website/.env.local`:
```
NEXT_PUBLIC_API_URL=https://<backend-tunnel-url>/api/v1
NEXT_PUBLIC_SOCKET_URL=https://<backend-tunnel-url>
```

**4. Build and start the frontend (production mode):**
```bash
cd website
npm run build
npm run start -- -p 3002
```
Confirm it's up: `curl http://localhost:3002`

> Never run `npm run dev` for the website at the same time as `npm run start`
> in the same folder — they share the `.next` build output and will corrupt
> each other's chunks (missing-module errors). Only one should be running
> against `website/.next` at a time.

**5. Tunnel the frontend:**
```bash
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3002
```
Copy the printed URL — this is the **public site URL** to share/visit from any device.

**6. Point the backend's CORS at the frontend tunnel:**
Edit `server/.env`:
```
CORS_ORIGIN=https://<website-tunnel-url>
FRONTEND_URL=https://<website-tunnel-url>
```
Then restart the backend (stop the `npm run dev` process and start it again) so
it picks up the new env values.

Done — visit the website tunnel URL from any device.

## Stopping everything

Stop, in any order:
- The two `cloudflared` processes (closing their terminal, or killing the PID).
- The backend `npm run dev` process.
- The website `npm run start` process.

Nothing here is a system service — closing the terminals/processes takes the
site offline. The Postgres database is unaffected either way (it's a separate
local service).

## Updating the live site after a code change

- **Backend-only change** (files under `server/`): just restart the backend
  process (`npm run dev` picks up `.ts` changes automatically via `tsx watch`
  while running — no restart needed unless you changed `.env`). No rebuild, no
  tunnel restart needed.
- **Frontend change** (files under `website/`): you must rebuild and restart:
  ```bash
  cd website
  npm run build
  npm run start -- -p 3002
  ```
  The website tunnel does **not** need to restart — it just keeps forwarding
  to port 3002, and the new build takes over as soon as the new `npm run start`
  is listening. Stop the old `npm run start` process before starting the new
  one (frees port 3002).
- **Shared types change** (files under `shared/`): rebuild shared first, then
  whichever of `server`/`website` depends on the changed types:
  ```bash
  cd shared
  npm run build
  ```

## If a tunnel URL changes (e.g. you restarted cloudflared)

- **Website tunnel changed**: update `CORS_ORIGIN` and `FRONTEND_URL` in
  `server/.env`, restart the backend. No frontend rebuild needed.
- **Backend tunnel changed**: update `NEXT_PUBLIC_API_URL` and
  `NEXT_PUBLIC_SOCKET_URL` in `website/.env.local`, then **rebuild and restart
  the frontend** (these values are baked in at build time — editing the file
  alone does nothing until you rebuild).

## Known local environment notes

- Port 3002 is the website's usual port; port 3001 is the backend's. Check
  `netstat -ano | grep ":3002"` (or `:3001`) before starting anything new —
  if something is already listening, reuse/restart that process instead of
  starting a duplicate one on the same port.
- `cloudflared` was installed via `winget install --id Cloudflare.cloudflared`.
  If a new terminal can't find it on PATH, use the full path shown above.
