"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ProtectedHeader from "@/components/ProtectedHeader";
import { ProfileProvider } from "@/components/profile/ProfileProvider";
import { supabase } from "@/lib/supabaseClient";
import { ROUTES } from "@/lib/routes";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // The main-dashboard preview only ever renders inside the already-gated
    // /admin iframe. Re-running the auth + role check there duplicates a
    // network getUser() and a profiles query in a second same-origin document,
    // which contends with the parent on Supabase's auth-token lock (the 5s
    // "lock not released" stalls). When embedded, the parent has already
    // gated us — render immediately.
    if (
      pathname === ROUTES.admin.mainDashboardPreview &&
      typeof window !== "undefined" &&
      window.top !== window.self
    ) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function checkAuth() {
      if (pathname === ROUTES.admin.login) {
        setLoading(false);
        return;
      }

      // proxy.ts (server middleware) already validates the session with a
      // network getUser() on every /admin request and redirects out if it is
      // missing or expired. Client-side we only need the user id for the role
      // gate, so read the cached session (getSession — no network round-trip)
      // instead of getUser() to avoid a redundant request and lock contention.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user ?? null;

      if (!user) {
        router.replace(ROUTES.admin.login);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      // Only sign out on a *definite* non-admin — a role we could read that is
      // not "admin". A failed/empty profile fetch (transient network/RLS blip)
      // must not destroy a valid session, so treat it as "not authorized here"
      // and just bounce to login without signing out.
      if (profile && profile.role !== "admin") {
        await supabase.auth.signOut();
        router.replace(ROUTES.admin.login);
        return;
      }

      if (profileError || !profile) {
        router.replace(ROUTES.admin.login);
        return;
      }

      setLoading(false);
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (loading) return null;

  if (pathname === ROUTES.admin.login) return <>{children}</>;

  if (
    pathname === ROUTES.admin.home ||
    pathname === ROUTES.admin.mainDashboardPreview
  ) {
    return <ProfileProvider>{children}</ProfileProvider>;
  }

  return (
    <ProfileProvider>
      <ProtectedHeader role="admin" />
      {children}
    </ProfileProvider>
  );
}
