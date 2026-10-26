import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cozzo Canary Caller",
  description:
    "An AI mystery shopper that stress-tests voice agents before launch.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
