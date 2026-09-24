import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { changeStoreCart, readStoreCart } from "@/lib/shopify-storefront";

const cookieName = "safari-cart";
export async function GET() {
  try {
    const id = (await cookies()).get(cookieName)?.value;
    return NextResponse.json({ cart: id ? await readStoreCart(id) : null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to load your bag. Please try again." }, { status: 502 });
  }
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const { action, quantity = 1, lineId } = body ?? {};
  if (!["add", "update", "remove"].includes(action) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10 || (action !== "add" && typeof lineId !== "string")) {
    return NextResponse.json({ error: "Choose a quantity between 1 and 10." }, { status: 400 });
  }
  try {
    const jar = await cookies();
    let id = jar.get(cookieName)?.value;
    const existing = id ? await readStoreCart(id) : null;
    if (!existing) id = undefined;
    if (action !== "add" && !existing) return NextResponse.json({ error: "Your bag has expired. Please add your items again." }, { status: 409 });
    if (action !== "add" && !existing?.lines.nodes.some(line => line.id === lineId)) return NextResponse.json({ error: "This item is no longer in your bag." }, { status: 400 });
    if (action === "add" && (existing?.totalQuantity ?? 0) + quantity > 10) return NextResponse.json({ error: "You can order up to 10 copies at a time." }, { status: 400 });
    const cart = await changeStoreCart(id, action, quantity, lineId);
    jar.set(cookieName, cart.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 14 });
    return NextResponse.json({ cart });
  } catch (error) {
    console.error("Store cart error", error);
    return NextResponse.json({ error: "We couldn’t update your bag. Please try again; the item may be unavailable." }, { status: 502 });
  }
}
