import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../components/Dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  PlusCircle, 
  AlertTriangle, 
  TrendingUp,
  Search,
  Filter,
  Bell,
  LayoutGrid,
  Table2,
  BoxIcon,
  PackageSearch,
  Boxes,
  Upload
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from '@/config/supabase';
import { useCurrentPractice } from '@/hooks/useCurrentPractice';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProductFormModal from "@/components/Products/ProductFormModal";

interface Product {
  id: string;
  name: string;
  sku: string;
  current_stock: number;
  min_stock_level: number;
  price: number;
  category: string;
  practice_id: string;
  cost_price?: number;
}

interface StockAlert {
  product: Product;
  threshold: number;
  currentStock: number;
  severity: 'critical' | 'warning';
}

type ViewMode = 'table' | 'grid';

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const practiceId = useCurrentPractice();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);

  useEffect(() => {
    if (practiceId) {
      fetchProducts();
    }
  }, [practiceId]);

  const fetchProducts = async () => {
    if (!practiceId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('practice_id', practiceId);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const lowStockProducts = products.filter(
    product => product.current_stock <= product.min_stock_level
  );

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryStats = () => {
    const categoryCount = products.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get the category with the most products
    const topCategory = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)[0];

    return topCategory ? {
      name: topCategory[0],
      count: topCategory[1],
      percentage: Math.round((topCategory[1] / products.length) * 100)
    } : { name: 'N/A', count: 0, percentage: 0 };
  };

  const getStockAlerts = (): StockAlert[] => {
    return products.map(product => {
      const threshold = product.min_stock_level;
      const currentStock = product.current_stock;
      
      if (currentStock <= threshold) {
        return {
          product,
          threshold,
          currentStock,
          severity: currentStock === 0 ? 'critical' : 'warning'
        };
      }
      return null;
    }).filter((alert): alert is StockAlert => alert !== null);
  };

  const calculateMargin = (price: number, costPrice: number | undefined) => {
    if (!costPrice) return null;
    const margin = ((price - costPrice) / price) * 100;
    return margin.toFixed(1);
  };

  const renderTableView = () => (
    <div className="relative overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th className="px-6 py-3">Product Name</th>
            <th className="px-6 py-3">SKU</th>
            <th className="px-6 py-3">Category</th>
            <th className="px-6 py-3">Current Stock</th>
            <th className="px-6 py-3">Price</th>
            <th className="px-6 py-3">Margin</th>
            <th className="px-6 py-3">Status</th>
            <th className="px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.map((product) => (
            <tr key={product.id} className="bg-white border-b hover:bg-gray-50">
              <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
              <td className="px-6 py-4">{product.sku}</td>
              <td className="px-6 py-4">{product.category}</td>
              <td className="px-6 py-4">{product.current_stock}</td>
              <td className="px-6 py-4">${product.price.toFixed(2)}</td>
              <td className="px-6 py-4">
                {product.cost_price ? (
                  <span className="text-green-600">
                    {calculateMargin(product.price, product.cost_price)}%
                  </span>
                ) : (
                  <span className="text-gray-400">N/A</span>
                )}
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  product.current_stock <= product.min_stock_level
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {product.current_stock <= product.min_stock_level ? 'Low Stock' : 'In Stock'}
                </span>
              </td>
              <td className="px-6 py-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setEditingProduct(product);
                    setIsProductModalOpen(true);
                  }}
                >
                  Edit
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderProductGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {filteredProducts.map((product) => (
        <Card key={product.id} className="overflow-hidden">
          <div className="aspect-square relative bg-gray-100">
            {/* Replace with actual image when available */}
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <Package className="w-12 h-12" />
            </div>
          </div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between items-start">
              <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs ${
                product.current_stock <= product.min_stock_level
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {product.current_stock <= product.min_stock_level ? 'Low Stock' : 'In Stock'}
              </span>
            </div>
            <p className="text-sm text-gray-500">SKU: {product.sku}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">
                ${product.price.toFixed(2)}
                {product.cost_price && (
                  <span className="ml-2 text-xs text-green-600">
                    ({calculateMargin(product.price, product.cost_price)}% margin)
                  </span>
                )}
              </span>
              <span className="text-sm text-gray-500">
                Stock: {product.current_stock}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {product.category}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    •••
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    setEditingProduct(product);
                    setIsProductModalOpen(true);
                  }}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative mb-8">
        <div className="absolute -right-6 -top-6 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <Boxes className="w-6 h-6 text-primary" />
        </div>
        <div className="absolute -left-4 -bottom-4 w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
          <BoxIcon className="w-5 h-5 text-secondary" />
        </div>
        <div className="bg-gray-50 rounded-full p-8">
          <PackageSearch className="w-16 h-16 text-gray-400" />
        </div>
      </div>
      <h3 className="text-2xl font-semibold text-gray-900 mb-3">No products in inventory</h3>
      <p className="text-gray-500 text-center mb-8 max-w-md">
        Start by adding products to your inventory. You'll be able to track stock levels, set alerts, and manage your products all in one place.
      </p>
      <div className="flex gap-4">
        <Button 
          onClick={() => setIsProductModalOpen(true)}
          className="gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          Add First Product
        </Button>
        <Button 
          variant="outline" 
          onClick={() => {
            // Add bulk import functionality here
            toast.info('Bulk import coming soon!');
          }}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          Import Products
        </Button>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-600 mt-2">
              Manage your products and track inventory levels
            </p>
          </div>
          <div className="flex gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative">
                  <Bell className="w-4 h-4" />
                  {lowStockProducts.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {lowStockProducts.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Stock Alerts</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  {getStockAlerts().length === 0 ? (
                    <p className="text-sm text-gray-500">No stock alerts at this time.</p>
                  ) : (
                    getStockAlerts().map((alert) => (
                      <div
                        key={alert.product.id}
                        className={`p-4 rounded-lg border ${
                          alert.severity === 'critical' 
                            ? 'bg-red-50 border-red-200' 
                            : 'bg-yellow-50 border-yellow-200'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {alert.product.name}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Current Stock: {alert.currentStock} / Minimum: {alert.threshold}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              alert.severity === 'critical'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {alert.severity === 'critical' ? 'Out of Stock' : 'Low Stock'}
                          </span>
                        </div>
                        <div className="mt-3">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => {
                              // Add restock functionality here
                              toast.info(`Restock order initiated for ${alert.product.name}`);
                            }}
                          >
                            Restock Now
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </SheetContent>
            </Sheet>
            <Button className="gap-2" onClick={() => setIsProductModalOpen(true)}>
              <PlusCircle className="w-4 h-4" /> Add Product
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <h3 className="text-2xl font-semibold text-gray-900">{products.length}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Low Stock Items</p>
                <h3 className="text-2xl font-semibold text-gray-900">{lowStockProducts.length}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  ${formatNumber(products.reduce((sum, product) => 
                    sum + (product.price * product.current_stock), 0))}
                </h3>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Top Category</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {getCategoryStats().name}
                </h3>
                <p className="text-sm text-gray-500">
                  {getCategoryStats().count} items ({getCategoryStats().percentage}%)
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Product List</h2>
            {products.length > 0 && (
              <div className="flex gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setViewMode('table')}
                    className={viewMode === 'table' ? 'bg-primary/10' : ''}
                  >
                    <Table2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setViewMode('grid')}
                    className={viewMode === 'grid' ? 'bg-primary/10' : ''}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Filter className="w-4 h-4" /> Filter
                  </Button>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin">
                  <Package className="w-8 h-8 text-primary/60" />
                </div>
                <p className="text-sm text-gray-500">Loading inventory...</p>
              </div>
            </div>
          ) : products.length === 0 ? (
            <EmptyState />
          ) : viewMode === 'table' ? (
            renderTableView()
          ) : (
            renderProductGrid()
          )}
        </Card>
      </div>
      <ProductFormModal 
        open={isProductModalOpen}
        onOpenChange={setIsProductModalOpen}
        product={editingProduct}
        onSuccess={() => {
          fetchProducts();
          setEditingProduct(undefined);
        }}
      />
    </DashboardLayout>
  );
};

export default Inventory; 