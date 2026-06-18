import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cauldron",
  description: "A digital pantry that tracks ingredients, expiry dates, receipts, and recipes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#dfe8e2]">{children}</body>
    </html>
  );
}
