import UserMenuPlaceholderPage from "@/components/dashboard/UserMenuPlaceholderPage";

export default function SettingsPage() {
  return (
    <UserMenuPlaceholderPage
      badge="Account"
      title="Settings"
      description="App preferences and account controls belong here. Training identity, goals, and body profile stay on the Profile page."
      sections={[
        {
          title: "Profile Preferences",
          description: "Display preferences that support the member experience.",
          items: ["Default dashboard focus", "Preferred units", "Coaching tone"],
        },
        {
          title: "Notification Preferences",
          description: "Future reminders for sessions, meals, recovery, and plan reviews.",
          items: ["Workout reminders", "Nutrition nudges", "Recovery prompts"],
        },
        {
          title: "Privacy & Data",
          description: "Controls for local data, imports, connected services, and account data.",
          items: ["Data export placeholder", "Import review settings", "Privacy controls"],
        },
        {
          title: "Connected Apps",
          description: "Wearables and app connections will be wired here when integrations are ready.",
          items: ["Apple Health placeholder", "Garmin placeholder", "Strava placeholder"],
        },
        {
          title: "Display Preferences",
          description: "Theme, dashboard density, and visual defaults for the app.",
          items: ["Dark premium theme", "Compact cards", "Anatomy display options"],
        },
        {
          title: "Danger Zone",
          description: "Reserved for future account actions. Destructive actions are intentionally not active yet.",
          items: ["No destructive actions are enabled", "Backend safeguards pending"],
        },
      ]}
    />
  );
}
