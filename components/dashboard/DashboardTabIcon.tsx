import type { SVGProps } from "react";

type DashboardTabIconProps = {
  className?: string;
  label?: string;
  name: string;
};

const aliases: Record<string, string> = {
  DB: "dashboard",
  Dashboard: "dashboard",
  ED: "education",
  Education: "education",
  "Exercise Library": "library",
  Achievements: "achievements",
  App: "app",
  "App Guide": "app",
  Appointments: "appointments",
  Build: "builder",
  Builder: "builder",
  "Workout Builder": "builder",
  Calendar: "calendar",
  Calories: "calories",
  Cardio: "cardio",
  Dash: "dashboard",
  Feed: "feed",
  Form: "form",
  form: "form",
  FAQ: "help",
  Grocery: "grocery",
  Group: "groups",
  Groups: "groups",
  Help: "help",
  Hydrate: "hydration",
  Insights: "insights",
  Lessons: "education",
  Lib: "library",
  Library: "library",
  Logic: "logic",
  Meals: "meals",
  Messages: "messages",
  messages: "messages",
  Mail: "mail",
  mail: "mail",
  Metrics: "stats",
  Music: "music",
  Muted: "volume-muted",
  Overview: "dashboard",
  Packages: "packages",
  Pause: "pause",
  Play: "play",
  Program: "challenges",
  Programs: "challenges",
  "Programs & Challenges": "challenges",
  "Programs and Challenges": "challenges",
  Plan: "plan",
  "My Plan": "plan",
  Post: "post",
  Power: "performance",
  Progress: "stats",
  Question: "help",
  Run: "run",
  Sound: "music",
  "Sound Controls": "music",
  Social: "feed",
  Gear: "settings",
  Settings: "settings",
  Skip: "skip",
  Challenges: "challenges",
  Stats: "stats",
  stats: "stats",
  Tests: "tests",
  tests: "tests",
  Technique: "form",
  Trends: "stats",
  Trophy: "achievements",
  "Training Logic": "logic",
  "World Hub": "soundworld",
  GO: "goals",
  Goals: "goals",
  ID: "profile",
  Nutrition: "nutrition",
  "Nutrition / Fuel": "nutrition",
  NU: "nutrition",
  PF: "performance",
  Performance: "performance",
  Profile: "profile",
  RE: "recovery",
  Recovery: "recovery",
  recovery: "recovery",
  SW: "soundworld",
  "Sound World": "soundworld",
  WO: "workout",
  Workout: "workout",
  "Workout / Sessions": "workout",
  Volume: "volume",
  groups: "groups",
};

function IconSvg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    />
  );
}

export default function DashboardTabIcon({
  className = "h-5 w-5",
  label = "",
  name,
}: DashboardTabIconProps) {
  const iconName =
    aliases[name] ||
    aliases[label] ||
    label.toLowerCase().replace(/\s+/g, "-") ||
    name.toLowerCase().replace(/\s+/g, "-");

  switch (iconName) {
    case "dashboard":
      return <IconSvg className={className}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></IconSvg>;
    case "profile":
      return <IconSvg className={className}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></IconSvg>;
    case "goals":
      return <IconSvg className={className}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3" /><path d="M12 19v3" /><path d="M2 12h3" /><path d="M19 12h3" /></IconSvg>;
    case "workout":
      return <IconSvg className={className}><path d="M6 7v10" /><path d="M18 7v10" /><path d="M3 9v6" /><path d="M21 9v6" /><path d="M6 12h12" /></IconSvg>;
    case "plan":
      return <IconSvg className={className}><path d="M6 3h12a2 2 0 0 1 2 2v16l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2Z" /><path d="M8 8h8" /><path d="M8 12h6" /><path d="M8 16h5" /></IconSvg>;
    case "builder":
      return <IconSvg className={className}><path d="M14.7 6.3a1 1 0 0 0 1.4 1.4l1.6-1.6a3 3 0 0 1-3.8 3.8L7 16.8 4.2 14l6.9-6.9a3 3 0 0 1 3.8-3.8l-1.6 1.6Z" /><path d="m5 19 3-3" /></IconSvg>;
    case "library":
      return <IconSvg className={className}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /><path d="M9 6h7" /><path d="M9 10h5" /><path d="M9 14h6" /></IconSvg>;
    case "nutrition":
      return <IconSvg className={className}><path d="M7 2v9" /><path d="M4 2v5a3 3 0 0 0 6 0V2" /><path d="M7 11v11" /><path d="M17 2v20" /><path d="M17 2c2.5 2.2 3.2 6.6 0 9" /></IconSvg>;
    case "hydration":
      return <IconSvg className={className}><path d="M12 2s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z" /><path d="M9 14a3 3 0 0 0 3 3" /></IconSvg>;
    case "meals":
      return <IconSvg className={className}><circle cx="12" cy="12" r="7" /><path d="M12 5v14" /><path d="M5 12h14" /><path d="M8 8h.01" /><path d="M16 16h.01" /></IconSvg>;
    case "grocery":
      return <IconSvg className={className}><path d="M6 6h15l-2 8H8L6 3H3" /><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></IconSvg>;
    case "calories":
      return <IconSvg className={className}><path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-5-9-.5 2-2 3-3.5 4.5C9 12 8 13.5 8 15a4 4 0 0 0 8 0c0-1.5-.8-2.8-2-4" /></IconSvg>;
    case "recovery":
      return <IconSvg className={className}><path d="M22 12h-4l-3 8-6-16-3 8H2" /></IconSvg>;
    case "performance":
      return <IconSvg className={className}><path d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z" /></IconSvg>;
    case "cardio":
      return <IconSvg className={className}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" /><path d="M3 12h4l2-3 3 6 2-3h7" /></IconSvg>;
    case "run":
      return <IconSvg className={className}><circle cx="13" cy="4" r="2" /><path d="m15 7-3 4 4 3 2 5" /><path d="m11 11-3 3-4 1" /><path d="m12 11-2 8" /></IconSvg>;
    case "tests":
      return <IconSvg className={className}><path d="M9 2v6l-4 8a4 4 0 0 0 3.6 6h6.8A4 4 0 0 0 19 16l-4-8V2" /><path d="M8 2h8" /><path d="M7 16h10" /></IconSvg>;
    case "education":
      return <IconSvg className={className}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z" /><path d="M8 6h8" /><path d="M8 10h6" /></IconSvg>;
    case "form":
      return <IconSvg className={className}><path d="M4 19V5" /><path d="M20 19V5" /><path d="M8 8h8" /><path d="M9 12h6" /><path d="M10 16h4" /></IconSvg>;
    case "logic":
      return <IconSvg className={className}><path d="M6 3h12v5H6z" /><path d="M12 8v4" /><path d="M6 21h5v-5H6z" /><path d="M13 21h5v-5h-5z" /><path d="M8.5 16V12h7v4" /></IconSvg>;
    case "app":
      return <IconSvg className={className}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /><path d="M10 6h4" /></IconSvg>;
    case "soundworld":
      return <IconSvg className={className}><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" /><path d="M3.6 9h16.8" /><path d="M3.6 15h16.8" /><path d="M12 3c2 2.4 3 5.4 3 9s-1 6.6-3 9" /><path d="M12 3c-2 2.4-3 5.4-3 9s1 6.6 3 9" /></IconSvg>;
    case "feed":
      return <IconSvg className={className}><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h8" /><path d="M8 13h5" /><path d="M8 17h7" /></IconSvg>;
    case "post":
      return <IconSvg className={className}><path d="M4 20h16" /><path d="M14 4 20 10 10 20H4v-6L14 4Z" /><path d="m13 5 6 6" /></IconSvg>;
    case "stats":
      return <IconSvg className={className}><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 3-4 3 2 4-6" /></IconSvg>;
    case "calendar":
      return <IconSvg className={className}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4" /><path d="M16 3v4" /><path d="M4 10h16" /></IconSvg>;
    case "appointments":
      return <IconSvg className={className}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4" /><path d="M16 3v4" /><path d="M8 14h5" /><path d="M8 17h8" /></IconSvg>;
    case "insights":
      return <IconSvg className={className}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M8.5 14.5A6 6 0 1 1 15.5 14.5c-.9.6-1.5 1.6-1.5 2.5h-4c0-.9-.6-1.9-1.5-2.5Z" /></IconSvg>;
    case "achievements":
      return <IconSvg className={className}><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M7 7H4a3 3 0 0 0 3 3" /><path d="M17 7h3a3 3 0 0 1-3 3" /></IconSvg>;
    case "music":
      return <IconSvg className={className}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></IconSvg>;
    case "pause":
      return <IconSvg className={className}><path d="M8 5v14" /><path d="M16 5v14" /></IconSvg>;
    case "play":
      return <IconSvg className={className}><path d="m8 5 11 7-11 7V5Z" /></IconSvg>;
    case "skip":
      return <IconSvg className={className}><path d="m5 5 9 7-9 7V5Z" /><path d="M19 5v14" /></IconSvg>;
    case "volume":
      return <IconSvg className={className}><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="M17 9.5a4 4 0 0 1 0 5" /><path d="M19.5 7a8 8 0 0 1 0 10" /></IconSvg>;
    case "volume-muted":
      return <IconSvg className={className}><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="m18 9 4 4" /><path d="m22 9-4 4" /></IconSvg>;
    case "messages":
      return <IconSvg className={className}><path d="M21 12a8 8 0 0 1-8 8H6l-4 2 2-5a8 8 0 1 1 17-5Z" /><path d="M8 11h8" /><path d="M8 15h5" /></IconSvg>;
    case "mail":
      return <IconSvg className={className}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></IconSvg>;
    case "settings":
      return <IconSvg className={className}><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.08a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.08A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88l-.06-.06A2 2 0 1 1 7.03 4.2l.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 10 3.04V3a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06A2 2 0 1 1 19.8 7.03l-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.96 10H21a2 2 0 1 1 0 4h-.08A1.7 1.7 0 0 0 19.4 15Z" /></IconSvg>;
    case "help":
      return <IconSvg className={className}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.8 2.8 0 0 1 5.2 1.4c0 2-2.7 2.3-2.7 4" /><path d="M12 18h.01" /></IconSvg>;
    case "groups":
      return <IconSvg className={className}><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3.5 21a5.5 5.5 0 0 1 11 0" /><path d="M14.5 19.5a4.5 4.5 0 0 1 6 1.5" /></IconSvg>;
    case "challenges":
      return <IconSvg className={className}><path d="M5 21V4" /><path d="M5 5h11l-1.6 3L16 11H5" /><path d="M12 14.5 10.8 17l-2.8.4 2 1.9-.5 2.7 2.5-1.3 2.5 1.3-.5-2.7 2-1.9-2.8-.4L12 14.5Z" /></IconSvg>;
    case "packages":
      return <IconSvg className={className}><path d="m12 3 8 4-8 4-8-4 8-4Z" /><path d="M4 7v10l8 4 8-4V7" /><path d="M12 11v10" /></IconSvg>;
    default:
      return <IconSvg className={className}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></IconSvg>;
  }
}
