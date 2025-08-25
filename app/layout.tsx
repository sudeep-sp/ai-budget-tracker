import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import RootProvider from "@/components/providers/RootProvider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fynixs - AI-Powered Budget Tracker & Personal Finance Manager",
  description:
    "Take control of your finances with Fynixs. Track expenses, manage budgets, and get AI-powered insights for better financial decisions. Your personal finance management solution.",
  keywords:
    "budget tracker, personal finance, expense tracking, financial management, AI budget, money management",
  authors: [{ name: "Fynixs Team" }],
  creator: "Fynixs Team",
  publisher: "Fynixs",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Fynixs - AI-Powered Budget Tracker",
    description:
      "Take control of your finances with Fynixs. Track expenses, manage budgets, and get AI-powered insights.",
    type: "website",
    locale: "en_US",
    siteName: "Fynixs",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fynixs - AI-Powered Budget Tracker",
    description:
      "Take control of your finances with Fynixs. Track expenses, manage budgets, and get AI-powered insights.",
    creator: "@fynixs",
  },
  verification: {
    google: "your-google-verification-code", // Replace with actual verification code
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <Toaster richColors position="bottom-right" />
          <RootProvider>{children}</RootProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
