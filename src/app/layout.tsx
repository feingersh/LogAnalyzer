import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Log Analyzer",
  description: "Look up a WoW character's recent WarcraftLogs reports",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
