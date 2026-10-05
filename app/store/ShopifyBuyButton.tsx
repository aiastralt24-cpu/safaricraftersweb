"use client";

import { useStoreCart } from "@/components/StoreCart";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

export default function ShopifyBuyButton({
  className = "",
  label = "Order the book",
  showQuantity = false
}: {
  className?: string;
  label?: string;
  showQuantity?: boolean;
}) {
  const { busy, change } = useStoreCart();
  const [quantity, setQuantity] = useState(1);
  const text = busy ? "Adding to bag…" : quantity > 1 ? `Add ${quantity} copies to bag` : "Add to bag";

  const orderButton = (
    <button
      className={`store-acquire ${className}`.trim()}
      type="button"
      onClick={() => void change("add", quantity)}
      disabled={busy}
      aria-live="polite"
    >
      <span>{text}</span>
      <ArrowUpRight size={15} aria-hidden="true" />
    </button>
  );

  if (!showQuantity) return orderButton;

  return (
    <div className="store-shopify-purchase">
      <div className="store-quantity-control">
        <span>Copies</span>
        <div className="store-quantity-stepper">
          <button
            type="button"
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
            disabled={quantity === 1 || busy}
            aria-label="Decrease number of copies"
          >
            −
          </button>
          <output aria-live="polite" aria-label={`${quantity} ${quantity === 1 ? "copy" : "copies"}`}>
            {quantity}
          </output>
          <button
            type="button"
            onClick={() => setQuantity((current) => Math.min(10, current + 1))}
            disabled={quantity === 10 || busy}
            aria-label="Increase number of copies"
          >
            +
          </button>
        </div>
      </div>
      {orderButton}
    </div>
  );
}
