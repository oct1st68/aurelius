"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ShieldCheck } from "lucide-react";
import { formatMoney } from "@/core/money";

interface Item {
  listingId: string;
  model: string;
  brandId: string;
  ref: string;
  priceCents: number;
  image: string;
  shippingCents: number;
  insuranceCents: number;
}

const TEST_CARDS = [
  { label: "Success", card: "4242 4242 4242 4242" },
  { label: "Declined", card: "4000 0000 0000 0002" },
  { label: "Insufficient funds", card: "4000 0000 0000 9995" },
];

export function CheckoutList({ items, grandTotal }: { items: Item[]; grandTotal: string }) {
  const router = useRouter();
  const [shipping, setShipping] = useState({
    fullName: "",
    line1: "",
    line2: "",
    city: "",
    postalCode: "",
    country: "",
    phone: "",
  });
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [exp, setExp] = useState("12/29");
  const [cvc, setCvc] = useState("123");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ model: string; orderId: string; ok: boolean }[]>([]);

  async function submit() {
    setBusy(true);
    setError(null);
    setResults([]);
    try {
      const [mmRaw, yyRaw] = exp.split("/");
      const mm = Number(mmRaw?.trim() ?? 0);
      const yyRawNum = Number(yyRaw?.trim() ?? 0);
      const yy = yyRawNum < 100 ? 2000 + yyRawNum : yyRawNum;
      for (const item of items) {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listingId: item.listingId,
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
        const data = (await res.json()) as { ok: boolean; error?: string; orderId?: string };
        if (!res.ok || !data.ok) {
          setError(data.error ?? "Checkout failed.");
          setResults((prev) => [...prev, { model: item.model, orderId: "", ok: false }]);
          break;
        }
        setResults((prev) => [...prev, { model: item.model, orderId: data.orderId ?? "", ok: true }]);
      }
      router.refresh();
      if (!error) {
        const okCount = results.filter((r) => r.ok).length;
        if (okCount === items.length) router.push("/account/orders");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
      <div className="space-y-8">
        <section aria-labelledby="ship-heading" className="panel p-6">
          <h2 id="ship-heading" className="font-display text-sm tracking-[0.25em] text-gold">
            SHIPPING & BILLING
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
      </div>

      <aside className="panel h-fit p-6 lg:sticky lg:top-20" aria-label="Order summary">
        <h2 className="font-display text-sm tracking-[0.25em] text-gold">ORDER SUMMARY</h2>
        <ul className="mt-5 space-y-4">
          {items.map((item) => (
            <li key={item.listingId} className="flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/media/${item.image}`} alt="" className="h-16 w-14 border border-gold/15 object-cover" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate text-ivory">{item.model}</p>
                <p className="text-xs text-bronze">Ref. {item.ref}</p>
                <p className="mt-1 text-xs text-travertine/60">
                  {formatMoney({ amountCents: item.priceCents, currency: "USD" })} + ship{" "}
                  {formatMoney({ amountCents: item.shippingCents, currency: "USD" })} + ins{" "}
                  {formatMoney({ amountCents: item.insuranceCents, currency: "USD" })}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="my-5 gold-rule" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-travertine/70">Total</span>
          <span className="font-display text-xl text-gold">{grandTotal}</span>
        </div>
        {error && (
          <p role="alert" className="mt-4 border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-400">
            {error}
          </p>
        )}
        {results.length > 0 && (
          <ul className="mt-4 space-y-1 text-xs">
            {results.map((r, i) => (
              <li key={i} className={r.ok ? "text-emerald-400" : "text-red-400"}>
                {r.ok ? "✓" : "✗"} {r.model}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="btn-imperial btn-solid mt-6 w-full"
        >
          <ShieldCheck className="h-4 w-4" aria-hidden />
          {busy ? "Securing payment…" : "Pay & Place Orders"}
        </button>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-bronze">
          Funds are held in escrow-style custody until authentication
          completes and delivery is confirmed.
        </p>
      </aside>
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
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div className={className}>
      <label htmlFor={id} className="label-imperial">
        {label}
      </label>
      <input
        id={id}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="input-imperial"
      />
    </div>
  );
}
