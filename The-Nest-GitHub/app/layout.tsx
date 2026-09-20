import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hotel Wren Inventory",
  description: "A mapped inventory and operational memory system for every Hotel Wren space and guest room.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Hotel Wren Inventory",
    description: "Know what is on hand, where it lives, and what the team should remember.",
    images: [{ url: "/og.svg", width: 1200, height: 630, alt: "Hotel Wren Inventory" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
