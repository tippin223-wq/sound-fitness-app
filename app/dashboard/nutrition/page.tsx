"use client";

import LibraryPageShell, {
  type LibraryItem,
} from "@/components/dashboard/library/LibraryPageShell";

const categories = [
  "High Protein Meals",
  "Quick Meals",
  "Meal Prep",
  "Snacks",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Pre-Workout",
  "Post-Workout",
  "Cut Friendly",
  "Bulk Friendly",
  "General Health",
];

const nutritionItems: LibraryItem[] = [
  {
    id: "chicken-rice-bowl",
    title: "Chicken Rice Bowl",
    category: "Meal Prep",
    description: "A reliable protein-and-carb base that supports training days and easy leftovers.",
    stats: [
      { label: "Calories", value: "620" },
      { label: "Protein", value: "48g" },
      { label: "Carbs", value: "72g" },
      { label: "Prep", value: "25 min" },
    ],
    tags: ["Lunch", "Post-Workout", "High Protein", "General Health"],
    details: ["Chicken breast or thigh", "Rice, peppers, onions", "Add salsa, Greek yogurt, or avocado"],
    recommendation: "Good default when the plan needs protein and carbs without fuss.",
  },
  {
    id: "greek-yogurt-power-bowl",
    title: "Greek Yogurt Power Bowl",
    category: "Breakfast",
    description: "Fast breakfast or snack with protein, fruit, and easy carb control.",
    stats: [
      { label: "Calories", value: "410" },
      { label: "Protein", value: "38g" },
      { label: "Carbs", value: "46g" },
      { label: "Prep", value: "5 min" },
    ],
    tags: ["Quick Meals", "Breakfast", "Cut Friendly", "Snack"],
    details: ["Greek yogurt", "Berries and banana", "Granola or cereal if training soon"],
    recommendation: "High-protein and low friction for consistency days.",
  },
  {
    id: "turkey-taco-skillet",
    title: "Turkey Taco Skillet",
    category: "Dinner",
    description: "Lean protein dinner that can flex between cut-friendly and bulk-friendly portions.",
    stats: [
      { label: "Calories", value: "540" },
      { label: "Protein", value: "44g" },
      { label: "Fats", value: "18g" },
      { label: "Prep", value: "20 min" },
    ],
    tags: ["Dinner", "Meal Prep", "High Protein", "Cut Friendly"],
    details: ["Lean ground turkey", "Beans, corn, peppers", "Serve over rice or lettuce"],
    recommendation: "Good choice when dinner still needs a strong protein anchor.",
  },
  {
    id: "protein-smoothie",
    title: "Protein Smoothie",
    category: "Post-Workout",
    description: "Simple recovery option when appetite or time is low.",
    stats: [
      { label: "Calories", value: "360" },
      { label: "Protein", value: "35g" },
      { label: "Carbs", value: "42g" },
      { label: "Prep", value: "4 min" },
    ],
    tags: ["Quick Meals", "Snack", "Post-Workout", "Bulk Friendly"],
    details: ["Protein powder", "Banana or berries", "Milk or Greek yogurt for extra calories"],
  },
  {
    id: "egg-white-breakfast-wrap",
    title: "Egg White Breakfast Wrap",
    category: "Cut Friendly",
    description: "Lean, portable breakfast with enough protein to start the day well.",
    stats: [
      { label: "Calories", value: "390" },
      { label: "Protein", value: "34g" },
      { label: "Fats", value: "10g" },
      { label: "Prep", value: "10 min" },
    ],
    tags: ["Breakfast", "High Protein", "Quick Meals", "Cut Friendly"],
    details: ["Egg whites plus whole egg", "Low-carb or standard tortilla", "Spinach, peppers, salsa"],
  },
  {
    id: "peanut-butter-oats",
    title: "Peanut Butter Performance Oats",
    category: "Pre-Workout",
    description: "Carb-forward meal for higher-output sessions or gaining phases.",
    stats: [
      { label: "Calories", value: "690" },
      { label: "Protein", value: "36g" },
      { label: "Carbs", value: "88g" },
      { label: "Prep", value: "8 min" },
    ],
    tags: ["Bulk Friendly", "Breakfast", "Pre-Workout", "Performance"],
    details: ["Oats, protein powder, peanut butter", "Add banana before harder sessions", "Scale portions to match goal mode"],
  },
];

export default function NutritionLibraryPage() {
  return (
    <LibraryPageShell
      actionLabel="Add to Nutrition Plan"
      categories={categories}
      heroEyebrow="Nutrition Library"
      heroMetrics={[
        { label: "Items", value: String(nutritionItems.length), helper: "Meals and snack templates" },
        { label: "Protein", value: "Plan-led", helper: "Targets read from Profile/Goals" },
        { label: "Goal Fit", value: "Cut / Bulk", helper: "Cards expose body-composition fit" },
        { label: "Storage", value: "Local", helper: "Saved to soundFitnessNutritionLibrary" },
      ]}
      items={nutritionItems}
      libraryId="nutrition"
      planStorageKey="soundFitnessNutritionPlan"
      storageKey="soundFitnessNutritionLibrary"
      subtitle="Meals, grocery ideas, protein targets, and body-composition support that feed the plan."
      title="🥗 Nutrition Library"
    />
  );
}
