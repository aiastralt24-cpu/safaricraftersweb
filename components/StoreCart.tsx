"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ShoppingBag, X, Minus, Plus, ArrowRight } from "lucide-react";
import type { CartMoney, StoreCart } from "@/lib/cart-types";
import "./StoreCart.css";

const CartContext = createContext<{
  cart: StoreCart | null; busy: boolean; open: () => void;
  change: (action: "add" | "update" | "remove", quantity?: number, lineId?: string) => Promise<void>;
} | null>(null);
export function useStoreCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("Store cart provider missing");
  return context;
}
const money = (value: CartMoney) => new Intl.NumberFormat("en-IN", { style: "currency", currency: value.currencyCode, maximumFractionDigits: 2 }).format(Number(value.amount));

export function CartButton() {
  const { cart, open } = useStoreCart();
  return <button className="cart-header-button" onClick={open} aria-label={`Open shopping bag, ${cart?.totalQuantity ?? 0} items`}><ShoppingBag size={19} /><span>{cart?.totalQuantity ?? 0}</span></button>;
}

export function StoreCartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<StoreCart | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [opened, setOpened] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);
  const open = () => { trigger.current = document.activeElement as HTMLElement; setOpened(true); };
  const close = () => { setOpened(false); trigger.current?.focus(); };
  async function refresh() {
    try {
      const response = await fetch("/api/shopify/cart", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCart(data.cart); setError("");
    } catch { setError("Unable to load your bag. Please try again."); }
  }
  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    if (!opened) { dialog.current?.close(); return; }
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [opened]);
  async function change(action: "add" | "update" | "remove", quantity = 1, lineId?: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    if (action === "add") open();
    try {
      const response = await fetch("/api/shopify/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, quantity, lineId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCart(data.cart);
    } catch (error) { setError(error instanceof Error ? error.message : "Please try again."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <CartContext.Provider value={{ cart, busy, open, change }}>
    {children}
    <dialog ref={dialog} className="shopping-bag" aria-labelledby="shopping-bag-title" onCancel={close} onClick={event => { if (event.target === dialog.current) close(); }}>
      <div className="shopping-bag-panel">
        <header><div><p>Safari Crafters</p><h2 id="shopping-bag-title">Your bag <span>({cart?.totalQuantity ?? 0})</span></h2></div><button onClick={close} aria-label="Close shopping bag"><X /></button></header>
        <div className="shopping-bag-content" aria-busy={busy}>
          {error && <div className="cart-error" role="alert">{error} <button disabled={busy} onClick={() => void refresh()}>Reload bag</button></div>}
          {!cart?.lines.nodes.length ? <div className="cart-empty"><ShoppingBag size={40} strokeWidth={1} /><h3>{busy ? "Adding to your bag…" : "A little of the wild, to keep."}</h3><p>Your chosen pieces will appear here.</p><button onClick={close}>Continue exploring <ArrowRight size={16} /></button></div> : cart.lines.nodes.map(line => <article className="cart-line" key={line.id}>
            {line.merchandise.image && <img src={line.merchandise.image.url} alt={line.merchandise.image.altText || line.merchandise.product.title} width={90} height={110} />}
            <div><h3>{line.merchandise.product.title}</h3>{line.merchandise.title !== "Default Title" && <p>{line.merchandise.title}</p>}<p>{money(line.cost.totalAmount)}</p>
              <div className="cart-line-actions"><div className="cart-stepper"><button disabled={busy || line.quantity <= 1} onClick={() => void change("update", line.quantity - 1, line.id)} aria-label={`Decrease quantity of ${line.merchandise.product.title}`}><Minus size={14}/></button><span>{line.quantity}</span><button disabled={busy || line.quantity >= 10} onClick={() => void change("update", line.quantity + 1, line.id)} aria-label={`Increase quantity of ${line.merchandise.product.title}`}><Plus size={14}/></button></div><button disabled={busy} className="cart-remove" onClick={() => void change("remove", 1, line.id)}>Remove</button></div>
            </div>
          </article>)}
          <p role="status" className="cart-status">{busy ? "Updating your bag…" : ""}</p>
        </div>
        {!!cart?.lines.nodes.length && <footer><div><span>Subtotal</span><strong>{money(cart.cost.subtotalAmount)}</strong></div><p>Shipping and taxes calculated at checkout.</p><button className="cart-checkout" disabled={busy || !!error} onClick={() => window.location.assign(cart.checkoutUrl)}>Checkout <ArrowRight size={18}/></button><small>Secure checkout with Shopify</small><button className="cart-continue" onClick={close}>Continue shopping</button></footer>}
      </div>
    </dialog>
  </CartContext.Provider>;
}
