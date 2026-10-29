import { useState, useEffect } from 'react';
import { Table, Badge } from 'antd';
import { DashboardLayout } from "@/components/Dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  Package, 
  TrendingUp, 
  Search,
  Filter,
  Download,
  ShoppingCart,
  ChartBar,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  ClipboardList
} from "lucide-react";
import { BarChart } from '@/components/sales/Charts/BarChart';
import { PieChart } from '@/components/sales/Charts/PieChart';
import OrderFormModal from '@/components/sales/Orders/OrderFormModal';
import { toast } from 'react-hot-toast';
import { supabase } from '@/config/supabase';
import { useCurrentPractice } from '@/hooks/useCurrentPractice';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  productId: string;
}

interface Order {
  orderId: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: 'ONLINE' | 'IN_PRACTICE';
  carePoints: number;
  createdAt: string;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

export default function SalesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCharts, setShowCharts] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const practiceId = useCurrentPractice();

  useEffect(() => {
    if (practiceId) {
      fetchOrders();
      fetchProducts();
    }
  }, [practiceId]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          patient_name,
          items,
          total_amount,
          payment_method,
          status,
          created_at
        `)
        .eq('practice_id', practiceId);

      if (error) throw error;

      const formattedOrders: Order[] = (data || []).map(order => ({
        orderId: order.id,
        customerName: order.patient_name || 'Unknown',
        items: order.items || [],
        totalAmount: order.total_amount,
        paymentMethod: order.payment_method || 'IN_PRACTICE',
        carePoints: Math.round(order.total_amount * 0.1),
        createdAt: order.created_at
      }));

      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('practice_id', practiceId);
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const filteredOrders = orders.filter(order =>
    order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.orderId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'orderId',
      key: 'orderId',
      render: (id: string) => (
        <span className="font-medium text-gray-900">{id}</span>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      sorter: (a: Order, b: Order) => a.customerName.localeCompare(b.customerName),
    },
    {
      title: 'Products/Services',
      dataIndex: 'items',
      key: 'items',
      render: (items: OrderItem[]) => (
        <ul className="space-y-1">
          {items.map((item, index) => (
            <li key={index} className="text-sm">
              {item.name} <span className="text-gray-500">x{item.quantity}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => (
        <span className="font-medium text-gray-900">${formatNumber(amount)}</span>
      ),
      sorter: (a: Order, b: Order) => a.totalAmount - b.totalAmount,
    },
    {
      title: 'Payment Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method: string) => (
        <Badge 
          status={method === 'ONLINE' ? 'success' : 'warning'} 
          text={
            <span className={`px-2 py-1 rounded-full text-xs ${
              method === 'ONLINE' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {method === 'ONLINE' ? 'Online' : 'In Practice'}
            </span>
          }
        />
      ),
      filters: [
        { text: 'Online', value: 'ONLINE' },
        { text: 'In Practice', value: 'IN_PRACTICE' },
      ],
      onFilter: (value: string, record: Order) => record.paymentMethod === value,
    },
    {
      title: 'Care Points',
      dataIndex: 'carePoints',
      key: 'carePoints',
      render: (points: number) => (
        <span className="font-medium text-orange-600">
          {formatNumber(points)} points
        </span>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <span className="text-gray-500">
          {new Date(date).toLocaleDateString()}
        </span>
      ),
      sorter: (a: Order, b: Order) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
  ];

  const getMonthlyRevenueData = () => {
    const monthlyData = orders.reduce((acc, order) => {
      const month = new Date(order.createdAt).toLocaleString('default', { month: 'short' });
      acc[month] = (acc[month] || 0) + order.totalAmount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(monthlyData).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2))
    }));
  };

  const getSalesDistribution = () => {
    const distribution = orders.reduce((acc, order) => {
      order.items.forEach(item => {
        const type = item.name.toLowerCase().includes('service') ? 'Services' : 'Products';
        acc[type] = (acc[type] || 0) + (item.price * item.quantity);
      });
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2))
    }));
  };

  const getSalesChannelDistribution = () => {
    const distribution = orders.reduce((acc, order) => {
      const channel = order.paymentMethod === 'ONLINE' ? 'Online Sales' : 'In-Practice Sales';
      acc[channel] = (acc[channel] || 0) + order.totalAmount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2))
    }));
  };

  const handleCreateOrder = async (data: { items: OrderItem[], patientId: string }) => {
    try {
      const { items, patientId } = data;
      
      // Create order in database
      const { data: order, error } = await supabase
        .from('orders')
        .insert([{
          patient_id: patientId,
          items: items,
          total_amount: items.reduce((sum, item) => {
            const product = products.find(p => p.id === item.productId);
            return sum + (product?.price || 0) * item.quantity;
          }, 0),
          status: 'completed',
          practice_id: practiceId,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Order created successfully');
      setIsOrderModalOpen(false);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order');
    }
  };

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="bg-gray-50 rounded-full p-6 mb-6">
        <ClipboardList className="w-12 h-12 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h3>
      <p className="text-gray-500 text-center mb-6 max-w-sm">
        When you start receiving orders, they will appear here. Create your first order to get started.
      </p>
      <Button 
        onClick={() => setIsOrderModalOpen(true)}
        className="gap-2"
      >
        <PlusCircle className="w-4 h-4" />
        Create New Order
      </Button>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Sales Overview
            </h1>
            <p className="text-gray-600 mt-2">
              Track and manage your sales performance
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowCharts(!showCharts)}
            >
              <ChartBar className="w-4 h-4" />
              {showCharts ? 'Hide Charts' : 'Show Charts'}
              {showCharts ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            <Button className="gap-2 bg-primary hover:bg-primary/90">
              <Download className="w-4 h-4" /> Export Report
            </Button>
            <Button 
              className="gap-2" 
              onClick={() => setIsOrderModalOpen(true)}
            >
              <PlusCircle className="w-4 h-4" /> New Order
            </Button>
          </div>
        </div>

        {orders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Sales</p>
                  <h3 className="text-2xl font-semibold text-gray-900">
                    ${formatNumber(orders.reduce((sum, order) => sum + order.totalAmount, 0))}
                  </h3>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <h3 className="text-2xl font-semibold text-gray-900">
                    {formatNumber(orders.length)}
                  </h3>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <Package className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Average Order Value</p>
                  <h3 className="text-2xl font-semibold text-gray-900">
                    ${orders.length ? formatNumber(orders.reduce((sum, order) => sum + order.totalAmount, 0) / orders.length) : '0'}
                  </h3>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Points Awarded</p>
                  <h3 className="text-2xl font-semibold text-gray-900">
                    {formatNumber(orders.reduce((sum, order) => sum + order.carePoints, 0))}
                  </h3>
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {showCharts && orders.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-300">
              <Card className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Services vs Products</h3>
                  <p className="text-sm text-gray-500">Revenue distribution by type</p>
                </div>
                <PieChart data={getSalesDistribution()} />
              </Card>

              <Card className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Sales Channels</h3>
                  <p className="text-sm text-gray-500">Online vs In-Practice sales</p>
                </div>
                <PieChart data={getSalesChannelDistribution()} />
              </Card>
            </div>

            <Card className="p-6 animate-in slide-in-from-top-4 duration-300 delay-150">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Monthly Revenue</h3>
                <p className="text-sm text-gray-500">Revenue trends over time</p>
              </div>
              <BarChart data={getMonthlyRevenueData()} />
            </Card>
          </>
        )}

        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Order History</h2>
            {orders.length > 0 && (
              <div className="flex gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search orders..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" /> Filter
                </Button>
              </div>
            )}
          </div>

          {orders.length > 0 ? (
            <Table 
              columns={columns} 
              dataSource={filteredOrders}
              loading={loading}
              rowKey="orderId"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total: number) => `Total ${total} orders`,
              }}
              className="border rounded-lg"
            />
          ) : (
            !loading && <EmptyState />
          )}
        </Card>

        <OrderFormModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          onSubmit={handleCreateOrder}
        />
      </div>
    </DashboardLayout>
  );
}