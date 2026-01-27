import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';
import {
    parseFile,
    validateFoodRecords,
    downloadCSVTemplate,
    type ParsedFoodRecord,
} from '../lib/fileParser';
import { IndianFood } from '../lib/indianFoodService';

const AdminIndianFoods: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
    const [foods, setFoods] = useState<IndianFood[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [parsedRecords, setParsedRecords] = useState<ParsedFoodRecord[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    const [showAddSingle, setShowAddSingle] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingFood, setEditingFood] = useState<IndianFood | null>(null);
    const [singleFoodData, setSingleFoodData] = useState({
        dish_name: '',
        calories_kcal: 0,
        protein_g: 0,
        carbohydrates_g: 0,
        fats_g: 0,
        free_sugar_g: 0,
        fibre_g: 0,
        sodium_mg: 0,
        calcium_mg: 0,
        iron_mg: 0,
        vitamin_c_mg: 0,
        folate_mcg: 0,
    });
    const itemsPerPage = 19;

    useEffect(() => {
        fetchFoods();
    }, [currentPage, searchTerm]);

    const fetchFoods = async () => {
        try {
            setLoading(true);
            setError('');

            let query = supabase.from('indian_foods').select('*', { count: 'exact' });

            if (searchTerm) {
                query = query.ilike('dish_name', `%${searchTerm}%`);
            }

            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            const { data, error: err, count } = await query.range(from, to).order('dish_name');

            if (err) throw err;

            setFoods(data || []);
            setTotalItems(count || 0);
        } catch (err) {
            setError(`Error fetching foods: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setError('');
            setSuccess('');
            setParsedRecords([]);

            // Parse the file
            const parsed = await parseFile(file);

            // Validate the records
            const validation = validateFoodRecords(parsed);

            if (!validation.valid) {
                setError(`Validation errors found:\n${validation.errors.join('\n')}`);
                return;
            }

            setParsedRecords(validation.records);
            setShowPreview(true);
            setSuccess(`✓ Parsed ${validation.records.length} food records. Review below before uploading.`);
        } catch (err) {
            setError(`Error parsing file: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    const uploadParsedRecords = async () => {
        if (parsedRecords.length === 0) return;

        try {
            setUploading(true);
            setError('');
            setSuccess('');

            // Transform records to match database schema
            const dataToUpload = parsedRecords.map(record => ({
                dish_name: record.dish_name.trim(),
                calories_kcal: record.calories_kcal,
                carbohydrates_g: record.carbohydrates_g,
                protein_g: record.protein_g,
                fats_g: record.fats_g,
                free_sugar_g: record.free_sugar_g || null,
                fibre_g: record.fibre_g || null,
                sodium_mg: record.sodium_mg || null,
                calcium_mg: record.calcium_mg || null,
                iron_mg: record.iron_mg || null,
                vitamin_c_mg: record.vitamin_c_mg || null,
                folate_mcg: record.folate_mcg || null,
            }));

            // Upload in batches of 50
            const batchSize = 50;
            let uploadedCount = 0;

            for (let i = 0; i < dataToUpload.length; i += batchSize) {
                const batch = dataToUpload.slice(i, i + batchSize);

                const { error: err } = await supabase
                    .from('indian_foods')
                    .upsert(batch, { onConflict: 'dish_name' });

                if (err) throw err;

                uploadedCount += batch.length;
            }

            setSuccess(`✓ Successfully uploaded ${uploadedCount} food items!`);
            setParsedRecords([]);
            setShowPreview(false);
            setCurrentPage(1);
            await fetchFoods();
        } catch (err) {
            setError(`Error uploading foods: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setUploading(false);
        }
    };

    const deleteFood = async (id: number) => {
        try {
            setError('');
            const { error: err } = await supabase
                .from('indian_foods')
                .delete()
                .eq('id', id);

            if (err) throw err;

            setSuccess('✓ Food item deleted successfully');
            setDeleteConfirm(null);
            await fetchFoods();
        } catch (err) {
            setError(`Error deleting food: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    const deleteAllFoods = async () => {
        if (!window.confirm('Are you sure you want to delete ALL food items? This cannot be undone.')) {
            return;
        }

        try {
            setError('');
            const { error: err } = await supabase
                .from('indian_foods')
                .delete()
                .neq('id', 0); // Delete all rows

            if (err) throw err;

            setSuccess('✓ All food items deleted successfully');
            setCurrentPage(1);
            await fetchFoods();
        } catch (err) {
            setError(`Error deleting foods: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    const addSingleFood = async () => {
        if (!singleFoodData.dish_name.trim()) {
            setError('Please enter a dish name');
            return;
        }

        try {
            setError('');
            setUploading(true);

            const { error: err } = await supabase
                .from('indian_foods')
                .insert([{
                    dish_name: singleFoodData.dish_name.trim(),
                    calories_kcal: singleFoodData.calories_kcal,
                    carbohydrates_g: singleFoodData.carbohydrates_g,
                    protein_g: singleFoodData.protein_g,
                    fats_g: singleFoodData.fats_g,
                    free_sugar_g: singleFoodData.free_sugar_g || null,
                    fibre_g: singleFoodData.fibre_g || null,
                    sodium_mg: singleFoodData.sodium_mg || null,
                    calcium_mg: singleFoodData.calcium_mg || null,
                    iron_mg: singleFoodData.iron_mg || null,
                    vitamin_c_mg: singleFoodData.vitamin_c_mg || null,
                    folate_mcg: singleFoodData.folate_mcg || null,
                }]);

            if (err) throw err;

            setSuccess('✓ Food item added successfully');
            setSingleFoodData({
                dish_name: '',
                calories_kcal: 0,
                protein_g: 0,
                carbohydrates_g: 0,
                fats_g: 0,
                free_sugar_g: 0,
                fibre_g: 0,
                sodium_mg: 0,
                calcium_mg: 0,
                iron_mg: 0,
                vitamin_c_mg: 0,
                folate_mcg: 0,
            });
            setShowAddSingle(false);
            setCurrentPage(1);
            await fetchFoods();
        } catch (err) {
            setError(`Error adding food: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setUploading(false);
        }
    };

    const updateFood = async () => {
        if (!editingFood || !editingFood.dish_name.trim()) {
            setError('Please enter a dish name');
            return;
        }

        try {
            setError('');
            setUploading(true);

            const { error: err } = await supabase
                .from('indian_foods')
                .update({
                    dish_name: editingFood.dish_name.trim(),
                    calories_kcal: editingFood.calories_kcal,
                    carbohydrates_g: editingFood.carbohydrates_g,
                    protein_g: editingFood.protein_g,
                    fats_g: editingFood.fats_g,
                    free_sugar_g: editingFood.free_sugar_g || null,
                    fibre_g: editingFood.fibre_g || null,
                    sodium_mg: editingFood.sodium_mg || null,
                    calcium_mg: editingFood.calcium_mg || null,
                    iron_mg: editingFood.iron_mg || null,
                    vitamin_c_mg: editingFood.vitamin_c_mg || null,
                    folate_mcg: editingFood.folate_mcg || null,
                })
                .eq('id', editingFood.id);

            if (err) throw err;

            setSuccess('✓ Food item updated successfully');
            setEditingFood(null);
            setShowEditModal(false);
            await fetchFoods();
        } catch (err) {
            setError(`Error updating food: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setUploading(false);
        }
    };

    const startEdit = (food: IndianFood) => {
        setEditingFood({ ...food });
        setShowEditModal(true);
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-black dark:via-slate-900 dark:to-black text-white pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/20 to-orange-500/20 border-b border-slate-700/50 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => onNavigate('ADMIN_DASHBOARD')}
                                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                            >
                                ← Back
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold text-white">Indian Foods Management</h1>
                                <p className="text-slate-400 text-sm">Upload and manage food nutrition data</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-primary">{totalItems}</div>
                            <div className="text-sm text-slate-400">Total Items</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Status Messages */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                        <div className="text-red-200 whitespace-pre-wrap">{error}</div>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                        <div className="text-green-200">{success}</div>
                    </div>
                )}

                {/* Add Single Food Section */}
                <div className="mb-8 bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold flex items-center space-x-2">
                            <span>➕</span>
                            <span>Add Single Food Item</span>
                        </h2>
                        <button
                            onClick={() => setShowAddSingle(!showAddSingle)}
                            className="px-4 py-2 bg-primary text-slate-900 font-bold rounded-lg hover:bg-green-600 transition-colors"
                        >
                            {showAddSingle ? 'Cancel' : 'Add Food'}
                        </button>
                    </div>

                    {showAddSingle && (
                        <div className="space-y-6">
                            <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
                                <p className="text-primary text-sm font-bold flex items-center gap-2">
                                    <span className="material-symbols-rounded text-base">info</span>
                                    Enter nutrition values per 100g of the food item
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Dish Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Paneer Tikka"
                                        value={singleFoodData.dish_name}
                                        onChange={(e) => setSingleFoodData({ ...singleFoodData, dish_name: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Calories (kcal)</label>
                                    <input
                                        type="number"
                                        placeholder="0.0"
                                        value={singleFoodData.calories_kcal || ''}
                                        onChange={(e) => setSingleFoodData({ ...singleFoodData, calories_kcal: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Protein (g)</label>
                                    <input
                                        type="number"
                                        placeholder="0.0"
                                        value={singleFoodData.protein_g || ''}
                                        onChange={(e) => setSingleFoodData({ ...singleFoodData, protein_g: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Carbs (g)</label>
                                    <input
                                        type="number"
                                        placeholder="0.0"
                                        value={singleFoodData.carbohydrates_g || ''}
                                        onChange={(e) => setSingleFoodData({ ...singleFoodData, carbohydrates_g: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Fats (g)</label>
                                    <input
                                        type="number"
                                        placeholder="0.0"
                                        value={singleFoodData.fats_g || ''}
                                        onChange={(e) => setSingleFoodData({ ...singleFoodData, fats_g: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Fibre (g)</label>
                                    <input
                                        type="number"
                                        placeholder="0.0"
                                        value={singleFoodData.fibre_g || ''}
                                        onChange={(e) => setSingleFoodData({ ...singleFoodData, fibre_g: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Sodium (mg)</label>
                                    <input
                                        type="number"
                                        placeholder="0.0"
                                        value={singleFoodData.sodium_mg || ''}
                                        onChange={(e) => setSingleFoodData({ ...singleFoodData, sodium_mg: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Calcium (mg)</label>
                                    <input
                                        type="number"
                                        placeholder="0.0"
                                        value={singleFoodData.calcium_mg || ''}
                                        onChange={(e) => setSingleFoodData({ ...singleFoodData, calcium_mg: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Iron (mg)</label>
                                    <input
                                        type="number"
                                        placeholder="0.0"
                                        value={singleFoodData.iron_mg || ''}
                                        onChange={(e) => setSingleFoodData({ ...singleFoodData, iron_mg: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    />
                                </div>

                                <button
                                    onClick={addSingleFood}
                                    disabled={uploading || !singleFoodData.dish_name.trim()}
                                    className="col-span-1 md:col-span-2 lg:col-span-3 mt-4 px-6 py-4 bg-primary text-slate-900 font-black uppercase tracking-widest rounded-2xl hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
                                >
                                    {uploading ? '⏳ Adding Food...' : '✓ Add Food Item'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Upload Section */}
                <div className="mb-8 bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
                        <span>📤</span>
                        <span>Upload Food Data</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Upload Area */}
                        <div className="flex flex-col justify-between">
                            <div>
                                <label className="block text-sm font-semibold mb-4 text-slate-300">
                                    Upload CSV or XLSX File
                                </label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                        className="hidden"
                                        id="file-upload"
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className="block border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                                    >
                                        <div className="text-4xl mb-2">📁</div>
                                        <div className="font-semibold text-slate-300">Click to upload or drag and drop</div>
                                        <div className="text-sm text-slate-400 mt-1">CSV or XLSX files supported</div>
                                    </label>
                                </div>
                            </div>

                            <button
                                onClick={downloadCSVTemplate}
                                className="mt-4 w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm font-semibold"
                            >
                                📥 Download CSV Template
                            </button>
                        </div>

                        {/* Instructions */}
                        <div className="bg-slate-700/30 rounded-lg p-4">
                            <h3 className="font-bold mb-3 text-primary">Upload Instructions</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li>✓ File should have headers in the first row</li>
                                <li>✓ Required columns: Dish Name, Calories</li>
                                <li>✓ Optional columns: Protein, Carbs, Fat, Fiber, etc.</li>
                                <li>✓ Maximum batch size: 1000 items</li>
                                <li>✓ Duplicate items will be updated</li>
                                <li>✓ Download template to see correct format</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Preview Section */}
                {showPreview && parsedRecords.length > 0 && (
                    <div className="mb-8 bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                        <h2 className="text-2xl font-bold mb-4 flex items-center space-x-2">
                            <span>👀</span>
                            <span>Preview ({parsedRecords.length} items)</span>
                        </h2>

                        <div className="overflow-x-auto mb-4">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-700/50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-semibold">Dish Name</th>
                                        <th className="px-4 py-2 text-right font-semibold">Calories</th>
                                        <th className="px-4 py-2 text-right font-semibold">Protein (g)</th>
                                        <th className="px-4 py-2 text-right font-semibold">Carbs (g)</th>
                                        <th className="px-4 py-2 text-right font-semibold">Fat (g)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {parsedRecords.slice(0, 10).map((record, idx) => (
                                        <tr key={idx} className="hover:bg-slate-700/30">
                                            <td className="px-4 py-2">{record.dish_name}</td>
                                            <td className="px-4 py-2 text-right">{record.calories_kcal.toFixed(2)}</td>
                                            <td className="px-4 py-2 text-right">{record.protein_g.toFixed(2)}</td>
                                            <td className="px-4 py-2 text-right">{record.carbohydrates_g.toFixed(2)}</td>
                                            <td className="px-4 py-2 text-right">{record.fats_g.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {parsedRecords.length > 10 && (
                            <div className="text-sm text-slate-400 mb-4">
                                ... and {parsedRecords.length - 10} more items
                            </div>
                        )}

                        <div className="flex space-x-3">
                            <button
                                onClick={uploadParsedRecords}
                                disabled={uploading}
                                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 rounded-lg font-semibold transition-colors"
                            >
                                {uploading ? '⏳ Uploading...' : '✓ Upload All Items'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowPreview(false);
                                    setParsedRecords([]);
                                }}
                                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Search Section */}
                <div className="mb-8 bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-2xl font-bold mb-4 flex items-center space-x-2">
                        <span>🔍</span>
                        <span>Search & Manage Foods</span>
                    </h2>

                    <div className="flex gap-4 mb-4">
                        <input
                            type="text"
                            placeholder="Search by dish name..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-primary text-white placeholder-slate-400"
                        />
                        <button
                            onClick={deleteAllFoods}
                            className="px-6 py-2 bg-red-600/20 border border-red-600/50 hover:bg-red-600/30 rounded-lg font-semibold transition-colors text-red-300"
                        >
                            🗑️ Clear All
                        </button>
                    </div>
                </div>

                {/* Foods Table */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-2xl font-bold mb-4 flex items-center space-x-2">
                        <span>🥗</span>
                        <span>Food Items ({totalItems})</span>
                    </h2>

                    {loading ? (
                        <div className="text-center py-8 text-slate-400">Loading foods...</div>
                    ) : foods.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            {searchTerm ? 'No foods found matching your search' : 'No food items yet. Upload some using the form above.'}
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto mb-6">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-700/50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-semibold">Dish Name</th>
                                            <th className="px-4 py-2 text-right font-semibold">Calories</th>
                                            <th className="px-4 py-2 text-right font-semibold">Protein (g)</th>
                                            <th className="px-4 py-2 text-right font-semibold">Carbs (g)</th>
                                            <th className="px-4 py-2 text-right font-semibold">Fat (g)</th>
                                            <th className="px-4 py-2 text-center font-semibold">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50">
                                        {foods.map((food) => (
                                            <tr key={food.id} className="hover:bg-slate-700/30 transition-colors">
                                                <td className="px-4 py-3">{food.dish_name}</td>
                                                <td className="px-4 py-3 text-right">{food.calories_kcal.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right">{food.protein_g.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right">{food.carbohydrates_g.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right">{food.fats_g.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {deleteConfirm === food.id ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => deleteFood(food.id)}
                                                                className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded transition-colors"
                                                            >
                                                                Confirm
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteConfirm(null)}
                                                                className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => startEdit(food)}
                                                                className="px-2 py-1 text-xs bg-blue-600/20 border border-blue-600/50 hover:bg-blue-600/30 rounded transition-colors text-blue-300"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteConfirm(food.id)}
                                                                className="px-2 py-1 text-xs bg-red-600/20 border border-red-600/50 hover:bg-red-600/30 rounded transition-colors text-red-300"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Edit Modal */}
                            {showEditModal && editingFood && (
                                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                    <div className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto border border-slate-700">
                                        <div className="p-6">
                                            <h2 className="text-xl font-bold text-white mb-4">Edit Food Item</h2>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Dish Name *</label>
                                                    <input
                                                        type="text"
                                                        value={editingFood.dish_name}
                                                        onChange={(e) => setEditingFood({ ...editingFood, dish_name: e.target.value })}
                                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                                                        placeholder="Dish name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Calories (kcal) *</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editingFood.calories_kcal}
                                                        onChange={(e) => setEditingFood({ ...editingFood, calories_kcal: parseFloat(e.target.value) || 0 })}
                                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Protein (g) *</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editingFood.protein_g}
                                                        onChange={(e) => setEditingFood({ ...editingFood, protein_g: parseFloat(e.target.value) || 0 })}
                                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Carbohydrates (g) *</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editingFood.carbohydrates_g}
                                                        onChange={(e) => setEditingFood({ ...editingFood, carbohydrates_g: parseFloat(e.target.value) || 0 })}
                                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Fat (g) *</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editingFood.fats_g}
                                                        onChange={(e) => setEditingFood({ ...editingFood, fats_g: parseFloat(e.target.value) || 0 })}
                                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Fibre (g)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editingFood.fibre_g || 0}
                                                        onChange={(e) => setEditingFood({ ...editingFood, fibre_g: parseFloat(e.target.value) || 0 })}
                                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Sodium (mg)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editingFood.sodium_mg || 0}
                                                        onChange={(e) => setEditingFood({ ...editingFood, sodium_mg: parseFloat(e.target.value) || 0 })}
                                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Calcium (mg)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editingFood.calcium_mg || 0}
                                                        onChange={(e) => setEditingFood({ ...editingFood, calcium_mg: parseFloat(e.target.value) || 0 })}
                                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Iron (mg)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editingFood.iron_mg || 0}
                                                        onChange={(e) => setEditingFood({ ...editingFood, iron_mg: parseFloat(e.target.value) || 0 })}
                                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-3 justify-end">
                                                <button
                                                    onClick={() => setShowEditModal(false)}
                                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={updateFood}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                                >
                                                    Save Changes
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-slate-400">
                                        Page {currentPage} of {totalPages} ({totalItems} items)
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg transition-colors"
                                        >
                                            ← Previous
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg transition-colors"
                                        >
                                            Next →
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
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

export default AdminIndianFoods;
