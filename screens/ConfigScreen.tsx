import React, { useEffect, useState } from 'react';
import { AppScreen } from '../types';
import { supabase } from '../lib/supabase';

interface ConfigScreenProps {
    onNavigate: (screen: AppScreen) => void;
}

const ConfigScreen: React.FC<ConfigScreenProps> = ({ onNavigate }) => {
    const [exerciseCount, setExerciseCount] = useState(0);
    const [foodCount, setFoodCount] = useState(0);
    const [reviewCount, setReviewCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCounts();
    }, []);

    const fetchCounts = async () => {
        try {
            setLoading(true);
            const [exerciseRes, foodRes, reviewRes] = await Promise.all([
                supabase.from('exercises').select('id', { count: 'exact' }),
                supabase.from('indian_foods').select('id', { count: 'exact' }),
                supabase.from('pending_food_submissions').select('id', { count: 'exact', head: false }).eq('status', 'pending'),
            ]);

            setExerciseCount(exerciseRes.count || 0);
            setFoodCount(foodRes.count || 0);
            setReviewCount(reviewRes.count || 0);
        } catch (error) {
            console.error('Error fetching counts:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#090E1A] text-white flex flex-col">
            {/* Header */}
            <div className="border-b border-white/10 px-4 py-4 flex items-center justify-between">
                <h1 className="text-xl font-bold">Configuration</h1>
                <button
                    onClick={() => onNavigate('ADMIN_DASHBOARD')}
                    className="text-slate-400 hover:text-white transition-colors"
                >
                    <span className="material-symbols-rounded">close</span>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 py-8 pb-32">
                {/* Stats Cards */}
                {!loading && (
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                            <div className="flex flex-col items-center text-center">
                                <span className="material-symbols-rounded text-3xl text-primary mb-2">fitness_center</span>
                                <p className="text-sm text-slate-400">Exercise Items</p>
                                <p className="text-2xl font-bold">{exerciseCount}</p>
                            </div>
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                            <div className="flex flex-col items-center text-center">
                                <span className="material-symbols-rounded text-3xl text-primary mb-2">restaurant</span>
                                <p className="text-sm text-slate-400">Food Items</p>
                                <p className="text-2xl font-bold">{foodCount}</p>
                            </div>
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                            <div className="flex flex-col items-center text-center">
                                <span className="material-symbols-rounded text-3xl text-orange-400 mb-2">pending_actions</span>
                                <p className="text-sm text-slate-400">In Review</p>
                                <p className="text-2xl font-bold">{reviewCount}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {/* Exercise Database Button */}
                    <button
                        onClick={() => onNavigate('ADMIN_EXERCISES')}
                        className="w-full p-6 rounded-lg border border-white/10 hover:border-primary/50 bg-white/5 hover:bg-primary/10 transition-all group"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                                <span className="material-symbols-rounded text-3xl text-primary group-hover:scale-110 transition-transform">
                                    fitness_center
                                </span>
                            </div>
                            <div className="text-left flex-1">
                                <h2 className="text-lg font-bold mb-2">Exercise Database</h2>
                                <p className="text-sm text-slate-400">
                                    Manage exercise categories, details, and video links. Upload bulk exercise data via CSV/Excel.
                                </p>
                            </div>
                            <div className="flex-shrink-0 mt-1">
                                <span className="material-symbols-rounded text-slate-500 group-hover:text-primary transition-colors">
                                    arrow_forward
                                </span>
                            </div>
                        </div>
                    </button>

                    {/* Food Nutrition Data Button */}
                    <button
                        onClick={() => onNavigate('ADMIN_INDIAN_FOODS')}
                        className="w-full p-6 rounded-lg border border-white/10 hover:border-primary/50 bg-white/5 hover:bg-primary/10 transition-all group"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                                <span className="material-symbols-rounded text-3xl text-primary group-hover:scale-110 transition-transform">
                                    restaurant
                                </span>
                            </div>
                            <div className="text-left flex-1">
                                <h2 className="text-lg font-bold mb-2">Food Nutrition Data</h2>
                                <p className="text-sm text-slate-400">
                                    Manage Indian food items, nutritional information, and calorie data. Upload bulk data via CSV/Excel.
                                </p>
                            </div>
                            <div className="flex-shrink-0 mt-1">
                                <span className="material-symbols-rounded text-slate-500 group-hover:text-primary transition-colors">
                                    arrow_forward
                                </span>
                            </div>
                        </div>
                    </button>

                    {/* Food Approvals Button */}
                    <button
                        onClick={() => onNavigate('ADMIN_FOOD_APPROVALS')}
                        className="w-full p-6 rounded-lg border border-white/10 hover:border-primary/50 bg-white/5 hover:bg-primary/10 transition-all group"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                                <span className="material-symbols-rounded text-3xl text-primary group-hover:scale-110 transition-transform">
                                    approval
                                </span>
                            </div>
                            <div className="text-left flex-1">
                                <h2 className="text-lg font-bold mb-2">Food Approvals</h2>
                                <p className="text-sm text-slate-400">
                                    Review and approve user-submitted food items before adding them to the database.
                                </p>
                            </div>
                            <div className="flex-shrink-0 mt-1">
                                <span className="material-symbols-rounded text-slate-500 group-hover:text-primary transition-colors">
                                    arrow_forward
                                </span>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            <nav className="fixed bottom-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 pb-8 pt-3 px-6 max-w-[430px] mx-auto left-1/2 -translate-x-1/2">
                <div className="flex justify-between items-center">
                    <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="flex flex-col items-center gap-1 text-slate-400">
                        <span className="material-symbols-rounded">dashboard</span>
                        <span className="text-[10px] font-medium">Dashboard</span>
                    </button>
                    <button onClick={() => onNavigate('ADMIN_USERS')} className="flex flex-col items-center gap-1 text-slate-400">
                        <span className="material-symbols-rounded">people_alt</span>
                        <span className="text-[10px] font-medium">Members</span>
                    </button>
                    <button onClick={() => onNavigate('ADMIN_ORDERS')} className="flex flex-col items-center gap-1 text-slate-400">
                        <span className="material-symbols-rounded">shopping_cart_checkout</span>
                        <span className="text-[10px] font-medium">Orders</span>
                    </button>
                    <button onClick={() => onNavigate('ADMIN_SHOP')} className="flex flex-col items-center gap-1 text-primary">
                        <span className="material-symbols-rounded">storefront</span>
                        <span className="text-[10px] font-medium">Shop</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default ConfigScreen;
