import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/toast";

export const metadata: Metadata = {
  title: "Ctruh 3D + AR Shopping Opportunity Analyzer",
  description:
    "Discover which Shopify products are best suited for 3D viewing, AR, and virtual try-on — powered by Ctruh.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
