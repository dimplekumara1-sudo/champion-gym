import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';
import BottomNav from '../components/BottomNav';

const CartScreen: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [shippingAddress, setShippingAddress] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');

    useEffect(() => {
        fetchUser();
    }, []);

    useEffect(() => {
        if (user?.id) {
            fetchCartItems();
            fetchProducts();
        }
    }, [user]);

    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    };

    const fetchCartItems = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('gym_cart')
                .select('*')
                .eq('user_id', user.id);
            if (error) throw error;
            setCartItems(data || []);
        } catch (error) {
            console.error('Error fetching cart:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('gym_products')
                .select('*')
                .eq('is_active', true);
            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const getProductDetails = (productId: number) => {
        return products.find(p => p.id === productId);
    };

    const updateQuantity = async (cartId: number, newQuantity: number) => {
        if (newQuantity < 1) {
            removeFromCart(cartId);
            return;
        }

        try {
            const { error } = await supabase
                .from('gym_cart')
                .update({ quantity: newQuantity })
                .eq('id', cartId);
            if (error) throw error;
            await fetchCartItems();
        } catch (error) {
            console.error('Error updating quantity:', error);
        }
    };

    const removeFromCart = async (cartId: number) => {
        try {
            const { error } = await supabase
                .from('gym_cart')
                .delete()
                .eq('id', cartId);
            if (error) throw error;
            await fetchCartItems();
        } catch (error) {
            console.error('Error removing from cart:', error);
        }
    };

    const calculateSubtotal = () => {
        return cartItems.reduce((sum, item) => {
            const product = getProductDetails(item.product_id);
            if (product) {
                return sum + (product.sale_price * item.quantity);
            }
            return sum;
        }, 0);
    };

    const calculateTax = (subtotal: number) => {
        return subtotal * 0.18; // 18% GST
    };

    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        const tax = calculateTax(subtotal);
        return subtotal + tax;
    };

    const handleCheckout = async () => {
        if (!shippingAddress.trim()) {
            alert('Please enter shipping address');
            return;
        }
        if (!phoneNumber.trim()) {
            alert('Please enter phone number');
            return;
        }
        if (cartItems.length === 0) {
            alert('Cart is empty');
            return;
        }

        setIsCheckingOut(true);
        try {
            const subtotal = calculateSubtotal();
            const tax = calculateTax(subtotal);
            const total = calculateTotal();

            // Create order
            const { data: orderData, error: orderError } = await supabase
                .from('gym_orders')
                .insert({
                    user_id: user.id,
                    order_number: `ORD-${Date.now()}`,
                    subtotal: subtotal,
                    tax_amount: tax,
                    total_amount: total,
                    shipping_address: shippingAddress,
                    phone_number: phoneNumber,
                    order_status: 'pending',
                    payment_status: 'pending'
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // Create order items
            const orderItems = cartItems.map(item => {
                const product = getProductDetails(item.product_id);
                return {
                    order_id: orderData.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: product.sale_price,
                    line_total: product.sale_price * item.quantity
                };
            });

            const { error: itemsError } = await supabase
                .from('gym_order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            // Clear cart
            const { error: clearError } = await supabase
                .from('gym_cart')
                .delete()
                .eq('user_id', user.id);

            if (clearError) throw clearError;

            alert(`Order placed successfully! Order #${orderData.order_number}`);
            setCartItems([]);
            setShippingAddress('');
            setPhoneNumber('');
            onNavigate('DASHBOARD');
        } catch (error) {
            console.error('Error creating order:', error);
            alert('Failed to place order');
        } finally {
            setIsCheckingOut(false);
        }
    };

    const subtotal = calculateSubtotal();
    const tax = calculateTax(subtotal);
    const total = calculateTotal();

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-32">
            <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-6 py-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => onNavigate('STORE')} className="material-symbols-rounded">arrow_back</button>
                    <h1 className="text-xl font-bold">Shopping Cart</h1>
                </div>
            </header>

            <main className="px-6 py-6">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                ) : cartItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <span className="material-symbols-rounded text-slate-500 text-5xl mb-3">shopping_cart</span>
                        <h3 className="text-lg font-bold text-slate-400 mb-1">Your cart is empty</h3>
                        <p className="text-sm text-slate-500 mb-6">Add items from the store to get started</p>
                        <button
                            onClick={() => onNavigate('STORE')}
                            className="bg-primary text-slate-900 px-6 py-3 rounded-xl font-bold"
                        >
                            Continue Shopping
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Cart Items */}
                        <div className="space-y-3 mb-6">
                            {cartItems.map(item => {
                                const product = getProductDetails(item.product_id);
                                if (!product) return null;

                                return (
                                    <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex gap-4">
                                        <img
                                            src={product.main_image || 'https://via.placeholder.com/80?text=Product'}
                                            alt={product.name}
                                            className="w-20 h-20 object-cover rounded-lg"
                                        />
                                        <div className="flex-1">
                                            <h3 className="font-bold text-sm mb-1">{product.name}</h3>
                                            <p className="text-primary font-bold text-sm mb-3">₹{product.sale_price}</p>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="bg-slate-700 hover:bg-slate-600 w-7 h-7 rounded flex items-center justify-center text-sm transition-colors"
                                                >
                                                    −
                                                </button>
                                                <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="bg-slate-700 hover:bg-slate-600 w-7 h-7 rounded flex items-center justify-center text-sm transition-colors"
                                                >
                                                    +
                                                </button>
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="ml-auto text-red-500 hover:text-red-400 material-symbols-rounded text-sm"
                                                >
                                                    delete
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-sm">₹{(product.sale_price * item.quantity).toFixed(2)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Checkout Form */}
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-6">
                            <h2 className="text-lg font-bold mb-4">Delivery Details</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                        Shipping Address
                                    </label>
                                    <textarea
                                        placeholder="Enter your full delivery address..."
                                        value={shippingAddress}
                                        onChange={(e) => setShippingAddress(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:border-primary focus:outline-none"
                                        rows={3}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        placeholder="Enter your phone number"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:border-primary focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Order Summary */}
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-6">
                            <h2 className="text-lg font-bold mb-4">Order Summary</h2>

                            <div className="space-y-3 mb-4 pb-4 border-b border-slate-700">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Subtotal ({cartItems.length} items)</span>
                                    <span className="font-bold">₹{subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Tax (18% GST)</span>
                                    <span className="font-bold">₹{tax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Shipping</span>
                                    <span className="font-bold text-green-500">FREE</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-6">
                                <span className="text-lg font-bold">Total</span>
                                <span className="text-2xl font-black text-primary">₹{total.toFixed(2)}</span>
                            </div>

                            <button
                                onClick={handleCheckout}
                                disabled={isCheckingOut}
                                className="w-full bg-primary hover:bg-primary/90 disabled:bg-slate-700 text-slate-900 font-black py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {isCheckingOut ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-rounded">payment</span>
                                        Proceed to Checkout
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => onNavigate('STORE')}
                                className="w-full mt-3 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-colors"
                            >
                                Continue Shopping
                            </button>
                        </div>
                    </>
                )}
            </main>
            <BottomNav active="EXPLORE" onNavigate={onNavigate} />
        </div>
    );
};

export default CartScreen;
