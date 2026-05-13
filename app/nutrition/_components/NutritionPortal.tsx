import Link from "next/link";
import type { ReactNode } from "react";

export type NutritionModuleId =
  | "meals"
  | "meals-builder"
  | "meals-history"
  | "meals-templates"
  | "macros"
  | "calories"
  | "hydration"
  | "recipes"
  | "grocery"
  | "supplements"
  | "meal-plan"
  | "shopping-list"
  | "recommendations"
  | "insights"
  | "progress"
  | "streaks"
  | "goals"
  | "library"
  | "library-recipes"
  | "library-foods"
  | "library-supplements";

type PortalLink = {
  href: string;
  label: string;
  helper: string;
};

type NutritionModule = {
  actions: PortalLink[];
  backHref: string;
  breadcrumb: string[];
  cards: Array<{
    title: string;
    helper: string;
    points: string[];
  }>;
  eyebrow: string;
  metrics: Array<{ label: string; value: string; helper: string }>;
  related: PortalLink[];
  subtitle: string;
  title: string;
};

export const nutritionPortalGroups: Array<{
  title: string;
  links: PortalLink[];
}> = [
  {
    title: "Meals",
    links: [
      {
        label: "Meals",
        href: "/nutrition/meals",
        helper: "Today, timing, favorites, and schedule.",
      },
      {
        label: "Meal Builder",
        href: "/nutrition/meals/builder",
        helper: "Build meals from foods and macro targets.",
      },
      {
        label: "Meal History",
        href: "/nutrition/meals/history",
        helper: "Review what you logged.",
      },
      {
        label: "Templates",
        href: "/nutrition/meals/templates",
        helper: "Reusable meal structures.",
      },
    ],
  },
  {
    title: "Tracking",
    links: [
      {
        label: "Macros",
        href: "/nutrition/macros",
        helper: "Protein, carbs, fats, and targets.",
      },
      {
        label: "Calories",
        href: "/nutrition/calories",
        helper: "Energy target and daily balance.",
      },
      {
        label: "Hydration",
        href: "/nutrition/hydration",
        helper: "Water, electrolytes, and habits.",
      },
    ],
  },
  {
    title: "Food",
    links: [
      {
        label: "Recipes",
        href: "/nutrition/recipes",
        helper: "Meals and cooking ideas.",
      },
      {
        label: "Grocery",
        href: "/nutrition/grocery",
        helper: "Shopping ideas and food staples.",
      },
      {
        label: "Supplements",
        href: "/nutrition/supplements",
        helper: "Supplement notes and future stack builder.",
      },
    ],
  },
  {
    title: "Planning",
    links: [
      {
        label: "Meal Plan",
        href: "/nutrition/meal-plan",
        helper: "Weekly meal direction.",
      },
      {
        label: "Shopping List",
        href: "/nutrition/shopping-list",
        helper: "Plan-to-store checklist.",
      },
    ],
  },
  {
    title: "AI + Progress",
    links: [
      {
        label: "Recommendations",
        href: "/nutrition/recommendations",
        helper: "Suggested meals and behavior nudges.",
      },
      {
        label: "Insights",
        href: "/nutrition/insights",
        helper: "Patterns and next actions.",
      },
      {
        label: "Progress",
        href: "/nutrition/progress",
        helper: "Body, consistency, and goal trends.",
      },
      {
        label: "Streaks",
        href: "/nutrition/streaks",
        helper: "Consistency and habit momentum.",
      },
      {
        label: "Goals",
        href: "/nutrition/goals",
        helper: "Nutrition outcomes and targets.",
      },
    ],
  },
  {
    title: "Libraries",
    links: [
      {
        label: "Library",
        href: "/nutrition/library",
        helper: "Searchable nutrition resource hub.",
      },
      {
        label: "Recipe Library",
        href: "/nutrition/library/recipes",
        helper: "Recipes by goal and prep style.",
      },
      {
        label: "Food Library",
        href: "/nutrition/library/foods",
        helper: "Foods, macros, and tags.",
      },
      {
        label: "Supplement Library",
        href: "/nutrition/library/supplements",
        helper: "Supplement reference cards.",
      },
    ],
  },
];

const relatedDefaults: PortalLink[] = [
  {
    label: "Meal Builder",
    href: "/nutrition/meals/builder",
    helper: "Build the next meal from your target.",
  },
  {
    label: "Macros",
    href: "/nutrition/macros",
    helper: "Check protein, carbs, and fats.",
  },
  {
    label: "Recommendations",
    href: "/nutrition/recommendations",
    helper: "Let the system suggest the next action.",
  },
];

const baseMetrics = [
  { label: "Status", value: "Ready", helper: "Future data will personalize this." },
  { label: "Source", value: "Local", helper: "Built for localStorage and API sync later." },
  { label: "Mode", value: "Modular", helper: "Can feed plans, goals, and stats." },
];

export const nutritionModules: Record<NutritionModuleId, NutritionModule> = {
  meals: {
    eyebrow: "Meals System",
    title: "Meals",
    subtitle: "Plan, log, and time meals around training, recovery, and body-composition goals.",
    backHref: "/nutrition",
    breadcrumb: ["Nutrition", "Meals"],
    actions: [
      { label: "Build Meal", href: "/nutrition/meals/builder", helper: "Create a meal." },
      { label: "View Templates", href: "/nutrition/meals/templates", helper: "Use a proven structure." },
    ],
    metrics: [
      { label: "Today", value: "3 meals", helper: "Placeholder meal schedule." },
      { label: "Protein", value: "124 g", helper: "Example target progress." },
      { label: "Timing", value: "2 windows", helper: "Pre/post workout ready." },
    ],
    cards: [
      {
        title: "Today's Meals",
        helper: "A future meal log will populate this with real entries.",
        points: ["Breakfast: protein base", "Lunch: performance bowl", "Dinner: recovery plate"],
      },
      {
        title: "Meal Timing",
        helper: "Connect meals to sessions and recovery windows.",
        points: ["Pre-workout fuel", "Post-workout protein", "Evening hydration check"],
      },
      {
        title: "Favorites",
        helper: "Favorite meals will be available for quick reuse.",
        points: ["High protein bowl", "Greek yogurt stack", "Simple dinner template"],
      },
    ],
    related: relatedDefaults,
  },
  "meals-builder": {
    eyebrow: "Meal Builder",
    title: "Advanced Meal Builder",
    subtitle: "Assemble foods, servings, macros, and meal sections before sending to a meal plan.",
    backHref: "/nutrition/meals",
    breadcrumb: ["Nutrition", "Meals", "Builder"],
    actions: [
      { label: "Open Food Library", href: "/nutrition/library/foods", helper: "Search foods." },
      { label: "Use Template", href: "/nutrition/meals/templates", helper: "Start faster." },
    ],
    metrics: [
      { label: "Calories", value: "620", helper: "Preview estimate." },
      { label: "Protein", value: "42 g", helper: "Meal target." },
      { label: "Sections", value: "3", helper: "Protein, carb, color." },
    ],
    cards: [
      {
        title: "Food Search",
        helper: "Future search can connect food databases and saved staples.",
        points: ["Search by name", "Filter by protein", "Add serving controls"],
      },
      {
        title: "Macro Preview",
        helper: "Live preview area for calories, protein, carbs, and fats.",
        points: ["Calories meter", "Protein ring", "Carb/fat balance"],
      },
      {
        title: "Meal Sections",
        helper: "Prepared for drag/drop sections when that interaction is added.",
        points: ["Main protein", "Training carb", "Recovery add-on"],
      },
    ],
    related: [
      { label: "Macros", href: "/nutrition/macros", helper: "Review targets." },
      { label: "Food Library", href: "/nutrition/library/foods", helper: "Browse foods." },
      { label: "Meal Plan", href: "/nutrition/meal-plan", helper: "Place this meal." },
    ],
  },
  "meals-history": {
    eyebrow: "Meal History",
    title: "Meal History",
    subtitle: "Review logged meals, consistency patterns, and meals that worked well.",
    backHref: "/nutrition/meals",
    breadcrumb: ["Nutrition", "Meals", "History"],
    actions: [
      { label: "Log Meal", href: "/nutrition/meals/builder", helper: "Add a new entry." },
      { label: "View Progress", href: "/nutrition/progress", helper: "See trends." },
    ],
    metrics: baseMetrics,
    cards: [
      {
        title: "Recent Meals",
        helper: "Placeholder feed for future logged meals.",
        points: ["Chicken rice bowl", "Protein smoothie", "Turkey taco skillet"],
      },
      {
        title: "Consistency",
        helper: "Track which days hit the minimum meal structure.",
        points: ["5-day protein streak", "2 missed hydration checks", "Best prep day: Sunday"],
      },
    ],
    related: relatedDefaults,
  },
  "meals-templates": {
    eyebrow: "Meal Templates",
    title: "Meal Templates",
    subtitle: "Reusable high-protein, cutting, bulking, athletic, and recovery meal structures.",
    backHref: "/nutrition/meals",
    breadcrumb: ["Nutrition", "Meals", "Templates"],
    actions: [
      { label: "Build From Template", href: "/nutrition/meals/builder", helper: "Customize a template." },
      { label: "Open Recipes", href: "/nutrition/recipes", helper: "Find meals." },
    ],
    metrics: [
      { label: "Templates", value: "12", helper: "Starter placeholders." },
      { label: "Goal Fit", value: "Cut/Bulk", helper: "Organized by outcome." },
      { label: "Prep", value: "Quick", helper: "Built for repeatability." },
    ],
    cards: [
      {
        title: "High Protein",
        helper: "Meal structures that make protein easy.",
        points: ["Lean protein + carb + color", "Greek yogurt stack", "Egg wrap build"],
      },
      {
        title: "Cutting",
        helper: "High-volume meals with protein priority.",
        points: ["Lower-calorie bowl", "Lean dinner plate", "Snack guardrails"],
      },
      {
        title: "Performance",
        helper: "Fuel higher output days.",
        points: ["Pre-workout carb", "Post-session recovery", "Hydration add-on"],
      },
    ],
    related: relatedDefaults,
  },
  macros: {
    eyebrow: "Macros + Tracking",
    title: "Macros",
    subtitle: "Track protein, carbs, fats, and macro distribution with visual target cards.",
    backHref: "/nutrition",
    breadcrumb: ["Nutrition", "Macros"],
    actions: [
      { label: "Build Meal", href: "/nutrition/meals/builder", helper: "Hit target." },
      { label: "Set Goals", href: "/nutrition/goals", helper: "Edit targets." },
    ],
    metrics: [
      { label: "Protein", value: "82%", helper: "Progress ring placeholder." },
      { label: "Carbs", value: "54%", helper: "Training fuel." },
      { label: "Fats", value: "38%", helper: "Daily balance." },
    ],
    cards: [
      {
        title: "Protein Ring",
        helper: "Future ring tracks daily protein against profile goals.",
        points: ["Target", "Logged", "Remaining"],
      },
      {
        title: "Macro Breakdown",
        helper: "Visual split for protein, carbs, and fats.",
        points: ["Daily mix", "Training day preset", "Rest day preset"],
      },
    ],
    related: relatedDefaults,
  },
  calories: {
    eyebrow: "Calories",
    title: "Calories",
    subtitle: "Show calories remaining, maintenance direction, and goal-mode guidance.",
    backHref: "/nutrition",
    breadcrumb: ["Nutrition", "Calories"],
    actions: [
      { label: "Log Meal", href: "/nutrition/meals/builder", helper: "Update today." },
      { label: "View Goals", href: "/nutrition/goals", helper: "Adjust target." },
    ],
    metrics: [
      { label: "Remaining", value: "640", helper: "Example daily balance." },
      { label: "Goal", value: "Cut", helper: "Profile-driven later." },
      { label: "Pace", value: "Steady", helper: "No crash dieting." },
    ],
    cards: [
      {
        title: "Calorie Meter",
        helper: "Futuristic progress meter for daily intake.",
        points: ["Target", "Logged", "Remaining"],
      },
      {
        title: "Energy Strategy",
        helper: "Connect calories to training volume and recovery.",
        points: ["Training days", "Rest days", "Recovery warnings"],
      },
    ],
    related: relatedDefaults,
  },
  hydration: {
    eyebrow: "Hydration",
    title: "Hydration",
    subtitle: "Track water, electrolytes, and hydration behavior around training.",
    backHref: "/nutrition",
    breadcrumb: ["Nutrition", "Hydration"],
    actions: [
      { label: "Add Water", href: "/nutrition/hydration", helper: "Quick log placeholder." },
      { label: "View Streaks", href: "/nutrition/streaks", helper: "Consistency." },
    ],
    metrics: [
      { label: "Water", value: "64 oz", helper: "Example logged today." },
      { label: "Target", value: "96 oz", helper: "Future profile target." },
      { label: "Status", value: "Low", helper: "Hydration nudge." },
    ],
    cards: [
      {
        title: "Hydration Bar",
        helper: "Progress bar for daily water intake.",
        points: ["Morning baseline", "Training bottle", "Evening check"],
      },
      {
        title: "Electrolyte Notes",
        helper: "Future support for sweat-heavy sessions.",
        points: ["Long sessions", "Hot days", "Conditioning blocks"],
      },
    ],
    related: [
      { label: "Recommendations", href: "/nutrition/recommendations", helper: "Hydration suggestions." },
      { label: "Streaks", href: "/nutrition/streaks", helper: "Habit momentum." },
      { label: "Progress", href: "/nutrition/progress", helper: "Long-term consistency." },
    ],
  },
  recipes: {
    eyebrow: "Recipes + Food",
    title: "Recipes",
    subtitle: "Premium recipe cards for quick meals, meal prep, recovery, and performance fueling.",
    backHref: "/nutrition",
    breadcrumb: ["Nutrition", "Recipes"],
    actions: [
      { label: "Recipe Library", href: "/nutrition/library/recipes", helper: "Browse recipes." },
      { label: "Shopping List", href: "/nutrition/shopping-list", helper: "Send ingredients." },
    ],
    metrics: [
      { label: "Recipes", value: "24", helper: "Starter card structure." },
      { label: "Protein", value: "High", helper: "Filter ready." },
      { label: "Prep", value: "Fast", helper: "Built for real life." },
    ],
    cards: [
      {
        title: "Performance Meals",
        helper: "Carb and protein meals for training days.",
        points: ["Chicken rice bowl", "Turkey pasta", "Smoothie stack"],
      },
      {
        title: "Cut Friendly",
        helper: "High-satiety recipes for body composition.",
        points: ["Lean protein bowl", "Soup + protein", "Snack plate"],
      },
    ],
    related: [
      { label: "Recipe Library", href: "/nutrition/library/recipes", helper: "Search recipes." },
      { label: "Grocery", href: "/nutrition/grocery", helper: "Plan ingredients." },
      { label: "Meal Plan", href: "/nutrition/meal-plan", helper: "Schedule recipes." },
    ],
  },
  grocery: {
    eyebrow: "Grocery",
    title: "Grocery Builder",
    subtitle: "Turn goals and meal templates into grocery categories and shopping strategy.",
    backHref: "/nutrition",
    breadcrumb: ["Nutrition", "Grocery"],
    actions: [
      { label: "Shopping List", href: "/nutrition/shopping-list", helper: "Build list." },
      { label: "Food Library", href: "/nutrition/library/foods", helper: "Browse staples." },
    ],
    metrics: [
      { label: "Staples", value: "36", helper: "Future pantry system." },
      { label: "Protein", value: "8 picks", helper: "Starter category." },
      { label: "Budget", value: "TBD", helper: "Future estimate." },
    ],
    cards: [
      {
        title: "Grocery Categories",
        helper: "Organize the store around repeatable nutrition behaviors.",
        points: ["Proteins", "Training carbs", "Produce", "Convenience backups"],
      },
      {
        title: "Grocery Builder",
        helper: "Future flow can generate a list from your meal plan.",
        points: ["Select meals", "Merge ingredients", "Check pantry"],
      },
    ],
    related: relatedDefaults,
  },
  supplements: {
    eyebrow: "Supplements",
    title: "Supplements",
    subtitle: "A conservative supplement reference area for future tracking and notes.",
    backHref: "/nutrition",
    breadcrumb: ["Nutrition", "Supplements"],
    actions: [
      { label: "Supplement Library", href: "/nutrition/library/supplements", helper: "Browse references." },
      { label: "Insights", href: "/nutrition/insights", helper: "Review patterns." },
    ],
    metrics: [
      { label: "Stack", value: "Optional", helper: "No medical claims." },
      { label: "Focus", value: "Basics", helper: "Protein, hydration, consistency first." },
      { label: "Status", value: "Reference", helper: "Future tracker." },
    ],
    cards: [
      {
        title: "Supplement Notes",
        helper: "Designed as educational support, not medical advice.",
        points: ["Protein support", "Creatine reference", "Electrolyte notes"],
      },
      {
        title: "Safety Placeholder",
        helper: "Future version can include contraindication prompts.",
        points: ["Ask a professional", "Check labels", "Track tolerance"],
      },
    ],
    related: relatedDefaults,
  },
  "meal-plan": {
    eyebrow: "Planning",
    title: "Meal Plan",
    subtitle: "Organize meals across the week and connect nutrition to training days.",
    backHref: "/nutrition",
    breadcrumb: ["Nutrition", "Meal Plan"],
    actions: [
      { label: "Build Meal", href: "/nutrition/meals/builder", helper: "Add a meal." },
      { label: "Shopping List", href: "/nutrition/shopping-list", helper: "Send to list." },
    ],
    metrics: [
      { label: "Week", value: "7 days", helper: "Planning grid." },
      { label: "Meals", value: "21 slots", helper: "Starter structure." },
      { label: "Prep", value: "2 blocks", helper: "Batch strategy." },
    ],
    cards: [
      {
        title: "Weekly Plan Grid",
        helper: "Future drag/drop schedule for meals.",
        points: ["Breakfast", "Lunch", "Dinner", "Snack slots"],
      },
      {
        title: "Training-Day Fuel",
        helper: "Connect meals to sessions from the app calendar later.",
        points: ["Pre-workout", "Post-workout", "Recovery dinner"],
      },
    ],
    related: relatedDefaults,
  },
  "shopping-list": {
    eyebrow: "Shopping List",
    title: "Shopping List",
    subtitle: "A future-ready checklist for groceries generated from plans and recipes.",
    backHref: "/nutrition",
    breadcrumb: ["Nutrition", "Shopping List"],
    actions: [
      { label: "Open Grocery", href: "/nutrition/grocery", helper: "Add staples." },
      { label: "Open Recipes", href: "/nutrition/recipes", helper: "Add ingredients." },
    ],
    metrics: [
      { label: "Items", value: "18", helper: "Placeholder list." },
      { label: "Sections", value: "5", helper: "Store layout." },
      { label: "Prep", value: "Sunday", helper: "Suggested prep day." },
    ],
    cards: [
      {
        title: "Store Sections",
        helper: "Keep lists scannable and low-friction.",
        points: ["Protein", "Produce", "Carbs", "Dairy", "Backup meals"],
      },
      {
        title: "Smart Merge",
        helper: "Future version can merge duplicate ingredients across recipes.",
        points: ["Combine quantities", "Check pantry", "Mark purchased"],
      },
    ],
    related: relatedDefaults,
  },
  recommendations: {
    eyebrow: "AI + Insights",
    title: "Recommendations",
    subtitle: "Smart nutrition suggestions based on goals, meals, hydration, and training load.",
    backHref: "/nutrition",
    breadcrumb: ["Nutrition", "Recommendations"],
    actions: [
      { label: "Meal Suggestion", href: "/nutrition/meals/builder", helper: "Build from a recommendation." },
      { label: "Insights", href: "/nutrition/insights", helper: "See why." },
    ],
    metrics: [
      { label: "Priority", value: "Protein", helper: "Example current nudge." },
      { label: "Hydration", value: "Low", helper: "Yesterday flag." },
      { label: "Timing", value: "Pre-workout", helper: "Fuel suggestion." },
    ],
    cards: [
      {
        title: "Increase Protein Today",
        helper: "A practical nudge when protein is behind.",
        points: ["Add Greek yogurt", "Choose lean dinner protein", "Use protein snack"],
      },
      {
        title: "Hydration Low Yesterday",
        helper: "Keep training readiness from being dragged down.",
        points: ["Morning water", "Training bottle", "Evening check"],
      },
      {
        title: "Pre-Workout Meal",
        helper: "Fuel the next session without overcomplicating it.",
        points: ["Carb + protein", "Low-fat option", "60-120 min window"],
      },
    ],
    related: relatedDefaults,
  },
  insights: {
    eyebrow: "Insights",
    title: "Nutrition Insights",
    subtitle: "Patterns, gaps, and useful explanations from logged nutrition behavior.",
    backHref: "/nutrition",
    breadcrumb: ["Nutrition", "Insights"],
    actions: [
      { label: "View Progress", href: "/nutrition/progress", helper: "Long-term view." },
      { label: "Recommendations", href: "/nutrition/recommendations", helper: "Next actions." },
    ],
    metrics: [
      { label: "Signal", value: "Building", helper: "Future intelligence score." },
      { label: "Gap", value: "Protein", helper: "Example pattern." },
      { label: "Win", value: "Meals", helper: "Consistency improved." },
    ],
    cards: [
      {
        title: "Pattern Engine",
        helper: "Future analysis can compare meals, workouts, and recovery.",
        points: ["Low-protein days", "Hydration misses", "Strong prep weeks"],
      },
      {
        title: "Coach Summary",
        helper: "Translate numbers into plain next steps.",
        points: ["What improved", "What needs attention", "What to do next"],
      },
    ],
    related: relatedDefaults,
  },
  progress: {
    eyebrow: "Progress",
    title: "Nutrition Progress",
    subtitle: "Track body composition, consistency, energy, and target adherence.",
    backHref: "/nutrition",
    breadcrumb: ["Nutrition", "Progress"],
    actions: [
      { label: "View Streaks", href: "/nutrition/streaks", helper: "Consistency." },
      { label: "Update Goals", href: "/nutrition/goals", helper: "Targets." },
    ],
    metrics: [
      { label: "Consistency", value: "78%", helper: "Example score." },
      { label: "Protein Days", value: "5/7", helper: "Weekly target." },
      { label: "Hydration", value: "4/7", helper: "Needs attention." },
    ],
    cards: [
      {
        title: "Progress Charts",
        helper: "Future chart area for body weight, habits, and macros.",
        points: ["Weekly protein", "Calories trend", "Weight trend"],
      },
      {
        title: "Goal Direction",
        helper: "Keep progress tied to profile and goal mode.",
        points: ["Cut", "Maintain", "Build muscle"],
      },
    ],
    related: relatedDefaults,
  },
  streaks: {
    eyebrow: "Streaks",
    title: "Nutrition Streaks",
    subtitle: "Make consistency visible with streaks for protein, hydration, and meal logging.",
    backHref: "/nutrition",
    breadcrumb: ["Nutrition", "Streaks"],
    actions: [
      { label: "Log Meal", href: "/nutrition/meals/builder", helper: "Continue streak." },
      { label: "Add Water", href: "/nutrition/hydration", helper: "Hydration check." },
    ],
    metrics: [
      { label: "Protein", value: "5 days", helper: "Placeholder streak." },
      { label: "Hydration", value: "2 days", helper: "Rebuild momentum." },
      { label: "Meals", value: "6 days", helper: "Strong routine." },
    ],
    cards: [
      {
        title: "Streak Board",
        helper: "Visual momentum for daily nutrition behaviors.",
        points: ["Protein streak", "Water streak", "Meal planning streak"],
      },
      {
        title: "Recovery Streak",
        helper: "Future links to sleep and training readiness.",
        points: ["Evening meal", "Hydration", "Protein minimum"],
      },
    ],
    related: relatedDefaults,
  },
  goals: {
    eyebrow: "Nutrition Goals",
    title: "Nutrition Goals",
    subtitle: "Set outcome targets for protein, calories, hydration, meal structure, and consistency.",
    backHref: "/nutrition",
    breadcrumb: ["Nutrition", "Goals"],
    actions: [
      { label: "Set Macros", href: "/nutrition/macros", helper: "Target split." },
      { label: "Set Calories", href: "/nutrition/calories", helper: "Energy target." },
    ],
    metrics: [
      { label: "Mode", value: "Cut", helper: "Example goal mode." },
      { label: "Protein", value: "160 g", helper: "Example target." },
      { label: "Water", value: "96 oz", helper: "Example target." },
    ],
    cards: [
      {
        title: "Goal Stack",
        helper: "Nutrition goals should support training goals.",
        points: ["Body composition", "Performance fuel", "Recovery support"],
      },
      {
        title: "Target Editor",
        helper: "Future controlled inputs for macro and behavior targets.",
        points: ["Protein", "Calories", "Hydration", "Meal consistency"],
      },
    ],
    related: relatedDefaults,
  },
  library: {
    eyebrow: "Library System",
    title: "Nutrition Library",
    subtitle: "A searchable premium resource hub for recipes, foods, supplements, and templates.",
    backHref: "/nutrition",
    breadcrumb: ["Nutrition", "Library"],
    actions: [
      { label: "Recipes", href: "/nutrition/library/recipes", helper: "Browse recipes." },
      { label: "Foods", href: "/nutrition/library/foods", helper: "Browse foods." },
    ],
    metrics: [
      { label: "Categories", value: "9", helper: "Filter-ready." },
      { label: "Cards", value: "48", helper: "Placeholder content." },
      { label: "Favorites", value: "Local", helper: "Future localStorage." },
    ],
    cards: [
      {
        title: "Search + Filters",
        helper: "Mirrors the quality direction of the Exercise Library without copying its complexity.",
        points: ["Goal fit", "Prep time", "Macro profile", "Meal timing"],
      },
      {
        title: "Expandable Cards",
        helper: "Cards can later reveal ingredients, macros, and add-to-plan actions.",
        points: ["Favorite", "Add to meal plan", "Send to shopping list"],
      },
    ],
    related: [
      { label: "Recipe Library", href: "/nutrition/library/recipes", helper: "Recipes." },
      { label: "Food Library", href: "/nutrition/library/foods", helper: "Foods." },
      { label: "Supplement Library", href: "/nutrition/library/supplements", helper: "Supplements." },
    ],
  },
  "library-recipes": {
    eyebrow: "Recipe Library",
    title: "Recipe Library",
    subtitle: "Filter recipes by goal, protein, calories, prep time, and training use.",
    backHref: "/nutrition/library",
    breadcrumb: ["Nutrition", "Library", "Recipes"],
    actions: [
      { label: "Open Recipes", href: "/nutrition/recipes", helper: "Recipe page." },
      { label: "Shopping List", href: "/nutrition/shopping-list", helper: "Add ingredients." },
    ],
    metrics: baseMetrics,
    cards: [
      {
        title: "Recipe Filters",
        helper: "Filter system placeholder for scalable recipe cards.",
        points: ["High protein", "Quick meals", "Meal prep", "Cut friendly", "Bulk friendly"],
      },
      {
        title: "Recipe Cards",
        helper: "Future cards can show calories, protein, prep, ingredients, and add actions.",
        points: ["Chicken rice bowl", "Turkey taco skillet", "Greek yogurt bowl"],
      },
    ],
    related: relatedDefaults,
  },
  "library-foods": {
    eyebrow: "Food Library",
    title: "Food Library",
    subtitle: "Browse food staples, macro profiles, serving notes, and plan fit.",
    backHref: "/nutrition/library",
    breadcrumb: ["Nutrition", "Library", "Foods"],
    actions: [
      { label: "Meal Builder", href: "/nutrition/meals/builder", helper: "Use foods." },
      { label: "Grocery", href: "/nutrition/grocery", helper: "Build list." },
    ],
    metrics: baseMetrics,
    cards: [
      {
        title: "Food Database Shell",
        helper: "A future searchable food database can live here.",
        points: ["Protein staples", "Training carbs", "Healthy fats", "Produce"],
      },
      {
        title: "Serving Intelligence",
        helper: "Future servings can feed macro previews.",
        points: ["Common portions", "Macro density", "Goal fit"],
      },
    ],
    related: relatedDefaults,
  },
  "library-supplements": {
    eyebrow: "Supplement Library",
    title: "Supplement Library",
    subtitle: "Reference-style supplement cards with notes, cautions, and goal fit.",
    backHref: "/nutrition/library",
    breadcrumb: ["Nutrition", "Library", "Supplements"],
    actions: [
      { label: "Supplements", href: "/nutrition/supplements", helper: "Overview." },
      { label: "Insights", href: "/nutrition/insights", helper: "Patterns." },
    ],
    metrics: baseMetrics,
    cards: [
      {
        title: "Supplement Cards",
        helper: "No medical claims. Keep this educational and conservative.",
        points: ["Protein powder", "Creatine", "Electrolytes"],
      },
      {
        title: "Safety Notes",
        helper: "Future version can include user-specific cautions.",
        points: ["Check interactions", "Ask a professional", "Track tolerance"],
      },
    ],
    related: relatedDefaults,
  },
};

export const coreModuleLinks: PortalLink[] = [
  { label: "Meals", href: "/nutrition/meals", helper: "Log and schedule food." },
  { label: "Macros", href: "/nutrition/macros", helper: "Track protein, carbs, fats." },
  { label: "Recipes", href: "/nutrition/recipes", helper: "Find meals that fit." },
  { label: "Grocery", href: "/nutrition/grocery", helper: "Turn plans into food." },
  { label: "Hydration", href: "/nutrition/hydration", helper: "Water and electrolytes." },
  { label: "Supplements", href: "/nutrition/supplements", helper: "Reference and notes." },
  { label: "Meal Plans", href: "/nutrition/meal-plan", helper: "Plan the week." },
  { label: "Progress", href: "/nutrition/progress", helper: "Review adherence." },
];

export const journeyStages = [
  {
    title: "Calorie Awareness",
    helper: "Understand intake, hunger, and goal direction.",
    status: "Unlocked",
  },
  {
    title: "Protein Consistency",
    helper: "Build a repeatable protein floor.",
    status: "Unlocked",
  },
  {
    title: "Meal Structure",
    helper: "Create reliable meal templates.",
    status: "Next",
  },
  {
    title: "Hydration Mastery",
    helper: "Tie water and electrolytes to readiness.",
    status: "Locked",
  },
  {
    title: "Performance Fueling",
    helper: "Fuel sessions and recovery windows.",
    status: "Locked",
  },
  {
    title: "Recovery Nutrition",
    helper: "Support sleep, soreness, and adaptation.",
    status: "Locked",
  },
  {
    title: "Advanced Nutrition Strategy",
    helper: "Periodize nutrition around phases.",
    status: "Locked",
  },
];

export function NutritionPortalNav() {
  return (
    <section className="rounded-[30px] border border-white/10 bg-slate-950/60 p-3 shadow-[0_0_55px_rgba(0,0,0,0.38)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <Link
          href="/nutrition"
          className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/15"
        >
          Fuel Portal
        </Link>
        <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
          {nutritionPortalGroups.map((group) => (
            <div className="group relative shrink-0" key={group.title}>
              <button
                type="button"
                className="min-h-[44px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-slate-300 transition hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-white"
              >
                {group.title}
              </button>
              <div className="invisible absolute left-0 top-full z-40 mt-2 w-[min(88vw,360px)] translate-y-2 rounded-[24px] border border-white/10 bg-slate-950/95 p-3 opacity-0 shadow-2xl backdrop-blur-xl transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                <div className="grid gap-2">
                  {group.links.map((link) => (
                    <Link
                      className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 transition hover:border-cyan-300/30 hover:bg-cyan-300/8"
                      href={link.href}
                      key={link.href}
                    >
                      <span className="text-sm font-black text-white">
                        {link.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {link.helper}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function NutritionBreadcrumbs({ items }: { items: string[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
      <Link href="/nutrition" className="text-cyan-200 hover:text-white">
        Nutrition
      </Link>
      {items.slice(1).map((item) => (
        <span className="inline-flex items-center gap-2" key={item}>
          <span className="text-slate-700">/</span>
          <span>{item}</span>
        </span>
      ))}
    </nav>
  );
}

export function NutritionBackLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[40px] items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black uppercase tracking-[0.14em] text-slate-300 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-white"
    >
      Back
    </Link>
  );
}

export function ActionLink({ link }: { link: PortalLink }) {
  return (
    <Link
      href={link.href}
      className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-cyan-300/15"
    >
      {link.label}
      <span className="mt-1 block text-xs font-semibold leading-5 text-cyan-100/65">
        {link.helper}
      </span>
    </Link>
  );
}

export function MetricCard({
  helper,
  label,
  value,
}: {
  helper: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
  );
}

export function ContentCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[30px] border border-white/10 bg-slate-950/62 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur-xl ${className}`}
    >
      {children}
    </section>
  );
}

export function ModuleCard({ link }: { link: PortalLink }) {
  return (
    <Link
      href={link.href}
      className="group rounded-[26px] border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-cyan-300/8 hover:shadow-[0_24px_70px_rgba(34,211,238,0.08)]"
    >
      <p className="text-lg font-black text-white">{link.label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{link.helper}</p>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-cyan-200 transition group-hover:translate-x-1">
        Open Module
      </p>
    </Link>
  );
}

export function NutritionModulePage({ moduleId }: { moduleId: NutritionModuleId }) {
  const nutritionModule = nutritionModules[moduleId];

  if (!nutritionModule) {
    return (
      <ContentCard>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
          Nutrition Module
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">
          Module unavailable
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          This nutrition page is not wired yet. Return to the Fuel Dashboard
          while the module route is repaired.
        </p>
        <Link
          href="/nutrition"
          className="mt-5 inline-flex rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-200/50"
        >
          Open Fuel Dashboard
        </Link>
      </ContentCard>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NutritionBreadcrumbs items={nutritionModule.breadcrumb} />
        <NutritionBackLink href={nutritionModule.backHref} />
      </div>

      <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(251,191,36,0.12),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.58)] lg:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr] xl:items-end">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-200">
              {nutritionModule.eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
              {nutritionModule.title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
              {nutritionModule.subtitle}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {nutritionModule.actions.map((action) => (
              <ActionLink key={action.href} link={action} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.42fr]">
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {nutritionModule.metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {nutritionModule.cards.map((card) => (
              <ContentCard key={card.title}>
                <p className="text-xl font-black text-white">{card.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {card.helper}
                </p>
                <div className="mt-4 grid gap-2">
                  {card.points.map((point) => (
                    <div
                      className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-slate-300"
                      key={point}
                    >
                      {point}
                    </div>
                  ))}
                </div>
              </ContentCard>
            ))}
          </div>
        </div>

        <aside className="space-y-5">
          <ContentCard>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
              Related Pages
            </p>
            <div className="mt-4 grid gap-3">
              {nutritionModule.related.map((link) => (
                <ModuleCard key={link.href} link={link} />
              ))}
            </div>
          </ContentCard>
          <ContentCard className="border-amber-300/20 bg-amber-300/10">
            <p className="text-lg font-black text-white">Future Data Hook</p>
            <p className="mt-2 text-sm leading-6 text-amber-50/75">
              This page is structured for localStorage, profile goals, meal logs,
              and future backend sync without needing another redesign.
            </p>
          </ContentCard>
        </aside>
      </section>
    </div>
  );
}
