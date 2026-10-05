export type CartMoney = { amount: string; currencyCode: string };
export type StoreCart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { subtotalAmount: CartMoney };
  lines: { nodes: Array<{
    id: string;
    quantity: number;
    cost: { totalAmount: CartMoney };
    merchandise: { id: string; title: string; product: { title: string }; image: { url: string; altText: string | null } | null };
  }> };
};
