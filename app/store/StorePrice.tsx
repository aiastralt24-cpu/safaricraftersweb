import type { StoreProduct } from "@/lib/store";

export default function StorePrice({ product }: { product: Pick<StoreProduct, "price" | "originalPrice" | "offerLabel"> }) {
  return <span className="store-offer-price">
    {product.originalPrice && <del aria-label={`Original price ${product.originalPrice}`}>{product.originalPrice}</del>}
    <strong>{product.price}</strong>
    {product.offerLabel && <small>{product.offerLabel}</small>}
  </span>;
}
