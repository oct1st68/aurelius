"use client";

import { becomeSellerAction } from "@/app/(site)/actions/seller-actions";

export function BecomeSellerButton() {
  return (
    <form action={becomeSellerAction} className="mt-8">
      <button type="submit" className="btn-imperial btn-solid">
        Claim the Merchant Role
      </button>
    </form>
  );
}
