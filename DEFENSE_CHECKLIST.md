# Pre-Final-Defense Day Checklist

Quick runbook for demo day. For the deeper "how does this all work" reference, see `HOSTING.md`.

## Night before

Nothing required — Postgres and Ollama both auto-start on login, and the tunnel/domain
config never changes. Optionally do one more dry run: double-click `close-defense-demo.bat`,
then double-click `start-defense-demo.bat`.

## At the venue

1. Connect to Wi‑Fi (only needed for the public link — skip if there's no Wi‑Fi, see below).
2. In File Explorer, double-click **`start-defense-demo.bat`** in the project folder
   (`E:\Builds\Test-Build-2\SafePath`). A console window opens and runs everything —
   leave it open.
3. Wait for the green summary block at the end. It prints two URLs:
   - **Local** — `http://localhost:3002` — show this on the laptop screen.
   - **Public** — `https://app.safepath.space` — give this to panelists to open on their own phones/laptops.
4. Press any key in that console window once you've read the summary (it's just waiting
   to close itself — the actual backend/frontend/tunnel keep running in their own windows).

*(Prefer typing commands instead? Open PowerShell in the project folder and run
`.\start-defense-demo.ps1` — same script, same result.)*

## No Wi‑Fi at the venue?

The local demo needs **zero internet** — Next.js, Express, Postgres, and Ollama all run
entirely on this machine. The `-LocalOnly` flag skips the tunnel, but double-clicking a
`.bat` can't pass flags — for this case open PowerShell in the project folder instead and run:
```powershell
.\start-defense-demo.ps1 -LocalOnly
```
and present from `http://localhost:3002` only.

## After the defense

Double-click **`close-defense-demo.bat`** (or run `.\close-defense-demo.ps1` in PowerShell).

## If something's red

| Message | What it means | Fix |
|---|---|---|
| `Postgres service 'postgresql-x64-18' not found` | Service name changed or Postgres isn't installed | Check `Get-Service *postgres*` for the real name |
| `Ollama isn't responding on :11434...` | Ollama app isn't running yet | Launch it: `& "$env:LOCALAPPDATA\Programs\Ollama\ollama app.exe"`, wait ~10s, re-run the script. AI scoring just won't run until it's up — everything else (reports, map, auth) still works fine without it. |
| `Backend never responded...` | Something crashed on startup — check the backend window for the actual error | Usually a DB connection issue; confirm Postgres is really up |
| `Frontend never responded...` | Check the frontend window — a stale `.next` build or port conflict | Re-run `npm run build` in `website/` if the window shows missing-module errors |
| Public URLs never respond, local ones work fine | No internet, or the tunnel window shows a connection error | Re-run with `-LocalOnly` and demo local only |

## One-time setup (already done, for reference)

- Domain `safepath.space` bought through Cloudflare directly.
- Named tunnel `safepath-defense` created in Cloudflare Zero Trust → Networks → Tunnels,
  with two published-application routes:
  - `app.safepath.space` → `http://localhost:3002`
  - `api.safepath.space` → `http://localhost:3001`
- Tunnel token stored in `server/.env` as `CLOUDFLARE_TUNNEL_TOKEN`.
- `website/.env.local` points at `https://api.safepath.space`; `server/.env` points
  `CORS_ORIGIN`/`FRONTEND_URL`/`SERVER_URL` at `https://app.safepath.space` /
  `https://api.safepath.space`.
- Frontend production-built once (`npm run build` in `website/`) with those URLs baked in.

Because the hostnames are fixed (unlike free quick tunnels), **none of this needs to be
redone on defense day** — only the three processes need to come back up, which is exactly
what `start-defense-demo.ps1` does. If you ever change a route, port, or rebuild the
frontend for a code change, no script changes are needed either — the domain stays the same.
