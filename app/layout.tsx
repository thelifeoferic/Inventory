import type { Metadata } from "next";
import "./globals.css";
import "./platform.css";

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
  return <html lang="en"><body>{children}<footer className="team-footer"><span>Hotel Wren</span><p>Where did all the egg cups go?</p></footer></body></html>;
}
