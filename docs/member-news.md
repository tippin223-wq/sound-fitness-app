# Member News & Events

- The dashboard has 60 original educational briefs: ten each in Training, Nutrition, Health & Recovery, Fitness Tech, Sports and Community. These are not presented as newly discovered research. Events require confirmed business records.
- `lib/localData/weeklyNews.ts` combines the brief library with article-specific images. `public/news/article-photos.json` records the 52 new photos, original source, credit, license and checksum. Eight already distinct images remain. All 60 displayed image paths and image checksums are unique. New images were visually reviewed and checked against the app's 77 other image assets. Serve local files; do not fetch photo searches for member visits.
- The main featured slot has one story per topic in All, and up to five stories within a topic. Its set is excluded from the grid below. Blips support click, wheel and Left/Right; arrows wrap. The slot retains its height. All sixty stories remain reachable without duplicate article cards.
- Titles open an article reader. Admin's optional `Article text` field supports longer articles; otherwise the entire original brief is shown, with its primary source link. Comments follow article text. Photo attribution is available through the photo's info icon.
- Publishing uses Admin Content > News & events. Credits are part of the draft/publication fields. The import script is read-only unless `--apply` is passed and preserves existing records. Editing an imported story retains its discussion identity.

## Account feedback activation

`20261107210000_news_discussions.sql` stages registered article IDs, one reaction per member/article, authenticated comment reads/writes, ownership-protected comment deletion and a five-comments-per-minute limit. Publishing registers new article discussion IDs. One batched reaction snapshot is loaded per feed; comments load only when opening an article. Failed writes do not show success or discard typed comment text.

**Not applied to the shared database as of November 7, 2026.** A read-only check returned HTTP 404 / PGRST202 for `member_news_comments`. Live reaction/comment saving remains blocked until the migration is applied through authorized database access. Do not claim it is enabled or replace missing shared data with fake counts. No production deployment was performed for these edits.

Verification: `node --test scripts/test-news-feed.cjs scripts/test-news-discussions.mjs scripts/test-content-publications.mjs scripts/test-content-banks.mjs`; TypeScript; focused ESLint; browser carousel/keyboard/wheel, no duplicates, phone layout and reader checks. Screenshots are in `test-results/news-feature-carousel-feedback.jpg`, `news-feature-mobile.jpg` and `news-article-comments-bottom.jpg`.
