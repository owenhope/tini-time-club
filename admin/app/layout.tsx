import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ttc.hopemediahouse.com"),
  title: "Tini Time Club",
  description: "Martini reviews from Tini Time Club.",
  openGraph: {
    siteName: "Tini Time Club",
    type: "website",
    title: "Tini Time Club",
    description: "Martini reviews from Tini Time Club.",
    images: [
      {
        url: "/nightlife-martini-table.png",
        width: 1200,
        height: 1200,
        alt: "Martinis on a low-lit table",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tini Time Club",
    description: "Martini reviews from Tini Time Club.",
    images: ["/nightlife-martini-table.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-stone-50 text-stone-900">{children}</body>
    </html>
  );
}
