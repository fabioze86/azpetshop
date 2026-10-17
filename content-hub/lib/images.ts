import { slugify } from "./slug.ts";

const DELIVERY_HASH = process.env.CLOUDFLARE_IMAGES_DELIVERY_HASH?.trim() || "7gejTBBL2EU6tOfD2F5Elw";

// URL de entrega do Cloudflare Images para uma imagem de produto do post. O ID
// customizado ("posts/<categoria>/<slug>/<produto>") é o mesmo que
// scripts/upload-image.mjs gera, e não tem extensão.
export function imageDeliveryUrl(categoria: string, slug: string, produtoNome: string): string {
  return `https://imagedelivery.net/${DELIVERY_HASH}/posts/${categoria}/${slug}/${slugify(produtoNome)}/public`;
}
