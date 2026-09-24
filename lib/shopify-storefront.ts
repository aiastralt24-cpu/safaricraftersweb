const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? "m3fpxb-r1.myshopify.com";
const SHOPIFY_API_VERSION = "2026-07";
const SHOPIFY_ENDPOINT = `https://${SHOPIFY_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

type ShopifyGraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

async function shopifyRequest<T>(query: string, variables?: Record<string, unknown>) {
  const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  const headers: HeadersInit = { "Content-Type": "application/json" };

  if (token) headers["X-Shopify-Storefront-Access-Token"] = token;

  const response = await fetch(SHOPIFY_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    cache: "no-store"
  });

  if (!response.ok) throw new Error(`Shopify request failed with ${response.status}`);

  const payload = await response.json() as ShopifyGraphQLResponse<T>;
  if (payload.errors?.length) throw new Error(payload.errors[0].message);
  if (!payload.data) throw new Error("Shopify returned no data");

  return payload.data;
}

type BookProductResult = {
  product: null | {
    id: string;
    title: string;
    availableForSale: boolean;
    variants: {
      nodes: Array<{
        id: string;
        availableForSale: boolean;
        price: { amount: string; currencyCode: string };
      }>;
    };
  };
};

export async function getShopifyBook() {
  const data = await shopifyRequest<BookProductResult>(`
    query SafariCraftersBook {
      product(handle: "the-ghosts-of-the-granite-hills") {
        id
        title
        availableForSale
        variants(first: 10) {
          nodes {
            id
            availableForSale
            price { amount currencyCode }
          }
        }
      }
    }
  `);

  const variant = data.product?.variants.nodes.find((item) => item.availableForSale);
  return data.product && variant ? { product: data.product, variant } : null;
}

type CartCreateResult = {
  cartCreate: {
    cart: null | { id: string; checkoutUrl: string; totalQuantity: number };
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
};

export async function createBookCheckout(quantity = 1) {
  const book = await getShopifyBook();
  if (!book) throw new Error("The book is currently unavailable");

  const data = await shopifyRequest<CartCreateResult>(`
    mutation CreateSafariCraftersCheckout($input: CartInput!) {
      cartCreate(input: $input) {
        cart { id checkoutUrl totalQuantity }
        userErrors { field message }
      }
    }
  `, {
    input: {
      lines: [{ merchandiseId: book.variant.id, quantity }]
    }
  });

  const error = data.cartCreate.userErrors[0];
  if (error) throw new Error(error.message);
  if (!data.cartCreate.cart?.checkoutUrl) throw new Error("Shopify did not return a checkout URL");

  return data.cartCreate.cart;
}


const cartFields = `id checkoutUrl totalQuantity cost { subtotalAmount { amount currencyCode } }
  lines(first: 100) { nodes { id quantity cost { totalAmount { amount currencyCode } }
    merchandise { ... on ProductVariant { id title image { url altText } product { title } } } } }`;

export async function readStoreCart(id: string) {
  const data = await shopifyRequest<{ cart: import("./cart-types").StoreCart | null }>(
    `query StoreCart($id: ID!) { cart(id: $id) { ${cartFields} } }`, { id });
  return data.cart;
}

export async function changeStoreCart(id: string | undefined, action: "add" | "update" | "remove", quantity: number, lineId?: string) {
  let operation: string;
  let declaration: string;
  let argumentsText: string;
  let variables: Record<string, unknown>;
  if (action === "add") {
    const book = await getShopifyBook();
    if (!book) throw new Error("The book is currently unavailable.");
    const lines = [{ merchandiseId: book.variant.id, quantity }];
    operation = id ? "cartLinesAdd" : "cartCreate";
    declaration = id ? "$cartId: ID!, $lines: [CartLineInput!]!" : "$input: CartInput!";
    argumentsText = id ? "cartId: $cartId, lines: $lines" : "input: $input";
    variables = id ? { cartId: id, lines } : { input: { lines } };
  } else {
    operation = action === "update" ? "cartLinesUpdate" : "cartLinesRemove";
    declaration = action === "update" ? "$cartId: ID!, $lines: [CartLineUpdateInput!]!" : "$cartId: ID!, $lineIds: [ID!]!";
    argumentsText = action === "update" ? "cartId: $cartId, lines: $lines" : "cartId: $cartId, lineIds: $lineIds";
    variables = action === "update" ? { cartId: id, lines: [{ id: lineId, quantity }] } : { cartId: id, lineIds: [lineId] };
  }
  const data = await shopifyRequest<Record<string, { cart: import("./cart-types").StoreCart | null; userErrors: { message: string }[] }>>(
    `mutation StoreCartChange(${declaration}) { ${operation}(${argumentsText}) { cart { ${cartFields} } userErrors { message } } }`, variables);
  const result = data[operation];
  if (result.userErrors.length || !result.cart) throw new Error(result.userErrors[0]?.message || "Your bag could not be updated.");
  return result.cart;
}
