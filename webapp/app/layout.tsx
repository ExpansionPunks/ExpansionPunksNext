import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { WalletProviders } from "@/components/wallet/WalletProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ExpansionPunks Next",
    template: "%s | ExpansionPunks Next",
  },
  description:
    "The public home for ExpansionPunks fully onchain migration, collection history, and final DAO execution.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <WalletProviders>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </WalletProviders>
      </body>
    </html>
  );
}
