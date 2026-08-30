import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RelayOS — The Autonomous AI Front Office",
  description: "AI that answers, qualifies, and books your leads before they go cold.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Loaded at runtime in the browser, not during `next build`, so
            the build stays network-independent. See app/globals.css for
            the --font-* custom properties these map to. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
