# Membership applications

The website remains a static Vite app. Submissions are handled by the Cloudflare Worker in `worker/index.ts`, which validates the application and sends it through Resend to `ayushsingh160909@gmail.com`. The browser displays success only after Resend accepts the email.

## Configure Resend and Cloudflare

1. Create a Resend account and add/verify the sending domain `asb9.club` (or another domain you control) by publishing the DNS records Resend provides. A mailbox is not required for the sender address, but the sender domain must be verified.
2. Create a Resend API key with permission to send email.
3. Install a current Wrangler CLI (the rate-limit binding requires Wrangler 4.36.0 or later) and authenticate:

   ```powershell
   pnpm dlx wrangler@latest login
   pnpm dlx wrangler@latest types worker/worker-configuration.d.ts
   ```

4. In `wrangler.jsonc`, set `ALLOWED_ORIGIN` to the exact public website origin, including `https://` and without a trailing slash. Set `RESEND_FROM_EMAIL` to a sender on the domain verified in Resend. The checked-in defaults use `https://asb9.club` and `applications@asb9.club`.
5. From the repository root, deploy the Worker, then add the Resend key as a Cloudflare Worker secret:

   ```powershell
   pnpm dlx wrangler@latest deploy
   pnpm dlx wrangler@latest secret put RESEND_API_KEY
   ```

   Paste the key into Wrangler's secure terminal prompt, not into chat, source, or a frontend environment variable. The secret command deploys an updated Worker version; wait for it to finish before configuring the site. The deployed Worker URL is printed by Wrangler. Logs and sampled traces are enabled by the Wrangler configuration; email failure logs contain event/status metadata only, never application content.

## Configure and deploy the website

Set `VITE_APPLICATION_API_URL` to the deployed Worker URL followed by `/api/application`. For a local production build, copy `.env.example` to `.env.production.local`, then replace the example Worker URL. Only the `VITE_APPLICATION_API_URL` line belongs in this frontend file; never copy `RESEND_API_KEY` into it.

The frontend build and existing Figma Make deployment can then be run as before:

```powershell
pnpm build
figma make deploy --build-dir dist
```

For local development, use `.env.local` with `VITE_APPLICATION_API_URL=http://localhost:8787/api/application`, run the Worker with `pnpm dlx wrangler@latest dev`, and set the Worker development `ALLOWED_ORIGIN` to the exact Vite origin (typically `http://localhost:5173`; use the actual port for the Figma Make preview). Use a root-level `.dev.vars` (ignored by Git) for local `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `ALLOWED_ORIGIN` values. The Worker still needs a valid Resend key and verified sender to send a real message.

The root `.env.example` lists the required variable names without credentials. Keep Resend credentials in Wrangler secrets for deployment. The Worker rate-limits each client IP to five submission requests per minute (Cloudflare's rate limiting is approximate and location-scoped), rejects a honeypot field, limits request size, and uses a Resend idempotency key to make retries safe for 24 hours.

## Verification

`pnpm build` verifies the frontend bundle. After configuring the Resend key, sender domain, and Worker, submit a real test application and confirm it arrives at `ayushsingh160909@gmail.com`. An HTTP acceptance response means Resend accepted the email; it does not guarantee final inbox delivery.
