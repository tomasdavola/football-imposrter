import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title:
      "Football Imposter – Online Social Deduction Party Game for Football Fans",
  description:
      "Football Imposter is an online social deduction party game for football (soccer) fans. One player is the imposter who doesn’t know the footballer, club, or league. Ask questions, bluff, and vote them out before time runs out.",
  keywords: [
    // Core
    "football imposter",
    "football imposter game",
    "soccer imposter game",

    // Party / Social
    "football party game",
    "soccer party game",
    "online party game",
    "multiplayer football game",
    "social deduction game",

    // Gameplay intent
    "guess the football player",
    "football trivia game",
    "football quiz game",
    "soccer trivia game",
    "football guessing game",

    // Audience
    "game for football fans",
    "game for soccer fans",
    "football friends game",
    "football drinking game",

    // Discovery / casual search
    "play football game online",
    "free football game",
    "browser football game",
    "online football quiz"
  ],
  openGraph: {
    title:
        "Football Imposter – The Ultimate Social Deduction Game for Football Fans",
    description:
        "One player doesn’t know the footballer. Can you expose the imposter before they fool everyone?",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title:
        "Football Imposter – Online Social Deduction Football Party Game",
    description:
        "A fast-paced football party game where one player is faking their football knowledge.",
  },
};


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased bg-zinc-950 text-white min-h-screen`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
