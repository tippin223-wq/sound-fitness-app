const route = <T extends `/${string}`>(path: T) => path;

type ValueOf<T> = T[keyof T];

export const PUBLIC_ROUTES = {
  home: route("/"),
  start: route("/start"),
} as const;

export const AUTH_ROUTES = {
  login: route("/login"),
  signup: route("/signup"),
  forgotPassword: route("/forgot-password"),
  resetPasswordSent: route("/reset-password-sent"),
  updatePassword: route("/update-password"),
} as const;

export const ONBOARDING_ROUTES = {
  home: route("/onboarding"),
  assessment: route("/onboarding/assessment"),
  subscription: route("/onboarding/subscription"),
  intakeCheckIn: route("/onboarding/intake-check-in"),
  confirmation: route("/onboarding/confirmation"),
} as const;

export const DASHBOARD_ROUTES = {
  home: route("/dashboard"),
  coachMessaging: route("/dashboard/coach-messaging"),
  goals: route("/dashboard/goals"),
  plan: route("/dashboard/plan"),
  phases: route("/dashboard/phases"),
  exerciseLibrary: route("/dashboard/exercise-library"),
  mobility: route("/dashboard/mobility"),
  performance: route("/dashboard/performance"),
  myPlan: route("/dashboard/my-plan"),
  createMyPlan: route("/dashboard/my-plan/create"),
  payments: route("/dashboard/payments"),
  profile: route("/dashboard/profile"),
  progress: route("/dashboard/progress"),
  progressCheckIn: route("/dashboard/progress/check-in"),
  progressGoals: route("/dashboard/progress/goals"),
  habitTracker: route("/dashboard/progress/habit-tracker"),
  journal: route("/dashboard/progress/journal"),
  painTracking: route("/dashboard/progress/pain-tracking"),
  recovery: route("/dashboard/recovery"),
  mobilityLibrary: route("/dashboard/recovery/mobility-library"),
  recoveryRecommendations: route("/dashboard/recovery/recommendations"),
  sessions: route("/dashboard/sessions"),
  sessionBooking: route("/dashboard/sessions/booking"),
  sessionHistory: route("/dashboard/sessions/history"),
  sessionNotes: route("/dashboard/sessions/session-notes"),
  sessionWorkout: route("/dashboard/sessions/workout"),
  workoutComplete: route("/dashboard/sessions/workout-complete"),
  social: route("/dashboard/social"),
  socialPost: route("/dashboard/social/post"),
  stats: route("/dashboard/stats"),
  calendar: route("/dashboard/calendar"),
  trainingCalendar: route("/dashboard/training-calendar"),
  videoReview: route("/dashboard/video-review"),
} as const;

export const MEMBER_ROUTES = DASHBOARD_ROUTES;

export const NUTRITION_ROUTES = {
  home: route("/dashboard/nutrition"),
  groceryList: route("/dashboard/nutrition/grocery-list"),
  mealPrep: route("/dashboard/nutrition/meal-prep"),
  recipes: route("/dashboard/nutrition/recipes"),
  chickenRiceBowl: route("/dashboard/nutrition/recipes/chicken-rice-bowl"),
} as const;

export const NUTRITION_PORTAL_ROUTES = {
  home: route("/nutrition"),
  journey: route("/nutrition/journey"),
  meals: route("/nutrition/meals"),
  mealBuilder: route("/nutrition/meals/builder"),
  macros: route("/nutrition/macros"),
  hydration: route("/nutrition/hydration"),
  recipes: route("/nutrition/recipes"),
  grocery: route("/nutrition/grocery"),
  library: route("/nutrition/library"),
} as const;

export const WORKOUT_BUILDER_ROUTES = {
  home: route("/dashboard/workout-builder"),
  exerciseLibrary: route("/dashboard/workout-builder/exercise-library"),
  exerciseDemo: route("/dashboard/workout-builder/exercise-library/demo"),
} as const;

export const ADMIN_ROUTES = {
  home: route("/admin"),
  aiPrompt: route("/admin/ai-prompt"),
  clients: route("/admin/clients"),
  crmDashboard: route("/admin/crm-dashboard"),
  dashboard: route("/admin/dashboard"),
  followUps: route("/admin/follow-ups"),
  invoices: route("/admin/invoices"),
  leadMap: route("/admin/lead-map"),
  leadProfile: route("/admin/lead-profile"),
  leads: route("/admin/leads"),
  login: route("/admin/login"),
  postHub: route("/admin/post-hub"),
  referrals: route("/admin/referrals"),
  reports: route("/admin/reports"),
  sales: route("/admin/sales"),
  siteMap: route("/admin/site-map"),
  socialPortal: route("/admin/social-portal"),
  templates: route("/admin/templates"),
  devMovementIntelligence: route("/admin/dev/movement-intelligence"),
} as const;

export const COACH_ROUTES = {
  home: route("/coach"),
  login: route("/coach/login"),
  dashboard: route("/coach/dashboard"),
  legacyDashboard: route("/coach/login/dashboard"),
} as const;

export const ROUTES = {
  public: PUBLIC_ROUTES,
  auth: AUTH_ROUTES,
  onboarding: ONBOARDING_ROUTES,
  dashboard: DASHBOARD_ROUTES,
  member: MEMBER_ROUTES,
  nutrition: NUTRITION_ROUTES,
  nutritionPortal: NUTRITION_PORTAL_ROUTES,
  workoutBuilder: WORKOUT_BUILDER_ROUTES,
  admin: ADMIN_ROUTES,
  coach: COACH_ROUTES,
} as const;

export type AppRoute =
  | ValueOf<typeof PUBLIC_ROUTES>
  | ValueOf<typeof AUTH_ROUTES>
  | ValueOf<typeof ONBOARDING_ROUTES>
  | ValueOf<typeof DASHBOARD_ROUTES>
  | ValueOf<typeof NUTRITION_ROUTES>
  | ValueOf<typeof NUTRITION_PORTAL_ROUTES>
  | ValueOf<typeof WORKOUT_BUILDER_ROUTES>
  | ValueOf<typeof ADMIN_ROUTES>
  | ValueOf<typeof COACH_ROUTES>;

export type InternalHref = AppRoute | `${AppRoute}?${string}`;

export const PROTECTED_ROUTE_PREFIXES = [
  ADMIN_ROUTES.home,
  COACH_ROUTES.home,
  DASHBOARD_ROUTES.home,
] as const;

export const PUBLIC_AUTH_ROUTES = [
  AUTH_ROUTES.login,
  ADMIN_ROUTES.login,
  COACH_ROUTES.login,
  AUTH_ROUTES.forgotPassword,
  AUTH_ROUTES.updatePassword,
  AUTH_ROUTES.resetPasswordSent,
] as const;

export function withNext(loginRoute: AppRoute, nextPath: string) {
  return `${loginRoute}?next=${encodeURIComponent(nextPath)}` as const;
}

export function workoutBuilderAddToPlan(planId: string, day: string) {
  const params = new URLSearchParams({ addTo: `${planId}:${day}` });
  return `${WORKOUT_BUILDER_ROUTES.home}?${params.toString()}` as const;
}
