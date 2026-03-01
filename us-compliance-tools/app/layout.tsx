import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://finlogichub5.com";

export const metadata: Metadata = {
  title: "US Small Business Compliance Tool Suite",
  description:
    "Clean, fast, and state-specific compliance tools for US small businesses.",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "US Small Business Compliance Tool Suite",
    description:
      "Fast, state-specific compliance tools for US small businesses.",
    type: "website"
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="font-sans">
      <body className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.14),_transparent_45%),radial-gradient(circle_at_80%_30%,_rgba(59,130,246,0.08),_transparent_40%)]">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8 sm:px-8">
          <header className="flex flex-col gap-2 border-b border-stone-200 pb-6">
            <p className="font-serif text-sm uppercase tracking-[0.25em] text-ink-600">
              US Compliance Tool Suite
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h1 className="text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
                Small business compliance, simplified.
              </h1>
              <span className="text-sm text-ink-600">
                Static, fast, and ready for production.
              </span>
            </div>
          </header>
          <main className="flex-1 py-10">{children}</main>
          <footer className="border-t border-stone-200 py-6 text-sm text-ink-600">
            Built for clarity, accuracy, and speed.
          </footer>
        </div>
      </body>
    </html>
  );
}
