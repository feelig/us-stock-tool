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
