import type { Metadata, Viewport } from "next";
import { Amatic_SC, Assistant, Frank_Ruhl_Libre } from "next/font/google";
import "./globals.css";

// Hebrew-first fonts: a classic book serif, a clean sans for instructions,
// and a handwritten face for the chef's notes.
const serif = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  variable: "--font-serif",
  display: "swap",
});
const sans = Assistant({ subsets: ["hebrew", "latin"], variable: "--font-sans", display: "swap" });
const hand = Amatic_SC({
  subsets: ["hebrew", "latin"],
  weight: ["400", "700"],
  variable: "--font-hand",
  display: "swap",
});

const TITLE = "ספר המתכונים הרשמי של טורפים את המטבח🌶️🔥";

export const metadata: Metadata = {
  title: TITLE,
  description: "ספר מתכונים דיגיטלי שמדפדפים בו כמו בספר אמיתי, ושכל אחד יכול להוסיף לו מתכון.",
  openGraph: { title: TITLE, locale: "he_IL", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#3a2416",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${serif.variable} ${sans.variable} ${hand.variable}`}>
      <body className="table-surface font-sans antialiased">{children}</body>
    </html>
  );
}
