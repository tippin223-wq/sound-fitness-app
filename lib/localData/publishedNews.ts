import type { PublishedContent } from "@/lib/contentPublished";
import type { InternalHref } from "@/lib/routes";
import { dashboardNewsPhotos, type DashboardNewsFeed, type DashboardNewsFeedItem, type DashboardNewsFeedTopic } from "./dashboardNewsFeed";
const safePath = (value: string) => /^\/(?!\/)[^\\]*$/.test(value);
const safeImage = (value: string) => safePath(value) || /^https:\/\//.test(value);
export function mergePublishedNews(seed: DashboardNewsFeed, entries: PublishedContent[]): DashboardNewsFeed {
  const items = new Map(seed.items.map(item => [item.id, item]));
  for (const entry of entries) {
    const f = entry.fields || {};
    const topic = f.Topic as DashboardNewsFeedTopic;
    const kind = f.Kind;
    if (!(topic in dashboardNewsPhotos) || !["event", "world"].includes(kind) || !safeImage(f["Image URL"] || "")) continue;
    if (!f["Published at"] || !Number.isFinite(Date.parse(f["Published at"]))) continue;
    if (kind === "event" && (!Number.isFinite(Date.parse(f["Starts at"])) || !f.Location?.trim())) continue;
    const number = (value: string) => /^\d+$/.test(value || "") ? Number(value) : undefined;
    const item: DashboardNewsFeedItem = {
      id: entry.source_key, kind: kind as "event" | "world", topic, tone: "cyan",
      title: entry.title, summary: entry.summary, image: f["Image URL"], imageAlt: f["Image description"] || "Fitness illustration",
      publishedAt: f["Published at"], source: f.Source,
      href: safePath(f["Link URL"] || "") ? f["Link URL"] as InternalHref : undefined, hrefLabel: f["Link label"],
      ...(kind === "event" ? {event: {startsAt: f["Starts at"], endsAt: f["Ends at"] || undefined, location: f.Location, price: f.Price, capacity: number(f.Capacity), spotsLeft: number(f["Spots left"])}} : {}),
    };
    items.set(item.id, item);
  }
  return {...seed, items: [...items.values()]};
}
