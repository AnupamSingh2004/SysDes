import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SysDes - Transform Sketches into Professional Architecture Diagrams",
  description: "Draw messy system architecture sketches, let AI understand them, generate clean professional diagrams, and get smart design suggestions.",
  keywords: ["system design", "architecture diagram", "AI", "whiteboard", "software architecture"],
  authors: [{ name: "Anupam Singh" }],
  openGraph: {
    title: "SysDes - AI-Powered System Design Tool",
    description: "Transform rough sketches into professional architecture diagrams with AI-powered insights",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
