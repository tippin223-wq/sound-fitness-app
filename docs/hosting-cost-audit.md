# Hosting CPU audit — November 7, 2026

## Confirmed live state

- Both `thesoundfitness.app` and `thesoundfitness.com` returned HTTP 402 / `DEPLOYMENT_DISABLED`.
- The Vercel team reported an active Hobby subscription with a soft block:
  `FAIR_USE_LIMITS_EXCEEDED`, resource `fluidCpuDuration`.
- The production app deployment `dpl_3Y22NeWuaNAWuicXvP6MC6HRfQmN` and website deployment
  `dpl_7i1Qbi4B2TApQedwStEdJPoaRczW` remained READY. This is not evidence of a build failure.
- Exact CPU attribution remains unavailable: the billing charges API returned
  `Plan not found`; the metrics query returned `payment_required` and explicitly
  required Observability Plus. No plan, add-on, firewall, spend limit, or billing
  settings were changed.

## Verified avoidable work fixed locally in the app

1. The proxy matcher previously admitted public video, model and WASM files.
   It now matches only the six existing protected page trees. Comparing all
   184 current public files with Next's actual matcher: 31 matched before,
   zero match now. This removes unnecessary proxy invocations for those files;
   it does not measure their historical CPU cost.
2. Dense dashboard/profile/header links now use `IntentLink`, following Next's
   documented intent-prefetch pattern. They do not prefetch just because they
   enter the viewport; hover or keyboard focus restores normal prefetching.
   Explicit caller prefetch settings and event handlers are preserved. The
   affected source contains 75 Link instances, not necessarily 75 distinct
   destinations or requests per visit.

Authentication checks are retained for protected navigation AND prefetches.
Private account responses have not been placed in a public cache. No changes
were made to rewards, bookings, messages, payment behavior, or backend identity.

## Website inspection

The website checkout at `C:/Users/josep/01_Business/Sound Fitness/Website/SoundFitness-EasyWP`
already limits its proxy to `/` and `/client-hub/:path*`. Its live-chat code
polls and renews presence every 10 seconds only while chat is open (up to
720 requests/hour per continuously visible open chat). This is a contributor
to investigate, not a confirmed culprit; changing presence cadence without
checking its server TTL could break live availability. Its uptime workflow
checks two pages every five minutes. No website files were changed.

## Validation and limits

- `node --test scripts/test-hosting-costs.cjs`: three tests passed, covering
  real Next path matching, anonymous/private-prefetch redirects, and intent
  link behavior including explicit overrides and keyboard focus.
- `npx tsc --noEmit --pretty false`: passed.
- `npx eslint components/IntentLink.tsx proxy.ts`: passed.
- Isolated production `next build`: passed; 142 static pages generated. Main
  dashboard pages are static, not regenerated for every request.
- Built app smoke test with local auth bypass explicitly disabled: homepage
  and login returned 200; anonymous profile navigation and RSC prefetch returned
  307 to the public entry; anonymous admin navigation returned 307 to admin
  login; avatar GLB returned 200. Temporary port 3109 server was stopped.
- Production prefetch behavior cannot be measured with `next dev`; Next only
  automatically prefetches in production. Savings require a production release
  and a before/after observation window once hosting is available.
- These changes do not lift Vercel's existing account restriction and have
  not been deployed. No estimated bill reduction is presented as measured.

## Next attribution check when data access is available

Use the existing team's Usage dashboard before purchasing extra observability.
Compare project CPU, function invocations, memory and traffic for the same dates.
If route metrics are already included in the selected plan, run:

```powershell
vercel metrics vercel.function_invocation.function_cpu_time_ms --all --scope tippin223-wqs-projects --aggregation sum --group-by project_id --since 7d --format json
vercel metrics vercel.function_invocation.function_cpu_time_ms --project sound-fitness-app-kr77 --scope tippin223-wqs-projects --aggregation sum --group-by route --since 7d --format json
```

Then inspect the leading route's request volume, CPU per invocation, status
codes and user-agent distribution before attributing the outage to users,
bots, polling, image processing or server rendering. Do not enable a paid
add-on simply to run these commands.
