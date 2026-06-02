type StatusLineProps = {
  children: string;
  status?: "done" | "current" | "open";
};

export function StatusLine({ children, status = "open" }: StatusLineProps) {
  return (
    <div className={`status-line ${status}`}>
      <i aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
