import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';
import StatusBar from '../components/StatusBar';
import BottomNav from '../components/BottomNav';

interface NutritionGoal {
    id: number;
    user_id: string;
    daily_calories_target: number;
    daily_protein_target: number;
    daily_carbs_target: number;
    daily_fat_target: number;
}

const NutritionGoals: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
    const [goals, setGoals] = useState<NutritionGoal | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editData, setEditData] = useState({
        daily_calories_target: 2000,
        daily_protein_target: 150,
        daily_carbs_target: 200,
        daily_fat_target: 65,
    });
    const [userId, setUserId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data } = await supabase.auth.getSession();
                if (data?.session?.user?.id) {
                    setUserId(data.session.user.id);
                    await fetchNutritionGoals(data.session.user.id);
                }
            } catch (err) {
                console.error('Error fetching user:', err);
            }
        };
        fetchUser();
    }, []);

    const fetchNutritionGoals = async (uid: string) => {
        try {
            setLoading(true);
            const { data, error: err } = await supabase
                .from('nutrition_goals')
                .select('*')
                .eq('user_id', uid)
                .single();

            if (err && err.code !== 'PGRST116') {
                throw err;
            }

            if (data) {
                setGoals(data);
                setEditData({
                    daily_calories_target: data.daily_calories_target,
                    daily_protein_target: data.daily_protein_target,
                    daily_carbs_target: data.daily_carbs_target,
                    daily_fat_target: data.daily_fat_target,
                });
            } else {
                // No goals exist, initialize with defaults
                setEditData({
                    daily_calories_target: 2000,
                    daily_protein_target: 150,
                    daily_carbs_target: 200,
                    daily_fat_target: 65,
                });
            }
        } catch (err) {
            console.error('Error fetching nutrition goals:', err);
            setError('Failed to load nutrition goals');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveGoals = async () => {
        if (!userId) {
            setError('User not found');
            return;
        }

        // Validation
        if (editData.daily_calories_target < 1000 || editData.daily_calories_target > 10000) {
            setError('Calories must be between 1000-10000');
            return;
        }
        if (editData.daily_protein_target < 0 || editData.daily_protein_target > 500) {
            setError('Protein must be between 0-500g');
            return;
        }
        if (editData.daily_carbs_target < 0 || editData.daily_carbs_target > 500) {
            setError('Carbs must be between 0-500g');
            return;
        }
        if (editData.daily_fat_target < 0 || editData.daily_fat_target > 300) {
            setError('Fat must be between 0-300g');
            return;
        }

        try {
            setSaving(true);
            setError('');
            setSuccess('');

            if (goals?.id) {
                // Update existing
                const { error: err } = await supabase
                    .from('nutrition_goals')
                    .update(editData)
                    .eq('user_id', userId);

                if (err) throw err;
            } else {
                // Insert new
                const { error: err } = await supabase
                    .from('nutrition_goals')
                    .insert([{
                        user_id: userId,
                        ...editData,
                    }]);

                if (err) throw err;
            }

            setSuccess('✓ Nutrition goals updated successfully!');
            await fetchNutritionGoals(userId);
            setEditing(false);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error saving goals:', err);
            setError(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    const macroCalories = {
        protein: editData.daily_protein_target * 4,
        carbs: editData.daily_carbs_target * 4,
        fat: editData.daily_fat_target * 9,
    };

    const totalFromMacros = macroCalories.protein + macroCalories.carbs + macroCalories.fat;
    const calorieBalance = editData.daily_calories_target - totalFromMacros;

    return (
        <div className="pb-32 bg-[#090E1A] min-h-screen">
            <StatusBar />
            <main className="pt-4 px-5">
                <header className="mb-6 flex items-center justify-between">
                    <button onClick={() => onNavigate('DASHBOARD')} className="p-2 -ml-2 rounded-full hover:bg-slate-800">
                        <span className="material-symbols-rounded">arrow_back</span>
                    </button>
                    <div className="text-center flex-1 pr-8">
                        <h1 className="text-xl font-extrabold tracking-tight">Nutrition Goals</h1>
                        <p className="text-slate-400 text-xs font-medium">Set your daily targets</p>
                    </div>
                </header>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <>
                        {/* Display Mode */}
                        {!editing && (
                            <div className="space-y-4">
                                {/* Calories Card */}
                                <div className="bg-[#151C2C] rounded-3xl p-6 border border-[#1E293B]">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Daily Calorie Goal</span>
                                        <span className="material-symbols-rounded text-primary text-2xl">local_fire_department</span>
                                    </div>
                                    <p className="text-5xl font-black text-white mb-2">{editData.daily_calories_target}</p>
                                    <p className="text-sm text-slate-400">kilocalories (kcal)</p>
                                </div>

                                {/* Macros Grid */}
                                <div>
                                    <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Macronutrient Targets</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        {/* Protein */}
                                        <div className="bg-[#151C2C] rounded-2xl p-4 border border-[#1E293B]">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="material-symbols-rounded text-red-400 text-xl">egg</span>
                                                <span className="text-[10px] font-bold text-slate-500">{((editData.daily_protein_target / editData.daily_calories_target) * 100).toFixed(0)}%</span>
                                            </div>
                                            <p className="text-2xl font-black text-red-400">{editData.daily_protein_target}</p>
                                            <p className="text-[10px] text-slate-500 font-medium">grams</p>
                                            <p className="text-[9px] text-slate-600 mt-1">{(editData.daily_protein_target * 4).toFixed(0)} cal (×4)</p>
                                        </div>

                                        {/* Carbs */}
                                        <div className="bg-[#151C2C] rounded-2xl p-4 border border-[#1E293B]">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="material-symbols-rounded text-blue-400 text-xl">grain</span>
                                                <span className="text-[10px] font-bold text-slate-500">{((editData.daily_carbs_target / editData.daily_calories_target) * 100).toFixed(0)}%</span>
                                            </div>
                                            <p className="text-2xl font-black text-blue-400">{editData.daily_carbs_target}</p>
                                            <p className="text-[10px] text-slate-500 font-medium">grams</p>
                                            <p className="text-[9px] text-slate-600 mt-1">{(editData.daily_carbs_target * 4).toFixed(0)} cal (×4)</p>
                                        </div>

                                        {/* Fat */}
                                        <div className="bg-[#151C2C] rounded-2xl p-4 border border-[#1E293B]">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="material-symbols-rounded text-amber-400 text-xl">oil_barrel</span>
                                                <span className="text-[10px] font-bold text-slate-500">{((editData.daily_fat_target / editData.daily_calories_target) * 100).toFixed(0)}%</span>
                                            </div>
                                            <p className="text-2xl font-black text-amber-400">{editData.daily_fat_target}</p>
                                            <p className="text-[10px] text-slate-500 font-medium">grams</p>
                                            <p className="text-[9px] text-slate-600 mt-1">{(editData.daily_fat_target * 9).toFixed(0)} cal (×9)</p>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="mt-3 bg-slate-800/30 p-3 rounded-xl">
                                        <p className="text-[10px] text-slate-400 font-medium">
                                            <span className="text-slate-300 font-semibold">Total from macros: </span>
                                            {totalFromMacros.toFixed(0)} kcal
                                            {calorieBalance !== 0 && (
                                                <span className="block mt-1">
                                                    <span className="text-slate-300 font-semibold">Difference: </span>
                                                    <span className={calorieBalance > 0 ? 'text-amber-400' : 'text-blue-400'}>
                                                        {calorieBalance > 0 ? '+' : ''}{calorieBalance.toFixed(0)} kcal
                                                    </span>
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Edit Button */}
                                <button
                                    onClick={() => setEditing(true)}
                                    className="w-full bg-primary hover:bg-green-600 text-slate-900 font-black py-4 rounded-2xl uppercase tracking-wider flex items-center justify-center gap-2 transition-colors mt-6"
                                >
                                    <span className="material-symbols-rounded">edit</span>
                                    Edit Goals
                                </button>
                            </div>
                        )}

                        {/* Edit Mode */}
                        {editing && (
                            <div className="space-y-4">
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm">
                                        {error}
                                    </div>
                                )}

                                {success && (
                                    <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-3 rounded-lg text-sm">
                                        {success}
                                    </div>
                                )}

                                {/* Daily Calories */}
                                <div className="bg-[#151C2C] rounded-2xl p-5 border border-[#1E293B]">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Daily Calories</label>
                                        <span className="text-2xl font-black text-primary">{editData.daily_calories_target}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1000"
                                        max="10000"
                                        step="100"
                                        value={editData.daily_calories_target}
                                        onChange={(e) => setEditData({ ...editData, daily_calories_target: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-500 mt-2">
                                        <span>1000</span>
                                        <span>10000</span>
                                    </div>
                                </div>

                                {/* Daily Protein */}
                                <div className="bg-[#151C2C] rounded-2xl p-5 border border-[#1E293B]">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Daily Protein</label>
                                        <span className="text-2xl font-black text-red-400">{editData.daily_protein_target}g</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="500"
                                        step="5"
                                        value={editData.daily_protein_target}
                                        onChange={(e) => setEditData({ ...editData, daily_protein_target: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-500 mt-2">
                                        <span>0g</span>
                                        <span className="text-red-400">~{(editData.daily_protein_target * 4).toFixed(0)} cal</span>
                                        <span>500g</span>
                                    </div>
                                </div>

                                {/* Daily Carbs */}
                                <div className="bg-[#151C2C] rounded-2xl p-5 border border-[#1E293B]">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Daily Carbs</label>
                                        <span className="text-2xl font-black text-blue-400">{editData.daily_carbs_target}g</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="500"
                                        step="5"
                                        value={editData.daily_carbs_target}
                                        onChange={(e) => setEditData({ ...editData, daily_carbs_target: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-500 mt-2">
                                        <span>0g</span>
                                        <span className="text-blue-400">~{(editData.daily_carbs_target * 4).toFixed(0)} cal</span>
                                        <span>500g</span>
                                    </div>
                                </div>

                                {/* Daily Fat */}
                                <div className="bg-[#151C2C] rounded-2xl p-5 border border-[#1E293B]">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Daily Fat</label>
                                        <span className="text-2xl font-black text-amber-400">{editData.daily_fat_target}g</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="300"
                                        step="5"
                                        value={editData.daily_fat_target}
                                        onChange={(e) => setEditData({ ...editData, daily_fat_target: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-500 mt-2">
                                        <span>0g</span>
                                        <span className="text-amber-400">~{(editData.daily_fat_target * 9).toFixed(0)} cal</span>
                                        <span>300g</span>
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setEditing(false)}
                                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveGoals}
                                        disabled={saving}
                                        className="flex-1 bg-primary hover:bg-green-600 text-slate-900 font-black py-4 rounded-2xl uppercase tracking-wider disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {saving ? (
                                            <>
                                                <span className="animate-spin inline-block w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full"></span>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-rounded">check</span>
                                                Save Goals
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            <BottomNav active="HOME" onNavigate={onNavigate} />
        </div>
    );
};

export default NutritionGoals;
