import Link from "next/link";
import type { ReactNode } from "react";

type ButtonLinkProps = {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary" | "dark";
};

export function ButtonLink({
  children,
  href,
  variant = "secondary",
}: ButtonLinkProps) {
  return (
    <Link className={`button ${variant}`} href={href}>
      {children}
    </Link>
  );
}
