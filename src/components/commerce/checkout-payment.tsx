"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ShieldCheck } from "lucide-react";

const TEST_CARDS = [
  { label: "Success", card: "4242 4242 4242 4242" },
  { label: "Declined", card: "4000 0000 0000 0002" },
  { label: "Requires action (3DS)", card: "4000 0000 0000 3220" },
  { label: "Insufficient funds", card: "4000 0000 0000 9995" },
];

/** Payment form for a single order — talks to /api/checkout/[orderId]. */
export function CheckoutPayment({ orderId, totalLabel }: { orderId: string; totalLabel: string }) {
  const router = useRouter();
  const [shipping, setShipping] = useState({ fullName: "", line1: "", line2: "", city: "", postalCode: "", country: "", phone: "" });
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [exp, setExp] = useState("12/29");
  const [cvc, setCvc] = useState("123");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const [mmRaw, yyRaw] = exp.split("/");
      const mm = Number(mmRaw?.trim() ?? 0);
      const yyNum = Number(yyRaw?.trim() ?? 0);
      const yy = yyNum < 100 ? 2000 + yyNum : yyNum;
      const res = await fetch(`/api/checkout/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipping: {
            fullName: shipping.fullName,
            line1: shipping.line1,
            line2: shipping.line2 || null,
            city: shipping.city,
            postalCode: shipping.postalCode,
            country: shipping.country,
            phone: shipping.phone || null,
          },
          cardNumber: card,
          cardExpMonth: mm,
          cardExpYear: yy,
          cardCvc: cvc,
          cardholderName: name,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; requiresAction?: boolean };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Checkout failed.");
        return;
      }
      router.push(`/orders/${orderId}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="ship-heading" className="panel p-6">
        <h2 id="ship-heading" className="font-display text-sm tracking-[0.25em] text-gold">
          SHIPPING DETAILS
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Full name" value={shipping.fullName} onChange={(v) => setShipping((s) => ({ ...s, fullName: v }))} autoComplete="name" />
          <Field label="Phone (optional)" value={shipping.phone} onChange={(v) => setShipping((s) => ({ ...s, phone: v }))} autoComplete="tel" />
          <Field label="Address line 1" value={shipping.line1} onChange={(v) => setShipping((s) => ({ ...s, line1: v }))} autoComplete="address-line1" className="sm:col-span-2" />
          <Field label="Address line 2 (optional)" value={shipping.line2} onChange={(v) => setShipping((s) => ({ ...s, line2: v }))} autoComplete="address-line2" className="sm:col-span-2" />
          <Field label="City" value={shipping.city} onChange={(v) => setShipping((s) => ({ ...s, city: v }))} autoComplete="address-level2" />
          <Field label="Postal code" value={shipping.postalCode} onChange={(v) => setShipping((s) => ({ ...s, postalCode: v }))} autoComplete="postal-code" />
          <Field label="Country" value={shipping.country} onChange={(v) => setShipping((s) => ({ ...s, country: v }))} autoComplete="country-name" className="sm:col-span-2" />
        </div>
      </section>

      <section aria-labelledby="pay-heading" className="panel p-6">
        <h2 id="pay-heading" className="font-display text-sm tracking-[0.25em] text-gold">
          PAYMENT
        </h2>
        <p className="mt-2 flex items-center gap-2 text-xs text-bronze">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Test cards are provided for this environment:
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {TEST_CARDS.map((c) => (
            <button
              key={c.card}
              type="button"
              onClick={() => setCard(c.card)}
              className={`badge ${card === c.card ? "border-gold text-gold" : "opacity-60"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Card number" value={card} onChange={setCard} className="sm:col-span-2" />
          <Field label="Cardholder name" value={name} onChange={setName} className="sm:col-span-2" autoComplete="cc-name" />
          <Field label="Expiry (MM/YY)" value={exp} onChange={setExp} autoComplete="cc-exp" />
          <Field label="CVC" value={cvc} onChange={setCvc} autoComplete="cc-csc" />
        </div>
      </section>

      {error && (
        <p role="alert" className="border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
          {error}
        </p>
      )}

      <button type="button" onClick={submit} disabled={busy} className="btn-imperial btn-solid w-full">
        <ShieldCheck className="h-4 w-4" aria-hidden />
        {busy ? "Securing payment…" : `Pay ${totalLabel} & Place Order`}
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className = "",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  autoComplete?: string;
}) {
  const id = `co-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label-imperial">
        {label}
      </label>
      <input id={id} value={value} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} className="input-imperial" />
    </div>
  );
}
