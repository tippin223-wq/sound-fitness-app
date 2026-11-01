# Weekly rewards activation

The account-owned weekly rewards migration is `20261101160000_weekly_reward_fulfillment.sql`. It was applied to the Sound Fitness app Supabase project on 2026-11-01 after both earlier weekly-spin migrations.

Completed workouts with recorded sets count once per Pacific calendar day. A Monday–Sunday week with at least one qualifying day earns one spin after the week closes. Unclaimed weeks accumulate from 2026-10-26. Each claim uses that week's distinct-day count and the displayed rarity odds.

The server selects and atomically records the award and its currency credits. The account/week primary key and per-account transaction lock prevent rerolls and duplicate credits. A failed credit rolls the claim back. An unread award receipt survives reload and is acknowledged separately from the credit.

Live prizes: coins, bolts, gems and reward chests, using the amounts in `lib/weeklyRewardRarity.ts`. Clothing, accessories, effects, streak shields and bonus challenges are excluded from the live draw until usable fulfillment exists. They remain dimmed and labeled coming soon. There are no privileged tester emails, infinite spins, client-selected prizes or test-day controls in the production UI.

Gem types have distinct purposes, independent of prize rarity: Sapphire unlocks avatar items; Topaz unlocks app visuals; Ruby unlocks future progression activities; Emerald is saved toward real Sound Fitness services. Per gem award, type chances are Sapphire 45%, Topaz 30%, Ruby 20%, Emerald 5%. Service redemption, purchases and bracket entries are separate future flows; this release only credits earned currency.

`weekly_reward_credits` is immutable to members and readable only by its owner. The header reads verified ledger balances; editable planning/profile caches are never imported as currency. Existing `member_rewards` and profile records are preserved.

Verification: PostgreSQL-compatible integration tests cover eligibility, Pacific week/DST boundaries, saved weeks, idempotent claims, account isolation, currency/chest amounts, unread receipt recovery and atomic rollback on credit failure. Live checks confirmed status readiness, six balance fields, four enabled reward types, RLS enabled, no direct member minting and no anonymous claim/internal eligibility access. No real member spin was consumed during verification.

Release prerequisite: Next.js and eslint-config-next were patched from 16.4.0 to 16.4.3 because the original build reported the October security advisories. See https://nextjs.org/blog/nextjs-security-update-october-14-2026.

The isolated release passed 4 weekly-reward integration/catalog tests and 10 focused planning reward/authentication checks. The broader planning suite has old date-sensitive plan fixtures outside its current four-week creation window; the Sessions plan-summary failure was reproduced unchanged on release base e0cebd1. Those fixtures were not changed as part of this release.
