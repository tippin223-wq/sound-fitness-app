export const APP_ADMIN_ROWS: Array<{ title: string; icon: string; helper: string; completion: number; logo?: string; emoji?: string }> = [
  { title: "App Overview", icon: "dashboard", helper: "App accounts, products, billing, and integration health.", completion: 0 },
  { title: "App Users", icon: "profile", helper: "Verified app enrollment and activity, without the website lead journey.", completion: 0 },
  { title: "Subscriptions & Sales", icon: "stats", helper: "App plans, subscription status, and paid app checkouts.", completion: 0 },
  { title: "App Products", icon: "packages", helper: "Training, nutrition, recovery, performance, education, Sound World, and Angles.", completion: 0 },
  { title: "Calendar", icon: "calendar", helper: "Your app calendar and scheduled activities.", completion: 0 },
  { title: "Messages & Support", icon: "messages", helper: "App conversations, coaching reviews, and support.", completion: 0 },
  { title: "Content", icon: "soundworld", helper: "Exercise, program, recipe, lesson, and reward libraries.", completion: 0 },
  { title: "Announcements", icon: "feed", helper: "App onboarding, product updates, and member announcements.", completion: 0 },
  { title: "App Settings", icon: "settings", helper: "Account security, product connections, and app data controls.", completion: 0 },
];

export const APP_ADMIN_PRODUCTS = [
  { id: "training", name: "Training", area: "Training", description: "Plans, workout building, exercise tracking, and remote programming.", href: "/dashboard/sessions", status: "Member area available" },
  { id: "sound-kitchen", name: "Sound Kitchen Menu", area: "Nutrition", description: "Recipes, meals, meal prep, and groceries. Companion connection is planned.", href: "/nutrition", status: "Nutrition area available · companion planned" },
  { id: "steady", name: "Steady", area: "Recovery", description: "Balance, breathing, and motion training. Recovery tools remain available in the main app.", href: "/dashboard/recovery", status: "Companion connection planned" },
  { id: "run-tracker", name: "Run Tracker", area: "Performance", description: "Running companion; its account and activity connection still needs verification.", href: "/performance", status: "Companion connection planned" },
  { id: "graduate", name: "Graduate", area: "Education", description: "Lessons, technique education, and coach development.", href: "/learning", status: "Learning area available · companion planned" },
  { id: "soundworld-arcade", name: "Sound World Arcade", area: "Sound World", description: "Challenges, achievements, rewards, and movement games.", href: "/soundworld", status: "Sound World area available · companion planned" },
  { id: "angles", name: "Angles", area: "Training + Performance", description: "Camera-guided movement assessment and exercise feedback, with shared-account enrollment.", href: "/angles", status: "Browser app available · paid bundles pending" },
] as const;

export type AppAdminUser = { id: string; name: string; email: string; role: string; products: string[]; lastActivity: string | null; access: string };
export type AppAdminBilling = { planId: string; active: number; trialing: number; pastDue: number; canceled: number; paidCheckouts: number; checkoutTotals: Record<string, number> };
export type AppAdminSnapshot = {
  checkedAt: string;
  users: { records: AppAdminUser[]; issues: string[]; partial: boolean };
  billing: { plans: AppAdminBilling[]; issues: string[]; partial: boolean };
};
