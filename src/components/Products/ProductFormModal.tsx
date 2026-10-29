import React, { useCallback, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Package,
  DollarSign,
  Percent,
  Image as ImageIcon,
  Store,
  AlertTriangle,
  Upload,
  X,
  Plus,
  Minus,
  Gift,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useDropzone } from "react-dropzone";
import { createProduct, updateProduct } from "@/lib/db/products";
import { useCurrentPractice } from "@/hooks/useCurrentPractice";



export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  sku: string;
  price: number;
  cost_price: number;
  current_stock: number;
  min_stock_level: number;
  is_online: boolean;
  is_in_practice: boolean;
  points_earned: number;
  discount: number;
  is_discount_percentage: boolean;
  images: { url: string }[];
  has_multiple_sizes: boolean;
  sizes?: { size: string; stock: number }[];
  practice_id: string;
  created_at: string;
  updated_at: string;
}

export type CreateProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at'>;

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product; // For editing existing product
}

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string(),
  sku: z.string().min(1, "SKU is required"),
  price: z.number().min(0, "Price must be positive"),
  costPrice: z.number().min(0, "Cost price must be positive"),
  currentStock: z.number().min(0, "Stock must be non-negative"),
  minStockLevel: z.number().min(0, "Minimum stock must be non-negative"),
  isOnline: z.boolean(),
  isInPractice: z.boolean(),
  discount: z.number().min(0).max(100),
  isDiscountPercentage: z.boolean(),
  images: z.array(z.object({ url: z.string() })).optional(),
  hasMultipleSizes: z.boolean(),
  sizes: z.array(
    z.object({
      size: z.string(),
      stock: z.number().min(0)
    })
  ).optional(),
});

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  open,
  onOpenChange,
  product,
}) => {
  const currentPracticeId = useCurrentPractice();
  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
      sku: "",
      price: 0,
      costPrice: 0,
      currentStock: 0,
      minStockLevel: 0,
      isOnline: true,
      isInPractice: true,
      discount: 0,
      isDiscountPercentage: true,
      hasMultipleSizes: false,
      sizes: [],
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        category: product.category,
        description: product.description,
        sku: product.sku,
        price: product.price,
        costPrice: product.cost_price,
        currentStock: product.current_stock,
        minStockLevel: product.min_stock_level,
        isOnline: product.is_online,
        isInPractice: product.is_in_practice,
        discount: product.discount,
        isDiscountPercentage: product.is_discount_percentage,
        hasMultipleSizes: product.has_multiple_sizes,
        sizes: product.sizes || [],
        images: product.images,
      });
    }
  }, [product, form]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map(file => ({
      url: URL.createObjectURL(file)
    }));
    
    form.setValue('images', [
      ...(form.getValues('images') || []),
      ...newImages
    ]);
  }, [form]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 5 * 1024 * 1024 // 5MB
  });

  const onSubmit = async (values: z.infer<typeof productSchema>) => {
    try {
      const productInput: CreateProductInput = {
        name: values.name,
        category: values.category,
        description: values.description,
        sku: values.sku,
        price: values.price,
        cost_price: values.costPrice,
        current_stock: values.currentStock,
        min_stock_level: values.minStockLevel,
        is_online: values.isOnline,
        is_in_practice: values.isInPractice,
        points_earned: Math.round(values.price * 0.1),
        discount: values.discount,
        is_discount_percentage: values.isDiscountPercentage,
        images: (values.images || []).filter((img): img is {url: string} => !!img.url),
        has_multiple_sizes: values.hasMultipleSizes,
        sizes: values.sizes?.map(s => ({
          size: s.size || '',
          stock: s.stock || 0
        })),
        practice_id: currentPracticeId
      };
      
      if (product) {
        await updateProduct(product.id, productInput);
      } else {
        await createProduct(productInput);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[90vh] w-full max-w-5xl overflow-hidden flex flex-col">
        <ModalHeader className="space-y-1 p-3">
          <ModalTitle className="text-xl font-bold">
            {product ? "Edit Product" : "Add New Product"}
          </ModalTitle>
          <p className="text-sm text-muted-foreground">Enter the product details below</p>
        </ModalHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1">
            <div className="flex-1 overflow-y-auto px-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-3">
                {/* Basic Details Card */}
                <Card className="p-4 flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-6">
                    <Package className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Basic Details</h3>
                  </div>

                  <div 
                    className="space-y-4 overflow-y-auto" 
                    style={{ 
                      maxHeight: 'calc(80vh - 12rem)',
                      padding: '2px 8px 24px 8px'
                    }}
                  >
                    <FormField
                      control={form.control}
                      name="images"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Images</FormLabel>
                          <FormControl>
                            <div className="space-y-4">
                              <div
                                {...getRootProps()}
                                className="border-2 border-dashed rounded-lg p-6 hover:border-primary/50 transition-colors cursor-pointer"
                              >
                                <input {...getInputProps()} />
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                  <Upload className="w-8 h-8" />
                                  <p className="text-sm font-medium">Drag & drop images here, or click to select</p>
                                  <p className="text-xs">Supports: JPG, PNG, WEBP (Max 5MB each)</p>
                                </div>
                              </div>
                              
                              {field.value && field.value.length > 0 && (
                                <div className="grid grid-cols-4 gap-4">
                                  {field.value.map((image, index) => (
                                    <div key={index} className="relative group">
                                      <img
                                        src={image.url}
                                        alt={`Product ${index + 1}`}
                                        className="w-full h-24 object-cover rounded-lg"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newImages = field.value?.filter((_, i) => i !== index);
                                          field.onChange(newImages);
                                        }}
                                        className="absolute top-1 right-1 p-1 rounded-full bg-destructive/90 text-destructive-foreground 
                                          opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter product name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="supplements">Supplements</SelectItem>
                                <SelectItem value="equipment">Equipment</SelectItem>
                                <SelectItem value="accessories">Accessories</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="hasMultipleSizes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Size Options</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value === "multiple");
                                if (value === "single") {
                                  form.setValue("sizes", []);
                                }
                              }} 
                              value={field.value ? "multiple" : "single"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select size type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="single">One Size Fits All</SelectItem>
                                <SelectItem value="multiple">Multiple Sizes</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {form.watch("hasMultipleSizes") && (
                      <div className="border rounded-lg p-3 bg-gray-50/50">
                        <div className="flex items-center justify-between mb-3">
                          <FormLabel className="text-sm font-medium">Size Variations</FormLabel>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const currentSizes = form.getValues("sizes") || [];
                              form.setValue("sizes", [...currentSizes, { size: "", stock: 0 }]);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Size
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          {form.watch("sizes")?.map((_, index) => (
                            <div key={index} className="flex gap-2 items-center bg-white p-2 rounded-md border">
                              <FormField
                                control={form.control}
                                name={`sizes.${index}.size`}
                                render={({ field }) => (
                                  <FormItem className="flex-[2] mb-0">
                                    <FormControl>
                                      <Input placeholder="Size (e.g., S, M, L)" {...field} className="h-8" />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`sizes.${index}.stock`}
                                render={({ field }) => (
                                  <FormItem className="flex-1 mb-0">
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="Stock" 
                                        {...field}
                                        className="h-8"
                                        onChange={e => field.onChange(parseInt(e.target.value))}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  const currentSizes = form.getValues("sizes") || [];
                                  form.setValue(
                                    "sizes",
                                    currentSizes.filter((_, i) => i !== index)
                                  );
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter product description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>

                {/* Pricing & Stock Card */}
                <div className="flex flex-col gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-6">
                      <DollarSign className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Pricing & Availability</h3>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field: { value, onChange, ...field } }) => (
                            <FormItem>
                              <FormLabel>Selling Price</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="pl-8"
                                    value={value}
                                    onChange={(e) => onChange(Number(e.target.value))}
                                    placeholder="0.00"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="costPrice"
                          render={({ field: { value, onChange, ...field } }) => (
                            <FormItem>
                              <FormLabel>Cost Price</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="pl-8"
                                    value={value}
                                    onChange={(e) => onChange(Number(e.target.value))}
                                    placeholder="0.00"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SKU</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter SKU" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="currentStock"
                          render={({ field: { value, onChange, ...field } }) => (
                            <FormItem>
                              <FormLabel>Stock Quantity</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="0" 
                                  value={value}
                                  onChange={(e) => onChange(Number(e.target.value))}
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Current available quantity
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="minStockLevel"
                          render={({ field: { value, onChange, ...field } }) => (
                            <FormItem>
                              <FormLabel>Low Stock Alert</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="0" 
                                  value={value}
                                  onChange={(e) => onChange(Number(e.target.value))}
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Minimum stock threshold
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="isOnline"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-y-0 rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Online Availability</FormLabel>
                              <FormDescription>
                                Make this product available for online purchase
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-md border">
                        <Gift className="w-4 h-4 text-primary" />
                        <span className="font-medium text-primary">
                          {Math.round(form.watch('price') * 0.1)}
                        </span>
                      </div>
                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">
                          Save Product
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </ModalContent>
    </Modal>
  );
};

export default ProductFormModal; 