import type { Metadata, Viewport } from "next";
import "./globals.css";
import IntroAssessmentMusicStopper from "@/components/onboarding/IntroAssessmentMusicStopper";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const description = "In-home training & assisted stretch";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sound Fitness",
    template: "%s · Sound Fitness",
  },
  description,
  openGraph: {
    title: "Sound Fitness",
    description,
    url: siteUrl,
    siteName: "Sound Fitness",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sound Fitness",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#020713",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <IntroAssessmentMusicStopper />
        {children}
      </body>
    </html>
  );
}
