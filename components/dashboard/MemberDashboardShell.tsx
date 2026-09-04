"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import OffscreenAnimationPauser from "@/components/dashboard/OffscreenAnimationPauser";
import { ProfileProvider } from "@/components/profile/ProfileProvider";
import { ROUTES } from "@/lib/routes";
import { supabase } from "@/lib/supabaseClient";

export default function MemberDashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const useEmbeddedHeader =
    pathname === ROUTES.dashboard.home ||
    pathname === ROUTES.dashboard.goals ||
    pathname === ROUTES.dashboard.sessions ||
    pathname === ROUTES.dashboard.profile ||
    pathname === ROUTES.dashboard.exerciseLibrary ||
    pathname === ROUTES.workoutBuilder.exerciseLibrary;

  // The server middleware (proxy.ts) already validates the session on every
  // /dashboard request and redirects out if it's missing/expired, so we render
  // the dashboard immediately instead of blanking the whole (7k-node) page for
  // up to 3.5s behind a redundant client auth check. Here we only verify the
  // member ROLE, in the background, using the cached session (getSession, no
  // network round-trip) — and redirect out only on a definite non-member.
  useEffect(() => {
    let isActive = true;

    async function verifyRole() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const user = session?.user ?? null;
        if (!isActive) return;

        if (!user) {
          // Local iteration only — mirrors the server-side bypass in
          // proxy.ts. The flag is inlined from a gitignored env file, so it
          // never exists in a deployed build; the hostname check is
          // belt-and-braces on top of that. Without this the pane wins or
          // loses a race with this check on every load.
          const localAuthBypass =
            process.env.NEXT_PUBLIC_SF_LOCAL_AUTH_BYPASS === "1" &&
            (window.location.hostname === "localhost" ||
              window.location.hostname === "127.0.0.1");
          if (!localAuthBypass) router.replace(ROUTES.auth.login);
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (!isActive) return;

        if (!error && profile?.role && profile.role !== "member") {
          await supabase.auth.signOut();
          router.replace(ROUTES.auth.login);
        }
      } catch {
        // Best-effort background check; the server middleware is the real gate.
      }
    }

    verifyRole();

    return () => {
      isActive = false;
    };
  }, [router]);

  return (
    <ProfileProvider>
      <OffscreenAnimationPauser />
      {useEmbeddedHeader ? null : <AppHeader />}
      {children}
    </ProfileProvider>
  );
}
