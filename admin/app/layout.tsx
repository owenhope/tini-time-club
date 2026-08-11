import type { Metadata } from "next";
import Script from "next/script";
import { Figtree, DM_Mono } from "next/font/google";
import "./globals.css";

// Figtree stands in for the wordmark's geometric grotesque; DM Mono for
// measurements, counts and timestamps. Exposed as CSS vars consumed in
// globals.css (--font-sans / --font-mono).
const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tinitimeclub.com"),
  title: "Tini Time Club",
  description: "Martini reviews from Tini Time Club.",
  openGraph: {
    siteName: "Tini Time Club",
    type: "website",
    title: "Tini Time Club",
    description: "Martini reviews from Tini Time Club.",
    images: [
      {
        url: "/tini-time-share.png",
        width: 1200,
        height: 630,
        alt: "Tini Time Club logo on the brand splash color",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tini Time Club",
    description: "Martini reviews from Tini Time Club.",
    images: ["/tini-time-share.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${figtree.variable} ${dmMono.variable}`}
    >
      <body className="min-h-full bg-stone-50 text-stone-900">
        {children}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-53R4Z4BZ3D"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-53R4Z4BZ3D');
          `}
        </Script>
      </body>
    </html>
  );
}
