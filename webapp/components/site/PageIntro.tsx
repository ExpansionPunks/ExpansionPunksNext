import type { ReactNode } from "react";

type PageIntroProps = {
  title: string;
  lead: string;
  children?: ReactNode;
  tone?: "paper" | "amber";
  accent?: "plum" | "blue" | "magenta" | "green";
};

export function PageIntro({
  title,
  lead,
  children,
  tone = "paper",
  accent,
}: PageIntroProps) {
  return (
    <section className={`page-intro ${tone}`} data-accent={accent}>
      <div className="inner">
        <h1>{title}</h1>
        <p>{lead}</p>
        {children ? <div className="intro-actions">{children}</div> : null}
      </div>
    </section>
  );
}
