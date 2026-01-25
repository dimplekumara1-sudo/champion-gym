import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';

interface Order {
    id: number;
    order_number: string;
    total_amount: number;
    order_status: string;
    payment_status: string;
    created_at: string;
    items_count: number;
    shipping_address?: string;
    subtotal?: number;
    gst_amount?: number;
}

const OrderHistoryScreen: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<number | null>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('gym_orders')
                .select('id, order_number, total_amount, order_status, payment_status, created_at, shipping_address, subtotal, gst_amount')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Get item counts
            const ordersWithCounts = await Promise.all(
                (data || []).map(async (order) => {
                    const { count } = await supabase
                        .from('gym_order_items')
                        .select('*', { count: 'exact', head: true })
                        .eq('order_id', order.id);
                    return { ...order, items_count: count || 0 };
                })
            );

            setOrders(ordersWithCounts);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'delivered':
                return 'text-green-500 bg-green-500/10';
            case 'pending':
                return 'text-orange-500 bg-orange-500/10';
            case 'cancelled':
                return 'text-red-500 bg-red-500/10';
            case 'shipped':
                return 'text-blue-500 bg-blue-500/10';
            default:
                return 'text-slate-400 bg-slate-400/10';
        }
    };

    const getPaymentColor = (status: string) => {
        switch (status) {
            case 'paid':
                return 'text-green-500';
            case 'pending':
                return 'text-orange-500';
            case 'failed':
                return 'text-red-500';
            default:
                return 'text-slate-400';
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-20">
            {/* Header */}
            <div className="flex items-center p-4 pb-2 justify-between border-b border-slate-800 sticky top-0 z-20 bg-slate-900">
                <button onClick={() => onNavigate('DASHBOARD')} className="text-white">
                    <span className="material-symbols-rounded text-2xl">arrow_back_ios</span>
                </button>
                <h2 className="text-lg font-bold flex-1 text-center">Order History</h2>
                <button onClick={fetchOrders} className="text-white">
                    <span className={`material-symbols-rounded text-2xl ${loading ? 'animate-spin' : ''}`}>refresh</span>
                </button>
            </div>

            <div className="px-4 py-6">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                        <span className="material-symbols-rounded text-6xl text-slate-600 block mb-4">shopping_cart</span>
                        <p className="text-slate-400 text-lg">No orders yet</p>
                        <p className="text-slate-500 text-sm mt-2">Start shopping to see your order history</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                                className="bg-slate-800 border border-slate-700 rounded-lg p-4 cursor-pointer hover:border-slate-600 transition-colors"
                            >
                                {/* Order Header */}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <p className="font-bold text-sm">{order.order_number}</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {new Date(order.created_at).toLocaleDateString('en-IN', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                    <span className={`material-symbols-rounded text-xl transition-transform ${selectedOrder === order.id ? 'rotate-180' : ''}`}>
                                        expand_more
                                    </span>
                                </div>

                                {/* Order Status - Only show delivery status */}
                                <div className="flex gap-2 mb-3 items-center">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.order_status)}`}>
                                        {order.order_status.toUpperCase()}
                                    </span>
                                </div>

                                {/* Order Summary */}
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-slate-400">{order.items_count} item(s)</p>
                                    <p className="text-lg font-bold text-primary">₹{order.total_amount.toFixed(2)}</p>
                                </div>

                                {/* Expanded Details */}
                                {selectedOrder === order.id && (
                                    <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                                        {/* Shipping Address */}
                                        {order.shipping_address && (
                                            <div className="bg-slate-700/30 p-3 rounded-lg">
                                                <p className="text-xs font-bold text-slate-400 mb-1">SHIPPING ADDRESS</p>
                                                <p className="text-sm text-slate-300">{order.shipping_address}</p>
                                            </div>
                                        )}

                                        {/* Order Items */}
                                        <OrderDetails orderId={order.id} />

                                        {/* Payment Status */}
                                        <div className="bg-slate-700/30 p-3 rounded-lg">
                                            <p className="text-xs font-bold text-slate-400 mb-1">PAYMENT STATUS</p>
                                            <p className={`text-sm font-bold ${getPaymentColor(order.payment_status)}`}>
                                                {order.payment_status.toUpperCase()}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Order Items Detail Component with Price Breakdown
const OrderDetails: React.FC<{ orderId: number }> = ({ orderId }) => {
    const [items, setItems] = useState<any[]>([]);
    const [orderTotal, setOrderTotal] = useState({ subtotal: 0, gst: 0, total: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrderItems();
    }, [orderId]);

    const fetchOrderItems = async () => {
        try {
            const { data, error } = await supabase
                .from('gym_order_items')
                .select('*, product:gym_products(name, sku, gst_percentage)')
                .eq('order_id', orderId);

            if (error) throw error;

            const itemsData = data || [];
            setItems(itemsData);

            // Calculate totals
            let subtotal = 0;
            let totalGst = 0;

            itemsData.forEach((item) => {
                const itemSubtotal = item.quantity * item.unit_price;
                const gstPercent = item.product?.gst_percentage || 18;
                const itemGst = (itemSubtotal * gstPercent) / 100;

                subtotal += itemSubtotal;
                totalGst += itemGst;
            });

            setOrderTotal({
                subtotal,
                gst: totalGst,
                total: subtotal + totalGst
            });
        } catch (error) {
            console.error('Error fetching order items:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <p className="text-sm text-slate-400">Loading items...</p>;
    }

    return (
        <div className="space-y-3">
            {/* Items List */}
            <div>
                <p className="text-xs font-bold text-slate-400 mb-2">ORDER ITEMS</p>
                <div className="space-y-2">
                    {items.map((item) => {
                        const gstPercent = item.product?.gst_percentage || 18;
                        const itemSubtotal = item.quantity * item.unit_price;
                        const itemGst = (itemSubtotal * gstPercent) / 100;
                        const itemTotal = itemSubtotal + itemGst;

                        return (
                            <div key={item.id} className="bg-slate-700/20 p-2 rounded border border-slate-700/30">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-sm font-bold text-white">{item.product?.name}</p>
                                    <p className="text-sm font-bold text-primary">₹{itemTotal.toFixed(2)}</p>
                                </div>

                                {/* Item Details */}
                                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-1">
                                    <div>
                                        <p className="text-slate-500 text-[10px]">QUANTITY</p>
                                        <p className="font-bold text-slate-300">{item.quantity} × ₹{item.unit_price.toFixed(2)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-slate-500 text-[10px]">SUBTOTAL</p>
                                        <p className="font-bold text-slate-300">₹{itemSubtotal.toFixed(2)}</p>
                                    </div>
                                </div>

                                {/* GST Breakdown */}
                                <div className="flex justify-between text-xs border-t border-slate-700/30 pt-1">
                                    <span className="text-slate-400">GST ({gstPercent}%)</span>
                                    <span className="text-slate-300 font-bold">₹{itemGst.toFixed(2)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Price Summary */}
            <div className="bg-slate-700/40 p-3 rounded-lg border border-slate-700/50 space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Subtotal</span>
                    <span className="text-slate-300 font-bold">₹{orderTotal.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-400">GST (18%)</span>
                    <span className="text-slate-300 font-bold">₹{orderTotal.gst.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-700 pt-2 flex justify-between">
                    <span className="font-bold text-white">Total Amount</span>
                    <span className="text-lg font-bold text-primary">₹{orderTotal.total.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
};

export default OrderHistoryScreen;
