import Link from "next/link";
import { navigation } from "@/lib/site-data";
import { stageConfig } from "@/lib/stage";
import { HeaderMorphPunk } from "@/components/reform/HeaderMorphPunk";
import { WalletButton } from "@/components/wallet/WalletButton";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="ExpansionPunks Next home">
        <HeaderMorphPunk />
        <span>
          ExpansionPunks <strong>Next</strong>
        </span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        {navigation.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      {stageConfig.walletEnabled ? <WalletButton /> : null}
    </header>
  );
}
