import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedAtlas — Medicine Knowledge Search",
  description:
    "Search public medicine name and product-label reference information.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}