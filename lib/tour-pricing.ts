/** Keep supplied currencies and qualifiers; never infer an exchange rate or price. */
export function tourPriceLabel(price?: string) {
  if (!price || /^(on request|price on request|to be confirmed)$/i.test(price.trim())) return "Price on request";
  return `Starting From ${price.replace(/^(starting\s+from|from)\s+/i, "").trim()}`;
}
