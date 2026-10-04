// Domínio da loja irmã (e-commerce), confirmado no ar em 2026-10-03.
export const STORE_BASE_URL = "https://loja.azpetshop.com.br";

// Monta a URL de um produto próprio com UTM de atribuição, para medir no
// analytics da loja quais posts do blog geram cotação/venda.
export function storeProductUrl(productId: string, campaignSlug: string): string {
  const url = new URL(`/produtos/${productId}`, STORE_BASE_URL);
  url.searchParams.set("utm_source", "blog");
  url.searchParams.set("utm_medium", "own-store");
  url.searchParams.set("utm_campaign", campaignSlug);
  return url.toString();
}
