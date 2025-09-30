import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ConnectSpace - Real-time Group Chat",
  description: "Connect with communities through real-time group chat. Create groups, join conversations, and build connections.",
  keywords: ["ConnectSpace", "chat", "messaging", "groups", "community", "real-time", "Next.js", "TypeScript"],
  authors: [{ name: "ConnectSpace Team" }],
  openGraph: {
    title: "ConnectSpace - Real-time Group Chat",
    description: "Connect with communities through real-time group chat",
    url: "https://connectspace.app",
    siteName: "ConnectSpace",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ConnectSpace - Real-time Group Chat",
    description: "Connect with communities through real-time group chat",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
