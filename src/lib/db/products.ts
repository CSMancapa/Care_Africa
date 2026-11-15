/**
 * Products in the new schema, in the shape the Inventory and Sales screens
 * use (Product in ProductFormModal.tsx).
 *
 *   products        cost (shown as cost_price), reorder_level (min_stock_level),
 *                   plus the form's extra fields added in 0005
 *   product_images  one row per photo; the file lives in the product-images bucket
 */
import { supabase } from "@/config/supabase";
import type { CreateProductInput, Product } from "@/components/Products/ProductFormModal";

const BUCKET = "product-images";

const SELECT =
  "id, practice_id, name, description, sku, price, cost, current_stock, reorder_level, category, " +
  "is_online, is_in_practice, discount, is_discount_percentage, has_multiple_sizes, sizes, " +
  "created_at, updated_at, product_images(storage_path, position)";

function check(error: { message: string } | null, what = "") {
  if (error) throw new Error(what ? `${what}: ${error.message}` : error.message);
}

function toUiProduct(r: any, pointsPct = 10): Product {
  const images = [...(r.product_images ?? [])]
    .sort((a: any, b: any) => a.position - b.position)
    .map((i: any) => ({
      url: i.storage_path.startsWith("http")
        ? i.storage_path
        : supabase.storage.from(BUCKET).getPublicUrl(i.storage_path).data.publicUrl,
    }));
  const price = Number(r.price);
  return {
    id: r.id,
    practice_id: r.practice_id,
    name: r.name,
    description: r.description ?? "",
    sku: r.sku ?? "",
    category: r.category ?? "",
    price,
    cost_price: r.cost === null ? 0 : Number(r.cost),
    current_stock: r.current_stock,
    min_stock_level: r.reorder_level,
    is_online: r.is_online,
    is_in_practice: r.is_in_practice,
    points_earned: Math.floor((price * pointsPct) / 100),
    discount: Number(r.discount),
    is_discount_percentage: r.is_discount_percentage,
    has_multiple_sizes: r.has_multiple_sizes,
    sizes: r.sizes ?? [],
    images,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function listProducts(practiceId: string): Promise<Product[]> {
  const [{ data, error }, { data: practice }] = await Promise.all([
    supabase.from("products").select(SELECT).eq("practice_id", practiceId).is("deleted_at", null).order("name"),
    supabase.from("practices").select("percentage_reward").eq("id", practiceId).single(),
  ]);
  check(error);
  const pct = Number(practice?.percentage_reward ?? 10);
  return (data ?? []).map((r) => toUiProduct(r, pct));
}

function toRow(p: CreateProductInput) {
  return {
    practice_id: p.practice_id,
    name: p.name.trim(),
    description: p.description || null,
    sku: p.sku?.trim() || null,
    category: p.category || null,
    price: Number(p.price) || 0,
    cost: p.cost_price === undefined || p.cost_price === null ? null : Number(p.cost_price),
    current_stock: Math.round(Number(p.current_stock) || 0),
    reorder_level: Math.round(Number(p.min_stock_level) || 0),
    is_online: !!p.is_online,
    is_in_practice: p.is_in_practice !== false,
    discount: Number(p.discount) || 0,
    is_discount_percentage: !!p.is_discount_percentage,
    has_multiple_sizes: !!p.has_multiple_sizes,
    sizes: p.sizes ?? [],
  };
}

/**
 * Save the product's photos. Photos picked in the form are temporary
 * browser links (blob:...); upload those, keep the rest, and replace the
 * product's photo list.
 */
async function saveImages(practiceId: string, productId: string, images: { url: string }[]) {
  const paths: string[] = [];
  for (const img of images) {
    if (img.url.startsWith("blob:")) {
      const blob = await (await fetch(img.url)).blob();
      const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
      const path = `${practiceId}/${productId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type });
      check(error, "Uploading photo");
      paths.push(path);
    } else {
      // An existing photo: store the bucket path, not the full public URL.
      const marker = `/object/public/${BUCKET}/`;
      paths.push(img.url.includes(marker) ? img.url.split(marker)[1] : img.url);
    }
  }
  const { error: delError } = await supabase.from("product_images").delete().eq("product_id", productId);
  check(delError, "Saving photos");
  if (paths.length) {
    const { error } = await supabase
      .from("product_images")
      .insert(paths.map((storage_path, position) => ({ product_id: productId, storage_path, position })));
    check(error, "Saving photos");
  }
}

export async function createProduct(product: CreateProductInput): Promise<Product> {
  const { data, error } = await supabase.from("products").insert(toRow(product)).select("id").single();
  check(error, "Error creating product");
  await saveImages(product.practice_id, data.id, product.images ?? []);
  return (await listProducts(product.practice_id)).find((p) => p.id === data.id)!;
}

export async function updateProduct(id: string, product: CreateProductInput) {
  const { error } = await supabase.from("products").update(toRow(product)).eq("id", id);
  check(error, "Error updating product");
  await saveImages(product.practice_id, id, product.images ?? []);
}

export async function archiveProduct(id: string) {
  const { error } = await supabase.from("products").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  check(error);
}
