import type { Metadata } from "next";
import { Archivo, Newsreader } from "next/font/google";
import { draftMode } from "next/headers";
import Link from "next/link";

import { siteUrl } from "@/lib/env";

import "./globals.css";

/**
 * next/font downloads these at build time and self-hosts them. No request to
 * fonts.googleapis.com at runtime, no render-blocking stylesheet, and no
 * layout shift — `display: swap` plus a matched fallback metric.
 *
 * Phase 10 swaps these for whatever the client brand actually calls for. The
 * CSS variable names stay the same, so globals.css never has to change.
 */
const display = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display-face",
  display: "swap",
});

const body = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-body-face",
  display: "swap",
});

export const metadata: Metadata = {
  // Makes every relative URL in generated metadata absolute — required for
  // Open Graph images to resolve correctly when shared.
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Cleaning services",
    template: "%s",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { isEnabled: isPreview } = await draftMode();

  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-dvh flex-col">
        {/* Keyboard and screen-reader users get a way past the navigation. */}
        <a
          href="#main"
          className="bg-brand-600 sr-only rounded-sm px-4 py-2 text-white focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
        >
          Skip to content
        </a>

        {isPreview ? <PreviewBanner /> : null}

        <main id="main" className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}

/**
 * Shown only when draft mode is on. Without an obvious exit, an editor who
 * previews a draft keeps seeing draft content everywhere and reports the live
 * site as broken.
 */
function PreviewBanner() {
  return (
    <div className="bg-warning flex items-center justify-center gap-3 px-4 py-2 text-center text-sm text-white">
      <span>Draft preview — this is not the published site.</span>
      <Link href="/api/preview/exit" className="font-semibold underline">
        Exit preview
      </Link>
    </div>
  );
}
