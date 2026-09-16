import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "../lib/rateLimit";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect sensitive authentication routes against brute force & credential stuffing
  if (pathname.startsWith("/api/auth")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const isHighSensitivity =
      pathname.endsWith("/register") ||
      pathname.endsWith("/recover") ||
      pathname.includes("/login");

    const limitConfig = isHighSensitivity
      ? { intervalMs: 60000, maxRequests: 10 } // 10 attempts/min
      : { intervalMs: 60000, maxRequests: 30 }; // 30 requests/min for challenge queries

    const identifier = `${ip}:${pathname}`;
    const result = await checkRateLimit(identifier, limitConfig);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Too many authentication requests. Please try again shortly.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": result.reset.toString(),
            "X-RateLimit-Limit": result.limit.toString(),
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": result.reset.toString(),
          },
        },
      );
    }

    return NextResponse.next();
  }

  // Forward current pathname in request headers for layout gate checks
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
