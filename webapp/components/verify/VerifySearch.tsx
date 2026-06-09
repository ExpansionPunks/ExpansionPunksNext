"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TOKEN_MAX, TOKEN_MIN, isValidTokenId } from "@/lib/verify-config";

export function VerifySearch({ initial }: { initial?: number }) {
  const router = useRouter();
  const [value, setValue] = useState(initial ? String(initial) : "");
  const [hint, setHint] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = Number(value.trim());
    if (!isValidTokenId(id)) {
      setHint(`Enter a punk ID between ${TOKEN_MIN} and ${TOKEN_MAX}.`);
      return;
    }
    setHint(null);
    router.push(`/migration/verify/${id}`);
  }

  return (
    <form className="verify-search" onSubmit={submit}>
      <label htmlFor="verify-id">Punk ID</label>
      <input
        id="verify-id"
        inputMode="numeric"
        placeholder="e.g. 10036"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button className="button primary" type="submit">
        Verify
      </button>
      {hint ? <span className="verify-hint">{hint}</span> : null}
    </form>
  );
}
