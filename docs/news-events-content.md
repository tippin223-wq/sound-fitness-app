# News & Events

Manage entries in Admin → Content → Communication → News & events. Save a draft, then Publish. Photos are required for publication; use a local asset path or HTTPS photo URL. Published at and event start dates should include a timezone offset. Kind is `world` or `event`; Topic is `community`, `gear`, `nutrition`, `recovery`, or `training`. Events require a location and start date. Link URL currently supports app-relative routes in the dashboard.

The nine original feed items are imported under stable source keys; updating their drafts replaces those same dashboard items after publication. New published entries are added. Local items remain as offline fallback. Existing dates and capacity claims are preserved from the original sample feed and should be reviewed before promoting real events. Photos on those entries are illustrative local assets, not documentary event photos.

Reads use the existing 60-second cache and deduplication, with lazy 64-pixel thumbnails. No polling or additional third-party service was added. The website public content API reads the same shared bank; this does not create a new website news placement.
