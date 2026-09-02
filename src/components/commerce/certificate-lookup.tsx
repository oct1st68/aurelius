"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CertificateLookup({ initialNumber }: { initialNumber: string }) {
  const [value, setValue] = useState(initialNumber);
  const router = useRouter();
  return (
    <form
      className="mt-8 flex gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) router.push(`/certificate?number=${encodeURIComponent(value.trim())}`);
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="AUR-2025-000001"
        aria-label="Certificate number"
        className="input-imperial font-mono"
      />
      <button type="submit" className="btn-imperial btn-solid shrink-0">
        Verify
      </button>
    </form>
  );
}
