import type { PublishedContent } from "@/lib/contentPublished";
import type { InternalHref } from "@/lib/routes";
import { dashboardNewsPhotos, type DashboardNewsFeed, type DashboardNewsFeedItem, type DashboardNewsFeedTopic } from "./dashboardNewsFeed";
const safePath = (value: string) => /^\/(?!\/)[^\\]*$/.test(value);
const safeImage = (value: string) => safePath(value) || /^https:\/\//.test(value);
export function mergePublishedNews(seed: DashboardNewsFeed, entries: PublishedContent[]): DashboardNewsFeed {
  const items = new Map(seed.items.map(item => [item.id, item]));
  for (const entry of entries) {
    // Retired demo headlines and September sample events are not real announcements.
    if (["evt-waterfront-5k", "evt-mobility-clinic", "evt-deadlift-day", "evt-fall-open-house", "world-strength-longevity", "world-shoe-rules", "world-wearable-recovery", "world-heat-guidance", "world-creatine-cognition"].includes(entry.source_key) && (entry.fields?.["Published at"] || "") < "2026-11-07") continue;
    const f = entry.fields || {};
    const topic = f.Topic as DashboardNewsFeedTopic;
    const kind = f.Kind;
    if (!(topic in dashboardNewsPhotos) || !["event", "world"].includes(kind) || !safeImage(f["Image URL"] || "")) continue;
    if (!f["Published at"] || !Number.isFinite(Date.parse(f["Published at"]))) continue;
    if (kind === "event" && (!Number.isFinite(Date.parse(f["Starts at"])) || !f.Location?.trim())) continue;
    const number = (value: string) => /^\d+$/.test(value || "") ? Number(value) : undefined;
    // A published revision of a seeded story retains its reaction/comment identity.
    const original = seed.items.find(item => item.id === entry.source_key || item.title === entry.title);
    const item: DashboardNewsFeedItem = {
      id: original?.id ?? entry.source_key, kind: kind as "event" | "world", topic, tone: "cyan",
      title: entry.title, summary: entry.summary, body: f["Article text"]?.trim() || undefined, image: f["Image URL"], imageAlt: f["Image description"] || "Fitness illustration",
      publishedAt: f["Published at"], source: f.Source,
      sourceUrl: /^https:\/\//.test(f["Source URL"] || "") ? f["Source URL"] : undefined,
      photoCredit: f["Photo credit"] && /^https:\/\//.test(f["Photo source URL"] || "") && /^https:\/\//.test(f["Photo license URL"] || "") ? { author: f["Photo credit"], sourceUrl: f["Photo source URL"], license: f["Photo license"] || "Photo license", licenseUrl: f["Photo license URL"] } : undefined,
      href: safePath(f["Link URL"] || "") ? f["Link URL"] as InternalHref : undefined, hrefLabel: f["Link label"],
      ...(kind === "event" ? {event: {startsAt: f["Starts at"], endsAt: f["Ends at"] || undefined, location: f.Location, price: f.Price, capacity: number(f.Capacity), spotsLeft: number(f["Spots left"])}} : {}),
    };
    for (const [id, previous] of items) if (previous.title === item.title) items.delete(id);
    items.set(item.id, item);
  }
  return {...seed, items: [...items.values()]};
}
