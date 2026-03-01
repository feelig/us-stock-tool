# Project intro
Next.js app for U.S. compliance tools.

# Setup
- Install dependencies: `npm install`
- Required env var: `NEXT_PUBLIC_SITE_URL`

Examples:
```
# Local
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# Production
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

# Development Commands (English)

## 🟢 Stable Development Mode
`npm run dev:stable`

- Clears port 3001
- Clears cache
- Reinstalls dependencies
- Starts Next.js in dev mode on port 3001

Open:
http://localhost:3001

## 🔵 Production Verification (Required Before Deployment)
`npm run prod:verify`

- Clears port 3001
- Clears cache
- Reinstalls dependencies
- Builds production bundle
- Starts production server (localhost only)

Open:
http://localhost:3001

## ⚠️ Rules

- Do NOT run dev and start at the same time
- Always run prod:verify before deployment
- If errors occur, rerun dev:stable
