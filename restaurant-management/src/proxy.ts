import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

function isManagementHost(host: string) {
  const configured = process.env.PLATFORM_HOST?.trim().toLowerCase();
  const h = host.toLowerCase().split(":")[0] ?? "";
  if (configured && (h === configured || h.endsWith(`.${configured}`))) return true;
  return h.startsWith("management.") || h === "management.localhost";
}

export default function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  if (isManagementHost(host)) {
    if (pathname.startsWith("/api/platform")) {
      return NextResponse.next();
    }
    if (pathname.startsWith("/platform")) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = `/platform${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  if (pathname.startsWith("/platform")) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/platform/:path*"],
};
