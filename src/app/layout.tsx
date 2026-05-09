import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Banner } from "@/components/banner";
import { SupportChat } from "@/components/support-chat";

export const metadata: Metadata = {
  title: "TruBott",
  description:
    "Open-source privacy-first trust cards for selective social and liveness attestation.",
  authors: [{ name: "TruBott Team" }],
  openGraph: {
    title: "TruBott",
    description: "Open-source privacy-first trust cards.",
    siteName: "TruBott",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "TruBott - Digital Trust Primitive",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TruBott",
    description: "Open-source privacy-first trust cards.",
    images: ["/images/og-image.png"],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <Banner />
        <Navbar />
        <div>{children}</div>
        <SupportChat />
      </body>
    </html>
  );
}
