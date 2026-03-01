# Deployment

## Required Environment Variables
- NEXT_PUBLIC_SITE_URL (required in production)
  - Example: https://yourdomain.com

## Local Production Verification
```bash
rm -rf .next && NEXT_PUBLIC_SITE_URL=http://localhost:3001 npm run build
HOST=127.0.0.1 PORT=3001 NEXT_PUBLIC_SITE_URL=http://localhost:3001 npm start
```

## Vercel
Set Environment Variables:

NEXT_PUBLIC_SITE_URL = https://<your-vercel-domain-or-custom-domain>

Build Command:

npm run build

Output:

Next.js default (no custom output dir)

## Self-hosted (Node)
```bash
npm ci
NEXT_PUBLIC_SITE_URL=https://yourdomain.com npm run build
HOST=127.0.0.1 PORT=3001 NEXT_PUBLIC_SITE_URL=https://yourdomain.com npm start
```

## Vercel Domain Switch (finlogichub5.com)
1. In Vercel, open the `us-compliance-tools` project.
2. Go to Settings → Environment Variables and set:
   - `NEXT_PUBLIC_SITE_URL` = `https://finlogichub5.com`
   - Environment: Production (optionally Preview)
3. Go to Settings → Domains and add `finlogichub5.com`.
4. In your domain provider (Namecheap/GoDaddy/Cloudflare), remove old finance-site records and add the DNS records shown by Vercel:
   - A record for `@` → Vercel IP, or
   - CNAME/ALIAS/ANAME for `@` → `cname.vercel-dns.com`
   - If using Cloudflare, set to DNS only if Vercel requests it.
5. In Vercel, go to Deployments and Redeploy the latest Production build.
6. Verify:
   - https://finlogichub5.com
   - https://finlogichub5.com/tools/california/annual-report-deadline
   - https://finlogichub5.com/sitemap.xml (URLs should use https://finlogichub5.com/)
   - https://finlogichub5.com/tools/invalid/tool → 404
