import type { Metadata } from "next";
import { ReactNode } from "react";
import "./globals.css";
import Shell from "@/components/Shell";
import { StoreProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "TradeGuard Intelligence — synthetic trade compliance demo",
  description: "Educational portfolio simulation of a trade compliance operations workbench. Synthetic data only.",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans"><StoreProvider><Shell>{children}</Shell></StoreProvider></body>
    </html>
  );
}
