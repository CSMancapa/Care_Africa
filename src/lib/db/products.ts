import { supabase } from '@/config/supabase';
import { CreateProductInput, Product } from '@/components/Products/ProductFormModal';

export async function createProduct(product: CreateProductInput): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Error creating product: ${error.message}`);
  }

  return data;
}

export async function updateProduct(id: string, product: CreateProductInput) {
  const { data, error } = await supabase
    .from('products')
    .update(product)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Detailed error:', error);
    throw new Error(`Error updating product: ${error.message}`);
  }

  return data;
}