import { ROUTES } from "@/lib/routes";
import type { ProfileRole } from "@/types";

export type AuthRole = ProfileRole;

const publicAuthPaths = new Set<string>([
  ROUTES.auth.login,
  ROUTES.admin.login,
  ROUTES.coach.login,
  ROUTES.auth.forgotPassword,
  ROUTES.auth.updatePassword,
  ROUTES.auth.resetPasswordSent,
]);

export function getDefaultPostLoginPath(role: AuthRole) {
  if (role === "admin") return ROUTES.admin.home;
  if (role === "coach") return ROUTES.coach.dashboard;
  return ROUTES.dashboard.home;
}

function parseInternalPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return null;
  }

  try {
    return new URL(nextPath, "http://sound-fitness.local");
  } catch {
    return null;
  }
}

function matchesRouteBoundary(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isAllowedForRole(role: AuthRole, pathname: string) {
  if (publicAuthPaths.has(pathname)) return false;
  if (role === "admin") return matchesRouteBoundary(pathname, ROUTES.admin.home);
  if (role === "coach") return matchesRouteBoundary(pathname, ROUTES.coach.home);
  return (
    matchesRouteBoundary(pathname, ROUTES.dashboard.home) ||
    matchesRouteBoundary(pathname, ROUTES.performance.home)
  );
}

export function getPostLoginRedirectPath(
  role: AuthRole,
  nextPath: string | null,
) {
  const parsedNext = parseInternalPath(nextPath);

  if (parsedNext && isAllowedForRole(role, parsedNext.pathname)) {
    return `${parsedNext.pathname}${parsedNext.search}${parsedNext.hash}`;
  }

  return getDefaultPostLoginPath(role);
}
