function getConfig() {
  const store = process.env.SHOPIFY_STORE;
  const token = process.env.SHOPIFY_ACCESS_TOKEN;
  const version = process.env.SHOPIFY_API_VERSION || '2024-01';
  if (!store || !token) {
    throw new Error('SHOPIFY_STORE y SHOPIFY_ACCESS_TOKEN deben estar en .env');
  }
  return {
    baseUrl: `https://${store}/admin/api/${version}`,
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
  };
}

export interface ShopifyImage {
  id: number;
  src: string;
  alt: string | null;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  images: ShopifyImage[];
  options: {
    name: string;
    values: string[];
  }[];
  variants: {
    id: number;
    title: string;
    price: string;
    compare_at_price: string | null;
  }[];
}

export interface ShopifyCollection {
  id: number;
  title: string;
  body_html: string;
  image?: {
    src: string;
    alt: string | null;
  };
  products_count?: number;
}

async function shopifyFetch<T>(endpoint: string): Promise<T> {
  const { baseUrl, headers } = getConfig();
  const res = await fetch(`${baseUrl}${endpoint}`, { headers });
  if (!res.ok) {
    throw new Error(`Shopify API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function getCollections(): Promise<ShopifyCollection[]> {
  const [custom, smart] = await Promise.all([
    shopifyFetch<{ custom_collections: ShopifyCollection[] }>('/custom_collections.json?limit=250'),
    shopifyFetch<{ smart_collections: ShopifyCollection[] }>('/smart_collections.json?limit=250'),
  ]);
  return [...custom.custom_collections, ...smart.smart_collections];
}

export async function getCollectionProductCount(collectionId: number): Promise<number> {
  const data = await shopifyFetch<{ products: { id: number }[] }>(
    `/collections/${collectionId}/products.json?limit=250&fields=id`
  );
  return data.products.length;
}

export async function getCollectionProducts(collectionId: number): Promise<ShopifyProduct[]> {
  // Paso 1: obtener IDs de productos de la colección
  const data = await shopifyFetch<{ products: { id: number }[] }>(
    `/collections/${collectionId}/products.json?limit=250&fields=id`
  );
  const ids = data.products.map(p => p.id);
  if (ids.length === 0) return [];

  // Paso 2: obtener productos completos (con variants, images, etc.) en batches de 250
  const allProducts: ShopifyProduct[] = [];
  for (let i = 0; i < ids.length; i += 250) {
    const batch = ids.slice(i, i + 250);
    const full = await shopifyFetch<{ products: ShopifyProduct[] }>(
      `/products.json?ids=${batch.join(',')}&limit=250`
    );
    allProducts.push(...full.products);
  }

  return allProducts;
}

export async function getProductsByIds(ids: number[]): Promise<ShopifyProduct[]> {
  const data = await shopifyFetch<{ products: ShopifyProduct[] }>(
    `/products.json?ids=${ids.join(',')}&limit=250`
  );
  return data.products;
}
