import { redirect } from "next/navigation";

// The XIP 24 / XIP 25 entrypoint consolidated onto /migration. Keep the old
// path working for any existing deep links.
export default function XipsRedirect() {
  redirect("/migration");
}
