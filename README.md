# Project Planner

A Microsoft Project–style planning tool in a single HTML file: collapsible WBS,
Gantt chart, dependencies, working-day scheduling, multi-project workspace, Jira
CSV import, and optional cloud sync across devices.

- **App:** `ProjectPlanner.html` (open it directly in a browser to use locally)
- **Cloud sync API:** `api/workspace.js` (Vercel serverless function)

## Deploy to Vercel (cross-device sync)

### 1. Push to GitHub
```bash
cd "/Users/sachinsharma/Documents/Claude/MSP"
git init && git add . && git commit -m "Project Planner"
# create an EMPTY repo on github.com (e.g. project-planner), then:
git branch -M main
git remote add origin https://github.com/<you>/project-planner.git
git push -u origin main
```

### 2. Import into Vercel
- Go to https://vercel.com/new and import the GitHub repo.
- Framework preset: **Other**. No build command needed. Click **Deploy**.

### 3. Add a database (Vercel KV)
- In the project: **Storage → Create Database → KV** (Upstash Redis). Connect it.
- This auto-adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` env vars.

### 4. Set the sync passphrase
- **Settings → Environment Variables → add** `SYNC_SECRET` = a long random string
  (this protects your data; anyone with the URL can open the app, but only those
  with the passphrase can read/write your projects).
- **Redeploy** so the new env vars take effect.

### 5. Turn on sync in the app
- Open your Vercel URL, click **☁ Sync**, enable it, and enter the **same value**
  you set for `SYNC_SECRET`. Do this on each device — they’ll share one workspace.

## How sync works
- The whole workspace (all projects) is stored as one JSON blob in KV under a key.
- Each device pulls on load and pushes (debounced) after edits.
- Conflict handling is **last-write-wins** by timestamp — fine for one person on
  several devices; not intended for simultaneous multi-user editing.
- Local browser storage is still the source of truth offline; sync layers on top.

## Local use
Just open `ProjectPlanner.html` — everything works without the server (sync shows
"local only"). Use **Save/Open** (JSON) for portable backups.
