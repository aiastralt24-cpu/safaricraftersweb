import { NextResponse } from "next/server";
import { createBookCheckout } from "@/lib/shopify-storefront";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestedQuantity = Number(body?.quantity ?? 1);
    const quantity = Number.isInteger(requestedQuantity)
      ? Math.min(Math.max(requestedQuantity, 1), 10)
      : 1;

    const cart = await createBookCheckout(quantity);
    return NextResponse.json({
      checkoutUrl: cart.checkoutUrl,
      totalQuantity: cart.totalQuantity
    });
  } catch (error) {
    console.error("Unable to create Shopify checkout", error);
    return NextResponse.json(
      { error: "Checkout is temporarily unavailable. Please try again." },
      { status: 502 }
    );
  }
}
