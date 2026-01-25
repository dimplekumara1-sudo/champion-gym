import React, { useEffect, useState } from 'react';
import StatusBar from '../components/StatusBar';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';

const StoreScreen: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
    const [categories, setCategories] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        fetchUser();
        fetchCategories();
        fetchProducts();
        fetchCart();
    }, []);

    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    };

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('gym_product_categories')
                .select('*')
                .eq('is_active', true)
                .order('display_order');
            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchProducts = async () => {
        try {
            setLoading(true);
            let query = supabase.from('gym_products').select('*').eq('is_active', true);

            const { data, error } = await query;
            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCart = async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from('gym_cart')
                .select('*')
                .eq('user_id', user.id);
            if (error) throw error;
            setCart(data || []);
        } catch (error) {
            console.error('Error fetching cart:', error);
        }
    };

    useEffect(() => {
        let filtered = products;

        if (selectedCategory) {
            filtered = filtered.filter(p => p.category === selectedCategory);
        }

        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        setFilteredProducts(filtered);
    }, [selectedCategory, searchTerm, products]);

    const addToCart = async (productId: string, productName: string) => {
        if (!user?.id) {
            alert('Please login to add items to cart');
            return;
        }

        try {
            const existing = cart.find(item => item.product_id === productId);
            if (existing) {
                await supabase
                    .from('gym_cart')
                    .update({ quantity: existing.quantity + 1 })
                    .eq('id', existing.id);
            } else {
                await supabase.from('gym_cart').insert({
                    user_id: user.id,
                    product_id: productId,
                    quantity: 1
                });
            }
            await fetchCart();
            alert(`${productName} added to cart!`);
        } catch (error) {
            console.error('Error adding to cart:', error);
            alert('Failed to add item to cart');
        }
    };

    const getCartCount = () => cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="min-h-screen bg-[#090E1A] text-white pb-20">
            <StatusBar />
            <Header onProfileClick={() => onNavigate('PROFILE')} />
            <div className="sticky top-0 z-30 bg-[#090E1A]/95 backdrop-blur border-b border-slate-800 px-6 py-3">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-bold">Store</h1>
                    <button
                        onClick={() => onNavigate('CART')}
                        className="relative bg-slate-800 p-2.5 rounded-xl hover:bg-slate-700 transition-colors"
                    >
                        <span className="material-symbols-rounded">shopping_cart</span>
                        {getCartCount() > 0 && (
                            <span className="absolute -top-1 -right-1 bg-primary text-slate-900 text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                                {getCartCount()}
                            </span>
                        )}
                    </button>
                </div>

                <div className="relative mt-4">
                    <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800 border-none rounded-xl p-3 pl-10 text-sm placeholder-slate-500 focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                </div>
            </div>

            <main className="px-6 py-6">
                {/* Category Filter */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${selectedCategory === null
                                ? 'bg-primary text-slate-900'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                        >
                            All
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${selectedCategory === cat.id
                                    ? 'bg-primary text-slate-900'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Products Grid */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <span className="material-symbols-rounded text-slate-500 text-5xl mb-3">shopping_bag</span>
                        <h3 className="text-lg font-bold text-slate-400 mb-1">No products found</h3>
                        <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 hover:border-primary/50 transition-colors">
                                <div className="relative aspect-square bg-slate-900 overflow-hidden">
                                    <img
                                        src={product.main_image || 'https://via.placeholder.com/200?text=Product'}
                                        alt={product.name}
                                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                                    />
                                    {product.sale_price && product.mrp > product.sale_price && (
                                        <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded">
                                            {Math.round(((product.mrp - product.sale_price) / product.mrp) * 100)}% OFF
                                        </div>
                                    )}
                                </div>

                                <div className="p-3">
                                    <h3 className="font-bold text-sm line-clamp-2 mb-1">{product.name}</h3>

                                    <div className="flex items-baseline gap-2 mb-3">
                                        <span className="text-primary font-black text-lg">
                                            ₹{product.sale_price || product.mrp}
                                        </span>
                                        {product.sale_price && product.mrp > product.sale_price && (
                                            <span className="text-slate-500 text-xs line-through">
                                                ₹{product.mrp}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onNavigate('STORE')}
                                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => addToCart(product.id, product.name)}
                                            className="flex-1 bg-primary hover:bg-primary/90 text-slate-900 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                                        >
                                            <span className="material-symbols-rounded text-sm">add_shopping_cart</span>
                                            Add
                                        </button>
                                    </div>

                                    {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
                                        <p className="text-[10px] text-orange-500 font-bold mt-2">Only {product.stock_quantity} left!</p>
                                    )}
                                    {product.stock_quantity === 0 && (
                                        <p className="text-[10px] text-red-500 font-bold mt-2">Out of Stock</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
            <BottomNav active="HOME" onNavigate={onNavigate} />
        </div>
    );
};

export default StoreScreen;
