import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';

interface Order {
    id: number;
    order_number: string;
    user_id: string;
    user_email?: string;
    user_phone?: string;
    total_amount: number;
    order_status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
    payment_status: 'pending' | 'paid' | 'failed';
    created_at: string;
    shipping_address?: string;
    subtotal: number;
    gst_amount: number;
    items_count: number;
    phone_number?: string;
}

const AdminOrders: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
    const [editingOrder, setEditingOrder] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [orderStatus, setOrderStatus] = useState<{ [key: number]: string }>({});
    const [orderItemsMap, setOrderItemsMap] = useState<{ [key: number]: any[] }>({});

    useEffect(() => {
        fetchOrders();
    }, [statusFilter]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('gym_orders')
                .select('id, order_number, user_id, total_amount, order_status, payment_status, created_at, shipping_address, subtotal, gst_amount, phone_number');

            if (statusFilter !== 'all') {
                query = query.eq('order_status', statusFilter);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            // Get item counts and user details from profiles
            const ordersWithDetails = await Promise.all(
                (data || []).map(async (order) => {
                    const { count } = await supabase
                        .from('gym_order_items')
                        .select('*', { count: 'exact', head: true })
                        .eq('order_id', order.id);

                    // Fetch user email and phone from profiles table with error handling
                    let userEmail = 'N/A';
                    let userPhone = order.phone_number || 'N/A';

                    try {
                        const { data: profileData, error: profileError } = await supabase
                            .from('profiles')
                            .select('email, phone')
                            .eq('id', order.user_id)
                            .single();

                        if (!profileError && profileData) {
                            userEmail = profileData.email || 'N/A';
                            userPhone = order.phone_number || profileData.phone || 'N/A';
                        }
                    } catch (error) {
                        console.error('Error fetching profile data:', error);
                        // Continue with default values if profile fetch fails
                    }

                    return {
                        ...order,
                        items_count: count || 0,
                        user_email: userEmail,
                        user_phone: userPhone
                    };
                })
            );

            setOrders(ordersWithDetails);
            // Initialize status state
            const statusMap: { [key: number]: string } = {};
            ordersWithDetails.forEach(o => {
                statusMap[o.id] = o.order_status;
            });
            setOrderStatus(statusMap);
        } catch (error) {
            console.error('Error fetching orders:', error);
            alert('Error fetching orders');
        } finally {
            setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId: number, newStatus: string) => {
        try {
            // Update local state first
            setOrderStatus({ ...orderStatus, [orderId]: newStatus });

            const { error } = await supabase
                .from('gym_orders')
                .update({
                    order_status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            // Update local orders list
            setOrders(orders.map(o => o.id === orderId ? { ...o, order_status: newStatus as any } : o));
            setEditingOrder(null);
            alert('Order status updated successfully!');
        } catch (error) {
            console.error('Error updating order status:', error);
            // Revert state on error
            setOrderStatus({ ...orderStatus, [orderId]: orders.find(o => o.id === orderId)?.order_status || 'pending' });
            alert('Failed to update order status. Please try again.');
        }
    };

    const deleteOrder = async (orderId: number) => {
        if (!window.confirm('Delete this order? This action cannot be undone.')) return;
        try {
            // Delete order items first
            const { error: itemsError } = await supabase
                .from('gym_order_items')
                .delete()
                .eq('order_id', orderId);

            if (itemsError) throw itemsError;

            // Delete order
            const { error } = await supabase
                .from('gym_orders')
                .delete()
                .eq('id', orderId);

            if (error) throw error;

            setOrders(orders.filter(o => o.id !== orderId));
            alert('Order deleted successfully!');
        } catch (error) {
            console.error('Error deleting order:', error);
            alert('Failed to delete order');
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
                return 'text-green-500 bg-green-500/10';
            case 'pending':
                return 'text-orange-500 bg-orange-500/10';
            case 'failed':
                return 'text-red-500 bg-red-500/10';
            default:
                return 'text-slate-400 bg-slate-400/10';
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-20">
            {/* Header */}
            <div className="flex items-center p-4 pb-2 justify-between border-b border-slate-800 sticky top-0 z-20 bg-slate-900">
                <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="text-white">
                    <span className="material-symbols-rounded text-2xl">arrow_back_ios</span>
                </button>
                <h2 className="text-lg font-bold flex-1 text-center">Orders Management</h2>
                <button onClick={fetchOrders} className="text-white">
                    <span className={`material-symbols-rounded text-2xl ${loading ? 'animate-spin' : ''}`}>refresh</span>
                </button>
            </div>

            {/* Status Filter */}
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/50 sticky top-[60px] z-10">
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {['all', 'pending', 'shipped', 'delivered', 'cancelled'].map((status) => (
                        <button
                            key={status}
                            onClick={() => {
                                setStatusFilter(status);
                                setSelectedOrder(null);
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${statusFilter === status
                                ? 'bg-primary text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            {status.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 py-6">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                        <span className="material-symbols-rounded text-6xl text-slate-600 block mb-4">shopping_cart</span>
                        <p className="text-slate-400 text-lg">No orders found</p>
                        <p className="text-slate-500 text-sm mt-2">Filter to see orders with different statuses</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition-colors"
                            >
                                {/* Order Header - Always Visible */}
                                <button
                                    onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                                    className="w-full p-4 text-left hover:bg-slate-700/30 transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                            <p className="font-bold text-sm">{order.order_number}</p>
                                            <p className="text-xs text-slate-400 mt-1">{order.user_email}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-xs text-slate-500">{order.user_phone}</p>
                                                {order.user_phone !== 'N/A' && (
                                                    <a
                                                        href={`tel:${order.user_phone}`}
                                                        className="text-primary hover:text-primary/80 transition-colors"
                                                    >
                                                        <span className="material-symbols-rounded text-sm">phone</span>
                                                    </a>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {new Date(order.created_at).toLocaleDateString('en-IN', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        <span className={`material-symbols-rounded text-xl transition-transform ${selectedOrder === order.id ? 'rotate-180' : ''}`}>
                                            expand_more
                                        </span>
                                    </div>

                                    {/* Order Status - Only show delivery status */}
                                    <div className="flex gap-2 mb-2 items-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.order_status)}`}>
                                            {order.order_status.toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Amount and Items */}
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-slate-400">{order.items_count} item(s)</p>
                                        <p className="text-lg font-bold text-primary">₹{order.total_amount.toFixed(2)}</p>
                                    </div>
                                </button>

                                {/* Expanded Details */}
                                {selectedOrder === order.id && (
                                    <div className="border-t border-slate-700 bg-slate-700/20 p-4 space-y-4">
                                        {/* Status Management */}
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 mb-2">UPDATE ORDER STATUS</p>
                                            {editingOrder === order.id ? (
                                                <div className="space-y-2">
                                                    <select
                                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                                                        value={orderStatus[order.id] || order.order_status}
                                                        onChange={(e) => {
                                                            setOrderStatus({ ...orderStatus, [order.id]: e.target.value });
                                                            updateOrderStatus(order.id, e.target.value);
                                                        }}
                                                    >
                                                        <option value="pending">PENDING</option>
                                                        <option value="shipped">SHIPPED</option>
                                                        <option value="delivered">DELIVERED</option>
                                                        <option value="cancelled">CANCELLED</option>
                                                    </select>
                                                    <button
                                                        onClick={() => setEditingOrder(null)}
                                                        className="w-full px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-sm font-bold transition-colors"
                                                    >
                                                        DONE
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setEditingOrder(order.id)}
                                                    className="w-full px-3 py-2 bg-primary/20 border border-primary/40 hover:border-primary rounded-lg text-sm font-bold text-primary transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <span className="material-symbols-rounded text-lg">edit</span>
                                                    CHANGE STATUS
                                                </button>
                                            )}
                                        </div>

                                        {/* Shipping Address */}
                                        {order.shipping_address && (
                                            <div className="bg-slate-700/30 p-3 rounded-lg">
                                                <p className="text-xs font-bold text-slate-400 mb-1">SHIPPING ADDRESS</p>
                                                <p className="text-sm text-slate-300">{order.shipping_address}</p>
                                            </div>
                                        )}

                                        {/* Order Items */}
                                        <OrderItemsList orderId={order.id} onItemsLoad={(items) => {
                                            setOrderItemsMap({ ...orderItemsMap, [order.id]: items });
                                        }} />

                                        {/* Price Summary */}
                                        {(() => {
                                            const items = orderItemsMap[order.id] || [];
                                            let calculatedGst = 0;
                                            let calculatedSubtotal = 0;

                                            items.forEach((item: any) => {
                                                const gstPercentage = item.product?.gst_percentage || 18;
                                                const itemSubtotal = item.unit_price * item.quantity;
                                                calculatedSubtotal += itemSubtotal;
                                                calculatedGst += (itemSubtotal * gstPercentage) / 100;
                                            });

                                            // Use calculated values or fallback to order data
                                            const displaySubtotal = calculatedSubtotal > 0 ? calculatedSubtotal : order.subtotal;
                                            const displayGst = calculatedGst > 0 ? calculatedGst : order.gst_amount;

                                            return (
                                                <div className="bg-slate-700/40 p-3 rounded-lg border border-slate-700/50 space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-400">Subtotal</span>
                                                        <span className="text-slate-300 font-bold">₹{displaySubtotal.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-400">GST</span>
                                                        <span className="text-slate-300 font-bold">₹{displayGst.toFixed(2)}</span>
                                                    </div>
                                                    <div className="border-t border-slate-700 pt-2 flex justify-between">
                                                        <span className="font-bold text-white">Total</span>
                                                        <span className="text-lg font-bold text-primary">₹{order.total_amount.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => deleteOrder(order.id)}
                                            className="w-full px-3 py-2 bg-red-500/20 border border-red-500/40 hover:border-red-500 rounded-lg text-sm font-bold text-red-500 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-rounded text-lg">delete</span>
                                            DELETE ORDER
                                        </button>
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

// Order Items Component
const OrderItemsList: React.FC<{ orderId: number; onItemsLoad: (items: any[]) => void }> = ({ orderId, onItemsLoad }) => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchItems();
    }, [orderId]);

    const fetchItems = async () => {
        try {
            const { data, error } = await supabase
                .from('gym_order_items')
                .select('*, product:gym_products(name, sku, gst_percentage)')
                .eq('order_id', orderId);

            if (error) throw error;
            setItems(data || []);
            onItemsLoad(data || []);
        } catch (error) {
            console.error('Error fetching items:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <p className="text-sm text-slate-400">Loading items...</p>;
    }

    return (
        <div>
            <p className="text-xs font-bold text-slate-400 mb-2">ORDER ITEMS</p>
            <div className="space-y-2">
                {items.map((item) => {
                    const gstPercentage = item.product?.gst_percentage || 18;
                    const itemSubtotal = item.unit_price * item.quantity;
                    const itemGst = (itemSubtotal * gstPercentage) / 100;
                    const itemTotal = itemSubtotal + itemGst;

                    return (
                        <div key={item.id} className="bg-slate-700/20 p-2 rounded border border-slate-700/30">
                            <div className="flex justify-between items-start mb-1">
                                <p className="text-sm font-bold text-white">{item.product?.name}</p>
                                <p className="text-sm font-bold text-primary">₹{itemTotal.toFixed(2)}</p>
                            </div>
                            <div className="text-xs text-slate-400">
                                Qty: {item.quantity} × ₹{item.unit_price.toFixed(2)} | GST: {gstPercentage}%
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                                Subtotal: ₹{itemSubtotal.toFixed(2)} | GST: ₹{itemGst.toFixed(2)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminOrders;
