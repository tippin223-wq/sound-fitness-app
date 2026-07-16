# App Map

Sound Fitness is a Next.js App Router app with member, admin, coach, onboarding, nutrition, stats, performance, learning, and soundworld areas.

## Stack

- Next.js `16.2.4`
- React `19.2.4`
- Tailwind CSS `4`
- Supabase auth/data client
- Stripe checkout/webhook integration
- Three.js and 3D dashboard UI components
- Lucide React icons

## Key Source Areas

- `app/`: route files, layouts, and page-level experiences
- `components/`: shared UI, marketing, auth, dashboard, onboarding, anatomy
- `components/dashboard/`: member dashboard shell, 3D assets, dashboard navigation and cards
- `lib/routes.ts`: centralized route constants
- `lib/supabaseClient.ts`: Supabase browser client and user helper
- `lib/profile-storage.ts`: profile-related local/storage helpers
- `lib/training/`: normalized exercise catalog and movement intelligence
- `lib/exercise-system/`: exercise catalog, matching, progression, aliases, modifiers
- `lib/localData/`: local workout and builder data

## Important Behavior

- `components/dashboard/MemberDashboardShell.tsx` wraps protected member dashboard pages.
- The member shell checks Supabase auth and redirects unauthenticated users to `/login`.
- The shell hides the shared `AppHeader` on embedded dashboard pages such as `/dashboard`, `/dashboard/goals`, `/dashboard/sessions`, `/dashboard/profile`, `/dashboard/exercise-library`, and `/dashboard/workout-builder/exercise-library`.
- `ROUTES.member` is an alias of dashboard routes.

## Verification Habit

For visual edits, use the running app at `http://localhost:3000`, verify the affected route in the browser, and check console errors.
