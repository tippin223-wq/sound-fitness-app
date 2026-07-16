import "./globals.css";
import IntroAssessmentMusicStopper from "@/components/onboarding/IntroAssessmentMusicStopper";

export const metadata = {
  title: "Sound Fitness",
  description: "In-home training & assisted stretch",
  icons: {
    icon: "/sound-fitness-logo.png",
  },
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
