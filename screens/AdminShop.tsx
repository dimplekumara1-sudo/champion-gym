import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';

const AdminShop: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'orders' | 'sales' | 'inventory'>('products');
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form visibility states
    const [showProductForm, setShowProductForm] = useState(false);
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [editingCategory, setEditingCategory] = useState<any>(null);

    // Product form
    const [productForm, setProductForm] = useState({
        category_id: '',
        name: '',
        description: '',
        mrp: '',
        sale_price: '',
        purchase_price: '',
        stock_quantity: '',
        gst_percentage: '18',
        is_featured: false,
        main_image: '',
        images: [] as string[]
    });

    const [imagePreview, setImagePreview] = useState<string>('');

    // Category form
    const [categoryForm, setCategoryForm] = useState({
        name: '',
        description: '',
        icon: 'shopping_bag'
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                fetchProducts(),
                fetchCategories(),
                fetchOrders()
            ]);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('gym_products')
                .select('*, category:gym_product_categories(name)')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('gym_product_categories')
                .select('*')
                .order('display_order');
            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchOrders = async () => {
        try {
            const { data, error } = await supabase
                .from('gym_orders')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    // Product Management
    const handleSaveProduct = async () => {
        try {
            if (!productForm.name || !productForm.mrp || !productForm.sale_price || !productForm.category_id) {
                alert('Please fill all required fields');
                return;
            }

            if (editingProduct?.id) {
                const { error } = await supabase
                    .from('gym_products')
                    .update({
                        ...productForm,
                        category_id: parseInt(productForm.category_id),
                        mrp: parseFloat(productForm.mrp),
                        sale_price: parseFloat(productForm.sale_price),
                        purchase_price: productForm.purchase_price ? parseFloat(productForm.purchase_price) : null,
                        stock_quantity: parseInt(productForm.stock_quantity),
                        gst_percentage: parseFloat(productForm.gst_percentage) || 18
                    })
                    .eq('id', editingProduct.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('gym_products').insert({
                    ...productForm,
                    category_id: parseInt(productForm.category_id),
                    mrp: parseFloat(productForm.mrp),
                    sale_price: parseFloat(productForm.sale_price),
                    purchase_price: productForm.purchase_price ? parseFloat(productForm.purchase_price) : null,
                    stock_quantity: parseInt(productForm.stock_quantity),
                    gst_percentage: parseFloat(productForm.gst_percentage) || 18,
                    main_image: productForm.main_image,
                    images: productForm.images
                });
                if (error) throw error;
            }

            setEditingProduct(null);
            setShowProductForm(false);
            setImagePreview('');
            setProductForm({
                category_id: '',
                name: '',
                description: '',
                mrp: '',
                sale_price: '',
                purchase_price: '',
                stock_quantity: '',
                gst_percentage: '18',
                is_featured: false,
                main_image: '',
                images: []
            });
            await fetchProducts();
            alert('Product saved successfully!');
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Failed to save product');
        }
    };

    const handleDeleteProduct = async (id: number) => {
        if (!window.confirm('Delete this product?')) return;
        try {
            const { error } = await supabase.from('gym_products').delete().eq('id', id);
            if (error) throw error;
            await fetchProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    };

    // Category Management
    const handleSaveCategory = async () => {
        try {
            if (!categoryForm.name) {
                alert('Category name is required');
                return;
            }

            if (editingCategory?.id) {
                const { error } = await supabase
                    .from('gym_product_categories')
                    .update(categoryForm)
                    .eq('id', editingCategory.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('gym_product_categories').insert(categoryForm);
                if (error) throw error;
            }

            setEditingCategory(null);
            setShowCategoryForm(false);
            setCategoryForm({ name: '', description: '', icon: 'shopping_bag' });
            await fetchCategories();
            alert('Category saved successfully!');
        } catch (error) {
            console.error('Error saving category:', error);
            alert('Failed to save category');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-20">
            <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800 sticky top-0 z-20 bg-slate-900">
                <div className="flex items-center gap-3">
                    <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="material-symbols-rounded">arrow_back</button>
                    <h1 className="text-xl font-bold">Shop Management</h1>
                </div>
            </header>

            <main className="px-6 py-6">
                {/* Tab Navigation */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {['products', 'categories', 'orders', 'sales', 'inventory'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-colors ${activeTab === tab
                                ? 'bg-primary text-slate-900'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <>
                        {/* Products Tab */}
                        {activeTab === 'products' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-lg font-bold">Products</h2>
                                    <button
                                        onClick={() => {
                                            setShowProductForm(true);
                                            setEditingProduct(null);
                                            setImagePreview('');
                                            setProductForm({
                                                category_id: '',
                                                name: '',
                                                description: '',
                                                mrp: '',
                                                sale_price: '',
                                                purchase_price: '',
                                                stock_quantity: '',
                                                gst_percentage: '18',
                                                is_featured: false,
                                                main_image: '',
                                                images: []
                                            });
                                        }}
                                        className="bg-primary text-slate-900 px-4 py-2 rounded-lg font-bold text-sm"
                                    >
                                        + Add Product
                                    </button>
                                </div>

                                {showProductForm && (
                                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-6">
                                        <h3 className="text-lg font-bold mb-4">
                                            {editingProduct?.id ? 'Edit Product' : 'New Product'}
                                        </h3>

                                        <div className="space-y-4 mb-6">
                                            <select
                                                value={productForm.category_id}
                                                onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-primary outline-none"
                                            >
                                                <option value="">Select Category</option>
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>

                                            <input
                                                type="text"
                                                placeholder="Product Name"
                                                value={productForm.name}
                                                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:border-primary outline-none"
                                            />

                                            <textarea
                                                placeholder="Description"
                                                value={productForm.description}
                                                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:border-primary outline-none"
                                                rows={3}
                                            />

                                            <div className="grid grid-cols-2 gap-4">
                                                <input
                                                    type="number"
                                                    placeholder="MRP"
                                                    value={productForm.mrp}
                                                    onChange={(e) => setProductForm({ ...productForm, mrp: e.target.value })}
                                                    className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:border-primary outline-none"
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Sale Price"
                                                    value={productForm.sale_price}
                                                    onChange={(e) => setProductForm({ ...productForm, sale_price: e.target.value })}
                                                    className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:border-primary outline-none"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <input
                                                    type="number"
                                                    placeholder="Purchase Price (Optional)"
                                                    value={productForm.purchase_price}
                                                    onChange={(e) => setProductForm({ ...productForm, purchase_price: e.target.value })}
                                                    className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:border-primary outline-none"
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Stock Quantity"
                                                    value={productForm.stock_quantity}
                                                    onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                                                    className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:border-primary outline-none"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-400 mb-2 block">GST (%)</label>
                                                    <input
                                                        type="number"
                                                        placeholder="GST Percentage"
                                                        min="0"
                                                        max="100"
                                                        step="0.5"
                                                        value={productForm.gst_percentage}
                                                        onChange={(e) => setProductForm({ ...productForm, gst_percentage: e.target.value })}
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:border-primary outline-none"
                                                    />
                                                    <p className="text-[10px] text-slate-500 mt-1">Default: 18%</p>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-400 mb-2 block">Tax Amount (est.)</label>
                                                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-primary font-bold">
                                                        ₹{productForm.sale_price && productForm.gst_percentage ? (parseFloat(productForm.sale_price) * parseFloat(productForm.gst_percentage) / 100).toFixed(2) : '0'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Image Section */}
                                            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-4">
                                                <h4 className="font-bold text-sm">Product Image</h4>

                                                <input
                                                    type="url"
                                                    placeholder="Main Image URL (e.g., https://example.com/image.jpg)"
                                                    value={productForm.main_image}
                                                    onChange={(e) => {
                                                        setProductForm({ ...productForm, main_image: e.target.value });
                                                        setImagePreview(e.target.value);
                                                    }}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white placeholder-slate-500 focus:border-primary outline-none text-sm"
                                                />

                                                {imagePreview && (
                                                    <div className="relative">
                                                        <img
                                                            src={imagePreview}
                                                            alt="Preview"
                                                            className="w-full h-40 object-cover rounded-lg border border-slate-600"
                                                            onError={() => setImagePreview('')}
                                                        />
                                                        <p className="text-xs text-slate-400 mt-2">Image Preview</p>
                                                    </div>
                                                )}
                                            </div>

                                            <label className="flex items-center gap-3 bg-slate-900 p-3 rounded-lg border border-slate-700">
                                                <input
                                                    type="checkbox"
                                                    checked={productForm.is_featured}
                                                    onChange={(e) => setProductForm({ ...productForm, is_featured: e.target.checked })}
                                                    className="accent-primary"
                                                />
                                                <span>Featured Product</span>
                                            </label>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setShowProductForm(false)}
                                                className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-bold transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveProduct}
                                                className="flex-1 bg-primary hover:bg-primary/90 text-slate-900 py-3 rounded-lg font-bold transition-colors"
                                            >
                                                Save Product
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Products List */}
                                <div className="space-y-3">
                                    {products.map(product => (
                                        <div key={product.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex gap-4 justify-between items-start">
                                            {product.main_image && (
                                                <img
                                                    src={product.main_image}
                                                    alt={product.name}
                                                    className="w-20 h-20 object-cover rounded-lg border border-slate-600 flex-shrink-0"
                                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                                />
                                            )}
                                            <div className="flex-1">
                                                <h3 className="font-bold mb-1">{product.name}</h3>
                                                <p className="text-xs text-slate-400 mb-2">{product.category?.name}</p>
                                                <div className="flex gap-4 text-sm">
                                                    <span className="text-primary font-bold">MRP: ₹{product.mrp}</span>
                                                    <span className="text-green-500 font-bold">Sale: ₹{product.sale_price}</span>
                                                    <span className="text-slate-400">Stock: {product.stock_quantity}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingProduct(product);
                                                        setShowProductForm(true);
                                                        setImagePreview(product.main_image || '');
                                                        setProductForm({
                                                            category_id: product.category_id.toString(),
                                                            name: product.name,
                                                            description: product.description || '',
                                                            mrp: product.mrp.toString(),
                                                            sale_price: product.sale_price.toString(),
                                                            purchase_price: product.purchase_price?.toString() || '',
                                                            stock_quantity: product.stock_quantity.toString(),
                                                            is_featured: product.is_featured,
                                                            main_image: product.main_image || '',
                                                            images: product.images || []
                                                        });
                                                    }}
                                                    className="material-symbols-rounded text-slate-400 hover:text-primary transition-colors"
                                                >
                                                    edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProduct(product.id)}
                                                    className="material-symbols-rounded text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Categories Tab */}
                        {activeTab === 'categories' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-lg font-bold">Categories</h2>
                                    <button
                                        onClick={() => {
                                            setShowCategoryForm(true);
                                            setEditingCategory(null);
                                            setCategoryForm({ name: '', description: '', icon: 'shopping_bag' });
                                        }}
                                        className="bg-primary text-slate-900 px-4 py-2 rounded-lg font-bold text-sm"
                                    >
                                        + Add Category
                                    </button>
                                </div>

                                {showCategoryForm && (
                                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-6">
                                        <h3 className="text-lg font-bold mb-4">
                                            {editingCategory?.id ? 'Edit Category' : 'New Category'}
                                        </h3>

                                        <div className="space-y-4 mb-6">
                                            <input
                                                type="text"
                                                placeholder="Category Name"
                                                value={categoryForm.name}
                                                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:border-primary outline-none"
                                            />

                                            <textarea
                                                placeholder="Description"
                                                value={categoryForm.description}
                                                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:border-primary outline-none"
                                                rows={3}
                                            />

                                            <input
                                                type="text"
                                                placeholder="Material Symbol Icon Name (e.g., shopping_bag)"
                                                value={categoryForm.icon}
                                                onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:border-primary outline-none"
                                            />
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setShowCategoryForm(false)}
                                                className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-bold transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveCategory}
                                                className="flex-1 bg-primary hover:bg-primary/90 text-slate-900 py-3 rounded-lg font-bold transition-colors"
                                            >
                                                Save Category
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Categories List */}
                                <div className="space-y-3">
                                    {categories.map(cat => (
                                        <div key={cat.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <span className="material-symbols-rounded text-primary">{cat.icon}</span>
                                                <div>
                                                    <h3 className="font-bold">{cat.name}</h3>
                                                    <p className="text-xs text-slate-400">{cat.description}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingCategory(cat);
                                                        setShowCategoryForm(true);
                                                        setCategoryForm({
                                                            name: cat.name,
                                                            description: cat.description || '',
                                                            icon: cat.icon || 'shopping_bag'
                                                        });
                                                    }}
                                                    className="material-symbols-rounded text-slate-400 hover:text-primary transition-colors"
                                                >
                                                    edit
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Orders Tab */}
                        {activeTab === 'orders' && (
                            <div>
                                <h2 className="text-lg font-bold mb-4">Orders Management</h2>

                                {/* Status Filter */}
                                <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
                                    {['all', 'pending', 'shipped', 'delivered', 'cancelled'].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => {
                                                const filtered = status === 'all'
                                                    ? orders
                                                    : orders.filter(o => o.order_status === status);
                                                setOrders(filtered);
                                            }}
                                            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${status === 'all'
                                                ? 'bg-primary text-slate-900'
                                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                }`}
                                        >
                                            {status.toUpperCase()}
                                        </button>
                                    ))}
                                </div>

                                {orders.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-slate-400">No orders found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {orders.map(order => (
                                            <div key={order.id} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition-colors">
                                                <div className="p-4">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex-1">
                                                            <h3 className="font-bold text-sm">{order.order_number}</h3>
                                                            <p className="text-xs text-slate-400 mt-1">{order.user_id}</p>
                                                            <p className="text-xs text-slate-500 mt-1">
                                                                {new Date(order.created_at).toLocaleDateString('en-IN', {
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: 'numeric'
                                                                })}
                                                            </p>
                                                        </div>
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.order_status === 'delivered'
                                                                ? 'text-green-500 bg-green-500/10'
                                                                : order.order_status === 'cancelled'
                                                                    ? 'text-red-500 bg-red-500/10'
                                                                    : order.order_status === 'shipped'
                                                                        ? 'text-blue-500 bg-blue-500/10'
                                                                        : 'text-orange-500 bg-orange-500/10'
                                                            }`}>
                                                            {order.order_status.toUpperCase()}
                                                        </span>
                                                    </div>

                                                    <div className="flex justify-between items-center">
                                                        <p className="text-sm text-slate-400">₹{order.total_amount.toFixed(2)}</p>
                                                        <span className={`text-xs font-bold px-2 py-1 rounded ${order.payment_status === 'paid'
                                                                ? 'bg-green-500/20 text-green-500'
                                                                : order.payment_status === 'failed'
                                                                    ? 'bg-red-500/20 text-red-500'
                                                                    : 'bg-orange-500/20 text-orange-500'
                                                            }`}>
                                                            {order.payment_status.toUpperCase()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Sales Tab */}
                        {activeTab === 'sales' && (
                            <div>
                                <h2 className="text-lg font-bold mb-6">Sales Analytics</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                                        <p className="text-slate-400 text-sm mb-2">Total Orders</p>
                                        <p className="text-2xl font-black text-primary">{orders.length}</p>
                                    </div>
                                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                                        <p className="text-slate-400 text-sm mb-2">Total Revenue</p>
                                        <p className="text-2xl font-black text-primary">
                                            ₹{orders.reduce((sum, o) => sum + (o.total_amount || 0), 0).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Inventory Tab */}
                        {activeTab === 'inventory' && (
                            <div>
                                <h2 className="text-lg font-bold mb-6">Inventory Alerts</h2>
                                <div className="space-y-3">
                                    {products
                                        .filter(p => p.stock_quantity <= (p.reorder_level || 10))
                                        .map(product => (
                                            <div key={product.id} className="bg-orange-500/10 border border-orange-500/50 rounded-lg p-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-bold text-orange-500">{product.name}</h3>
                                                        <p className="text-sm text-slate-400">{product.category?.name}</p>
                                                    </div>
                                                    <span className="text-lg font-black text-orange-500">{product.stock_quantity} left</span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default AdminShop;
