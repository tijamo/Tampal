# Deploying TamFam on Coolify + a UK VPS

This hosts **everything on one UK server**: the Next.js app *and* the self-hosted
Supabase backend, with git-push deploys and automatic HTTPS via
[Coolify](https://coolify.io). All compute and data stay in the UK — no US
transfer, no egress caps — for roughly **£7–10/month**.

```
            ┌─────────────────────── UK VPS ───────────────────────┐
  browser → │  Coolify proxy (Traefik, auto-TLS)                    │
            │    ├─ tamfam.example      → app (Next.js, Dockerfile) │
            │    └─ api.tamfam.example  → kong → auth + rest → db   │
            └───────────────────────────────────────────────────────┘
```

## 1. Get a UK VPS

Pick a provider with a UK/London data centre and **≥ 2 GB RAM** (the Supabase
stack plus the app want a little headroom). Good options:

| Provider | Notes |
| --- | --- |
| [Mythic Beasts](https://www.mythic-beasts.com/order/vps) | UK DCs, developer-friendly, root access |
| [Krystal](https://krystal.io/) | UK company, UK DCs, green hosting, good support |
| [OVHcloud UK](https://www.ovhcloud.com/en-gb/vps/os/vps-docker/) | London, Docker pre-installed |
| [IONOS UK](https://www.ionos.co.uk/servers/vps) | Cheapest entry tier |

Choose Ubuntu 22.04/24.04. Point two DNS **A records** at the server's IP:
`tamfam.example` (app) and `api.tamfam.example` (backend).

## 2. Install Coolify

SSH in and run the installer:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Open `http://<server-ip>:8000`, create your admin account, and (recommended) set
Coolify to use the server it's installed on ("localhost" destination). Coolify
runs its own Traefik proxy and handles Let's Encrypt certificates for you.

## 3. Generate secrets

On the server (or locally), from the repo:

```bash
cd self-hosting
node gen-keys.mjs        # prints JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY
```

Keep this output — you'll paste values into both resources below.

## 4. Deploy the Supabase backend (Docker Compose resource)

1. In Coolify: **＋ New Resource → Docker Compose**, connect this Git repo, and set
   the compose path to `self-hosting/docker-compose.yml`.
2. Add the environment variables from `self-hosting/.env.example` — set
   `POSTGRES_PASSWORD`, the generated `JWT_SECRET` / `ANON_KEY` /
   `SERVICE_ROLE_KEY`, `API_EXTERNAL_URL=https://api.tamfam.example`,
   `SITE_URL=https://tamfam.example`, `ADDITIONAL_REDIRECT_URLS`, and the `SMTP_*`
   values.
3. Let **Coolify's proxy terminate TLS** instead of the bundled Caddy: assign the
   domain `https://api.tamfam.example` to the **`kong`** service on **port 8000**.
   Because Coolify's Traefik fronts it, change `kong`'s `ports:` to `expose:` (or
   remove the host publish) so it isn't also bound to the host — Coolify routes to
   it internally. The `Caddyfile` in `self-hosting/` is only for non-Coolify hosts.
4. Deploy. Wait until `db` and `auth` are healthy (check the resource logs).

> Studio (the admin UI) stays internal. Reach it via an SSH tunnel only:
> `ssh -L 3001:localhost:3001 you@server` — never give it a public domain.

## 5. Apply the database schema (once)

Our tables reference `auth.users`, created by GoTrue at runtime, so migrate after
the stack is healthy. From the repo on the server:

```bash
cd self-hosting
DB_SERVICE=db ./migrate.sh     # applies ../supabase/migrations/*.sql
```

(If the compose project/service name differs under Coolify, either run `migrate.sh`
with `DB_SERVICE` set to the running db container, or open a terminal on the `db`
container in Coolify and `psql -U postgres -d postgres -f` each migration.)

## 6. Deploy the app (Application resource)

1. In Coolify: **＋ New Resource → Application → Public/Private Git repo**, select
   this repo and branch. Build pack: **Dockerfile** (repo root).
2. **Build-time** variables (Coolify: tick "Build Variable" so they're passed as
   build args — `NEXT_PUBLIC_*` are inlined at build):
   - `NEXT_PUBLIC_SUPABASE_URL=https://api.tamfam.example`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>`
   - `NEXT_PUBLIC_SITE_URL=https://tamfam.example`
   - `NEXT_PUBLIC_DATA_CONTROLLER_NAME=Tamworth Christadelphian Church`
   - `NEXT_PUBLIC_DATA_CONTROLLER_EMAIL=privacy@yourdomain`
3. **Runtime** variables (secret, not build args):
   - `SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>`
4. Set the domain to `https://tamfam.example`, port **3000**. Deploy.

Coolify builds the image, provisions TLS, and sets up a webhook so future pushes
to the branch auto-deploy. HTTPS is required for the PWA/service worker to install
— which you now have.

## 7. Bootstrap the first admin

Accounts are invite-only. Invite yourself, then promote:

```bash
curl -X POST "https://api.tamfam.example/auth/v1/invite" \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.org"}'

# then, in a terminal on the db container:
psql -U postgres -d postgres -c \
  "update profiles set role='admin' where user_id=(select id from auth.users where email='you@example.org');"
```

## 8. Smoke test

Visit `https://tamfam.example`, sign in via the emailed magic link, add a person
(with consent), create a weekly meeting, and take a register on a phone — toggle
airplane mode mid-way to confirm offline queue + sync.

## Backups

Add a Coolify **Scheduled Task** (or a cron on the host) running a nightly dump and
copy it off-box, encrypted:

```bash
docker exec <db-container> pg_dump -U postgres -d postgres --no-owner \
  | gzip > "tamfam-$(date +%F).sql.gz"
```

## Updating

Push to the branch → the app redeploys automatically. For the Supabase images,
bump the tags in `self-hosting/docker-compose.yml` deliberately and redeploy the
compose resource; GoTrue/PostgREST run their own migrations on start. Add new
numbered files under `supabase/migrations/` for future schema changes and re-run
them via a terminal on the `db` container.
