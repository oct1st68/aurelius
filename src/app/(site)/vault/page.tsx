import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { getVault } from "@/lib/services/cart-service";
import { getBrandById } from "@/lib/services/listing-service";
import { formatMoney } from "@/core/money";
import { VaultRemoveButton } from "@/components/commerce/vault-remove-button";

export const metadata = { title: "The Vault" };

/** THE VESTA VAULT — server-side saved collection (never localStorage-only). */
export default async function VaultPage() {
  const auth = await getSession();
  if (!auth) redirect("/login?redirectTo=/vault");

  const entries = await getVault(auth.user.id);

  return (
    <div className="museum-page">
      <p className="eyebrow">Vesta · Keeper of the Hearth</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">Your Vault</h1>
      <p className="mt-3 text-sm text-travertine/65">
        A private, server-side collection — saved watches follow you across devices.
      </p>
      <div className="gold-rule mt-6" />

      {entries.length === 0 ? (
        <div className="panel mt-10 p-16 text-center">
          <p className="font-serif-lux text-xl italic text-travertine/70">
            Your vault is sealed and empty.
          </p>
          <Link href="/watches" className="btn-imperial btn-solid mt-8">
            Discover pieces
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {entries.map(({ entry, listing }) => (
            <VaultRow key={entry.id} entryId={entry.id} listingId={listing.id} listing={listing} brandName="" />
          ))}
        </div>
      )}
    </div>
  );
}

async function VaultRow({
  entryId,
  listingId,
  listing,
  brandName,
}: {
  entryId: string;
  listingId: string;
  listing: Awaited<ReturnType<typeof getVault>>[number]["listing"];
  brandName: string;
}) {
  void entryId;
  const brand = await getBrandById(listing.brandId).catch(() => null);
  const image = listing.images[0];
  return (
    <div className="panel flex items-center gap-5 p-4">
      <Link href={`/watches/${listing.slug}`} className="shrink-0">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/media/${image.path}`}
            alt={image.alt}
            loading="lazy"
            className="h-24 w-20 border border-gold/15 object-cover"
          />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.25em] text-bronze">
          {(brand ?? { name: brandName }).name}
        </p>
        <Link href={`/watches/${listing.slug}`} className="font-serif-lux block truncate text-lg text-ivory hover:text-gold">
          {listing.model}
        </Link>
        <p className="text-xs text-travertine/50">
          Ref. {listing.referenceNumber} ·{" "}
          <span className={listing.status === "PUBLISHED" ? "text-emerald-400" : "text-red-400"}>
            {listing.status.toLowerCase()}
          </span>
        </p>
        {entryId && null}
      </div>
      <div className="text-right">
        <p className="font-display text-gold">{formatMoney(listing.price)}</p>
        <VaultRemoveButton listingId={listingId} />
      </div>
    </div>
  );
}
