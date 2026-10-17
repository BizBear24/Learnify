import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const head = Space_Grotesk({ subsets: ["latin"], weight: ["700"], variable: "--font-head" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Learnify",
  description: "Turn any PDF into a live multiplayer quiz.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${head.variable} ${mono.variable} font-head`}>
        <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
