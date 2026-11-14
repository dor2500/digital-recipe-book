import type { Metadata, Viewport } from "next";
import { Caveat, Playfair_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const serif = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const sans = Source_Sans_3({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const hand = Caveat({ subsets: ["latin"], variable: "--font-hand", display: "swap" });

export const metadata: Metadata = {
  title: "Kitchen Stories — a digital recipe book",
  description: "Browse and add recipes in a cookbook that turns like the real thing.",
};

export const viewport: Viewport = {
  themeColor: "#3a2416",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${hand.variable}`}>
      <body className="table-surface font-sans antialiased">{children}</body>
    </html>
  );
}
