import type { Metadata } from "next";
import Script from "next/script";
import { Figtree, DM_Mono } from "next/font/google";
import { siteDescription, siteShareImage } from "@/lib/seo";
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
  title: "Martini Review App | Tini Time Club",
  description: siteDescription,
  authors: [
    {
      name: "Hope Media House Inc.",
      url: "https://tinitimeclub.com/about",
    },
  ],
  openGraph: {
    siteName: "Tini Time Club",
    type: "website",
    url: "https://tinitimeclub.com/",
    title: "Martini Review App | Tini Time Club",
    description: siteDescription,
    images: [siteShareImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Martini Review App | Tini Time Club",
    description: siteDescription,
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
