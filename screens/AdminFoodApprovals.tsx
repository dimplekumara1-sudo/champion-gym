import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';

interface FoodSubmission {
    id: number;
    user_id: string;
    dish_name: string;
    calories_kcal: number;
    carbohydrates_g: number;
    protein_g: number;
    fats_g: number;
    free_sugar_g?: number;
    fibre_g?: number;
    sodium_mg?: number;
    calcium_mg?: number;
    iron_mg?: number;
    vitamin_c_mg?: number;
    folate_mcg?: number;
    submission_notes?: string;
    status: 'pending' | 'approved' | 'rejected';
    admin_notes?: string;
    created_at: string;
    updated_at: string;
}

const AdminFoodApprovals: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
    const [submissions, setSubmissions] = useState<FoodSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'pending' | 'all'>('pending');
    const [selectedSubmission, setSelectedSubmission] = useState<FoodSubmission | null>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchSubmissions();
    }, [filter]);

    const fetchSubmissions = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('pending_food_submissions')
                .select('*')
                .order('created_at', { ascending: false });

            if (filter === 'pending') {
                query = query.eq('status', 'pending');
            }

            const { data, error } = await query;
            if (error) throw error;

            setSubmissions(data || []);
        } catch (error) {
            console.error('Error fetching submissions:', error);
            setMessage('error:Failed to load submissions');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedSubmission) return;

        try {
            setProcessing(true);

            const { data: { user } } = await supabase.auth.getUser();

            // Add to approved foods in indian_foods table
            const { error: insertError } = await supabase
                .from('indian_foods')
                .insert([{
                    dish_name: selectedSubmission.dish_name,
                    calories_kcal: selectedSubmission.calories_kcal,
                    carbohydrates_g: selectedSubmission.carbohydrates_g,
                    protein_g: selectedSubmission.protein_g,
                    fats_g: selectedSubmission.fats_g,
                    free_sugar_g: selectedSubmission.free_sugar_g || null,
                    fibre_g: selectedSubmission.fibre_g || null,
                    sodium_mg: selectedSubmission.sodium_mg || null,
                    calcium_mg: selectedSubmission.calcium_mg || null,
                    iron_mg: selectedSubmission.iron_mg || null,
                    vitamin_c_mg: selectedSubmission.vitamin_c_mg || null,
                    folate_mcg: selectedSubmission.folate_mcg || null,
                }]);

            if (insertError) throw insertError;

            // Update submission status to approved
            const { error: updateError } = await supabase
                .from('pending_food_submissions')
                .update({
                    status: 'approved',
                    reviewed_by: user?.id,
                    reviewed_at: new Date().toISOString(),
                    admin_notes: adminNotes || null,
                })
                .eq('id', selectedSubmission.id);

            if (updateError) throw updateError;

            setMessage('success:✓ Food approved and added to database!');
            setSelectedSubmission(null);
            setAdminNotes('');
            await fetchSubmissions();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error approving submission:', error);
            setMessage(`error:Failed to approve - ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedSubmission) return;

        try {
            setProcessing(true);

            const { data: { user } } = await supabase.auth.getUser();

            // Update submission status to rejected
            const { error } = await supabase
                .from('pending_food_submissions')
                .update({
                    status: 'rejected',
                    reviewed_by: user?.id,
                    reviewed_at: new Date().toISOString(),
                    admin_notes: adminNotes || null,
                })
                .eq('id', selectedSubmission.id);

            if (error) throw error;

            setMessage('✓ Food submission rejected');
            setSelectedSubmission(null);
            setAdminNotes('');
            await fetchSubmissions();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error rejecting submission:', error);
            setMessage(`error:Failed to reject - ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setProcessing(false);
        }
    };

    const pendingCount = submissions.filter(s => s.status === 'pending').length;

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-20">
            <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="material-symbols-rounded hover:text-primary">
                        arrow_back
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">Food Approvals</h1>
                        <p className="text-xs text-slate-400">{pendingCount} pending submissions</p>
                    </div>
                </div>
            </header>

            <div className="px-6 py-4">
                {/* Filter Tabs */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'pending'
                            ? 'bg-primary text-slate-900'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                    >
                        Pending ({pendingCount})
                    </button>
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all'
                            ? 'bg-primary text-slate-900'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                    >
                        All
                    </button>
                </div>

                {message && (
                    <div className={`p-3 rounded-lg text-sm mb-4 ${message.startsWith('error')
                        ? 'bg-red-500/10 border border-red-500/50 text-red-400'
                        : 'bg-green-500/10 border border-green-500/50 text-green-400'
                        }`}>
                        {message.replace(/^error:/, '')}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : submissions.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <p>No submissions to review</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {submissions.map(submission => (
                            <button
                                key={submission.id}
                                onClick={() => {
                                    setSelectedSubmission(submission);
                                    setAdminNotes('');
                                }}
                                className="w-full text-left bg-slate-800/50 p-4 rounded-xl border border-slate-700 hover:border-primary transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-white mb-1">{submission.dish_name}</h3>
                                        <div className="flex gap-3 text-xs text-slate-400 mb-2">
                                            <span>{submission.calories_kcal} kcal</span>
                                            <span>P: {submission.protein_g}g</span>
                                            <span>C: {submission.carbohydrates_g}g</span>
                                            <span>F: {submission.fats_g}g</span>
                                        </div>
                                        {submission.submission_notes && (
                                            <p className="text-sm text-slate-300 mb-1">{submission.submission_notes}</p>
                                        )}
                                        <p className="text-[10px] text-slate-500">
                                            Submitted: {new Date(submission.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${submission.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                        submission.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                            'bg-red-500/20 text-red-400'
                                        }`}>
                                        {submission.status.toUpperCase()}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedSubmission && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="bg-slate-800 w-full max-w-sm rounded-3xl p-6 border border-slate-700 overflow-y-auto max-h-[90vh]">
                        <h2 className="text-2xl font-bold mb-4">{selectedSubmission.dish_name}</h2>

                        {/* Nutrition Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-slate-700/50 p-3 rounded-lg">
                                <p className="text-xs text-slate-400 mb-1">Calories</p>
                                <p className="text-xl font-bold text-white">{selectedSubmission.calories_kcal}</p>
                            </div>
                            <div className="bg-slate-700/50 p-3 rounded-lg">
                                <p className="text-xs text-slate-400 mb-1">Protein</p>
                                <p className="text-xl font-bold text-red-400">{selectedSubmission.protein_g}g</p>
                            </div>
                            <div className="bg-slate-700/50 p-3 rounded-lg">
                                <p className="text-xs text-slate-400 mb-1">Carbs</p>
                                <p className="text-xl font-bold text-blue-400">{selectedSubmission.carbohydrates_g}g</p>
                            </div>
                            <div className="bg-slate-700/50 p-3 rounded-lg">
                                <p className="text-xs text-slate-400 mb-1">Fat</p>
                                <p className="text-xl font-bold text-amber-400">{selectedSubmission.fats_g}g</p>
                            </div>
                        </div>

                        {selectedSubmission.submission_notes && (
                            <div className="mb-4 p-3 bg-slate-700/30 rounded-lg">
                                <p className="text-xs text-slate-400 mb-1 font-bold uppercase">Submitter Notes</p>
                                <p className="text-sm text-white">{selectedSubmission.submission_notes}</p>
                            </div>
                        )}

                        {selectedSubmission.status === 'pending' && (
                            <>
                                <div className="mb-4">
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Admin Notes (optional)</label>
                                    <textarea
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        placeholder="e.g., verified source, minor changes needed, etc."
                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm resize-none h-20"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleReject}
                                        disabled={processing}
                                        className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-600/50 py-2 rounded-lg font-bold disabled:opacity-50 transition-colors"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={handleApprove}
                                        disabled={processing}
                                        className="flex-1 bg-primary hover:bg-green-600 text-slate-900 py-2 rounded-lg font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {processing ? (
                                            <>
                                                <span className="animate-spin inline-block w-3 h-3 border-2 border-slate-900 border-t-transparent rounded-full"></span>
                                                Approving...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-rounded text-sm">check</span>
                                                Approve
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}

                        {selectedSubmission.status !== 'pending' && (
                            <div className="p-3 bg-slate-700/30 rounded-lg mb-4">
                                <p className="text-xs text-slate-400 mb-1 font-bold uppercase">Review Status</p>
                                <p className={`text-sm font-bold ${selectedSubmission.status === 'approved' ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                    {selectedSubmission.status.toUpperCase()}
                                </p>
                                {selectedSubmission.admin_notes && (
                                    <p className="text-xs text-slate-300 mt-2">{selectedSubmission.admin_notes}</p>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => setSelectedSubmission(null)}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-bold transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

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

export default AdminFoodApprovals;
