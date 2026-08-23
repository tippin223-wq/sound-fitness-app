import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strict Mode double-invokes every mount effect in dev. On this page that
  // means ~50 WebGL scenes are created → disposed → recreated on every load,
  // and each Supabase auth call fires twice, orphaning the auth-token lock into
  // repeated 5s "lock not released" stalls. Production never double-invokes, so
  // turning this off makes dev match prod and removes that dev-only load tax.
  // Re-enable temporarily if you want Strict Mode's effect-cleanup checks.
  reactStrictMode: false,

  // Annotation mode so only components carrying the "use memo" directive are
  // compiled — right now that is just the member dashboard page. The dashboard
  // is one ~46,000-line component, so every state change (including four header
  // carousels that tick on their own timers) rebuilt the whole JSX tree, about
  // 1.1s of work per render. The compiler memoizes those subtrees automatically,
  // which is the same fix as hand-written useMemo without the risk of a missed
  // dependency going stale.
  reactCompiler: {
    compilationMode: "annotation",
  },
};

export default nextConfig;
