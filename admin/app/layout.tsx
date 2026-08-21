import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import { Suspense } from "react";
import { siteDescription, siteShareImage } from "@/lib/seo";
import AdminNavigationProgress from "@/components/AdminNavigationProgress";
import "./globals.css";

// Figtree stands in for the wordmark's geometric grotesque; DM Mono for
// measurements, counts and timestamps. Exposed as CSS vars consumed in
// globals.css (--font-sans / --font-mono).
const figtree = localFont({
  src: [
    {
      path: "../node_modules/@expo-google-fonts/figtree/400Regular/Figtree_400Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@expo-google-fonts/figtree/600SemiBold/Figtree_600SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../node_modules/@expo-google-fonts/figtree/700Bold/Figtree_700Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../node_modules/@expo-google-fonts/figtree/900Black/Figtree_900Black.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-figtree",
  display: "swap",
});

const dmMono = localFont({
  src: [
    {
      path: "../node_modules/@expo-google-fonts/dm-mono/400Regular/DMMono_400Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@expo-google-fonts/dm-mono/500Medium/DMMono_500Medium.ttf",
      weight: "500",
      style: "normal",
    },
  ],
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
        <Suspense>
          <AdminNavigationProgress />
        </Suspense>
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
