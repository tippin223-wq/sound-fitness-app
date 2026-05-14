import UserMenuPlaceholderPage from "@/components/dashboard/UserMenuPlaceholderPage";

export default function HelpPage() {
  return (
    <UserMenuPlaceholderPage
      badge="Support"
      title="Help Center"
      description="Support, FAQs, app guidance, and contact options will collect here as the platform grows."
      sections={[
        {
          title: "Getting Started",
          description: "Orientation for moving through the Sound Fitness system.",
          items: ["Set up Profile", "Choose Goals", "Open Sessions"],
        },
        {
          title: "Logging Workouts",
          description: "Guidance for sessions, workout builder, exercise library, and stats.",
          items: ["Start a session", "Save a template", "Review stats"],
        },
        {
          title: "Nutrition Tracking",
          description: "Help with meals, hydration, grocery planning, and the Fuel Journey.",
          items: ["Open Fuel Dashboard", "Build a meal", "Track hydration"],
        },
        {
          title: "Importing Stats",
          description: "Support for manual entry, uploads, and future AI import review.",
          items: ["Manual entry", "Upload screenshot", "Review before saving"],
        },
        {
          title: "Account & Billing",
          description: "Account, billing, payments, and membership support.",
          items: ["Profile settings", "Payment history", "Membership support"],
        },
        {
          title: "Contact Support",
          description: "Future support channels will appear here when backend support tooling is ready.",
          items: ["Contact form placeholder", "Coach message shortcut", "Support queue pending"],
        },
      ]}
    />
  );
}
