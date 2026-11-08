export const CONTENT_BANKS = [
  { id: "news", name: "News & events", group: "Communication", description: "Dashboard articles, announcements and dated events with photos", fields: ["Kind", "Topic", "Article text", "Image URL", "Image description", "Photo credit", "Photo source URL", "Photo license", "Photo license URL", "Published at", "Source", "Source URL", "Link URL", "Link label", "Starts at", "Ends at", "Location", "Price", "Capacity", "Spots left"] },
  { id: "chyron", name: "Chyron", group: "Communication", description: "Quotes, tips, trivia and announcements", fields: ["Message", "Author", "Type", "Link"] },
  { id: "challenges", name: "Challenges", group: "Progress & rewards", description: "Challenge sets, targets and difficulty", fields: ["Category", "Difficulty", "Target", "Completion rule", "Reward reference"] },
  { id: "rewards", name: "Rewards", group: "Progress & rewards", description: "Currency amounts, rarity and item rewards", fields: ["Reward type", "Rarity", "Amount", "Display amount", "Item reference"] },
  { id: "avatar", name: "Avatar items", group: "Appearance", description: "Clothes, accessories, hair and emotes", fields: ["Item type", "Style", "Colors", "Asset URL", "Sapphire unlock cost", "Coin price"] },
  { id: "themes", name: "Themes & backgrounds", group: "Appearance", description: "Avatar environments, effects and calendar backgrounds", fields: ["Surface", "Asset URL", "Topaz unlock cost", "Coin price", "Accent", "Today"] },
  { id: "plans", name: "Plans", group: "Health & training", description: "Training, nutrition, cardio, recovery and PR programs", fields: ["Domain", "Goal", "Duration in weeks", "Activities", "Signals", "Level rewards", "Catalog reference", "Program JSON"] },
  { id: "exercises", name: "Exercises", group: "Health & training", description: "Movements, coaching cues and demonstration videos", fields: ["Category", "Muscle groups", "Equipment", "Instructions", "Video URL", "Image URL", "Pattern", "Level"] },
  { id: "nutrition", name: "Meals & recipes", group: "Health & training", description: "Ingredients, preparation and nutrition", fields: ["Ingredients", "Instructions", "Servings", "Nutrition", "Diet tags", "Image URL", "Category", "Prep time"] },
  { id: "education", name: "Lessons", group: "Education", description: "Courses, technique lessons and learning resources", fields: ["Course", "Lesson content", "Video URL", "Prerequisites"] },
] as const;
export type ContentBankId = typeof CONTENT_BANKS[number]["id"];
export type ContentEntry = { id: string; bank: ContentBankId; title: string; summary: string; fields: Record<string, string>; revision: number; updated_at: string; source_key?: string | null };
