import type { Metadata } from "next";
import "./globals.css";
import "./review.css";

export const metadata: Metadata = {
  title: "Pocket Flashcards — Review. Rinse. Repeat.",
  description: "Create study sets, practise terms, and track your progress.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Pocket Flashcards",
    description: "Review. Rinse. Repeat.",
  },
  twitter: {
    card: "summary",
    title: "Pocket Flashcards",
    description: "Review. Rinse. Repeat.",
  },
};

export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
