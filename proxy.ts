import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const protectedRoutes = [
  "/admin",
  "/coach",
  "/dashboard",
  "/member",
  "/performance",
  "/recovery",
];

const publicAuthRoutes = [
  "/login",
  "/admin/login",
  "/coach/login",
  "/forgot-password",
  "/update-password",
  "/reset-password-sent",
];

function getLoginPath(pathname: string) {
  if (pathname.startsWith("/admin")) return "/admin/login";
  if (pathname.startsWith("/coach")) return "/coach/login";
  return "/login";
}

function matchesRouteBoundary(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  let response = NextResponse.next({
    request,
  });

  if (publicAuthRoutes.includes(pathname)) {
    return response;
  }

  const isProtected = protectedRoutes.some((route) =>
    matchesRouteBoundary(pathname, route),
  );

  if (!isProtected) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = getLoginPath(pathname);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|json|woff|woff2|ttf)$).*)",
  ],
};
