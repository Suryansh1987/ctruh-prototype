import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ctruh XR (3D and AR shopping experiences) Opportunity Analyzer",
  description:
    "Discover which products in any Shopify store could sell more with 3D viewing and AR (try products virtually through your camera) — powered by Ctruh.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
