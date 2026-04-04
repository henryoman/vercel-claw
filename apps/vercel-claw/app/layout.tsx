import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "vercel-claw",
  description: "A personal Vercel + Convex deployment surface for an open claw-style agent.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
