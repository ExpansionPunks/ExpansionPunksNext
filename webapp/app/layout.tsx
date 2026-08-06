import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TestnetBanner } from "@/components/site/TestnetBanner";
import { WalletProviders } from "@/components/wallet/WalletProviders";
import "./globals.css";

const description =
  "The public home for ExpansionPunks fully onchain migration, collection history, and final DAO execution.";
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const metadataBase =
  configuredSiteUrl && URL.canParse(configuredSiteUrl)
    ? new URL(configuredSiteUrl)
    : undefined;

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "ExpansionPunks Next",
    template: "%s | ExpansionPunks Next",
  },
  description,
  icons: { icon: "/punks/punk18108.png" },
  openGraph: {
    type: "website",
    siteName: "ExpansionPunks Next",
    title: "ExpansionPunks Next",
    description,
  },
  twitter: {
    card: "summary",
    title: "ExpansionPunks Next",
    description,
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <TestnetBanner />
        <WalletProviders>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </WalletProviders>
      </body>
    </html>
  );
}
