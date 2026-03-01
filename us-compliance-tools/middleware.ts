import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const LEGACY = new Set([
  "/mri",
  "/risk",
  "/dashboard",
  "/market",
  "/signals",
  "/share",
]);

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname.replace(/\/+$/, "") || "/";

  if (
    path === "/tools" ||
    path.startsWith("/tools/") ||
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path === "/sitemap.xml" ||
    path === "/robots.txt" ||
    path === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (LEGACY.has(path)) {
    const url = req.nextUrl.clone();
    url.pathname = "/tools";
    url.search = "";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}
