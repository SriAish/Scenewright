import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

/*
  Next.js 16 renamed the Middleware file convention to Proxy (same
  functionality, file renamed from middleware.ts to proxy.ts, exported
  function renamed from `middleware` to `proxy`). The Supabase session
  helper keeps the name middleware.ts since that is Supabase's own
  convention for that file, unrelated to this rename.
*/

const PUBLIC_PATHS = new Set(["/sign-in", "/attribution"]);

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!user && !PUBLIC_PATHS.has(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    return withRefreshedCookies(NextResponse.redirect(redirectUrl), supabaseResponse);
  }

  if (user && pathname === "/sign-in") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return withRefreshedCookies(NextResponse.redirect(redirectUrl), supabaseResponse);
  }

  return supabaseResponse;
}

// A redirect creates a new response object; carry over any cookies a
// token refresh wrote into supabaseResponse so the redirected request
// still lands with a fresh session.
function withRefreshedCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
