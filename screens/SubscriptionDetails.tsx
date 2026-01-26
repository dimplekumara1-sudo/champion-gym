
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen, Plan, Profile } from '../types';
import StatusBar from '../components/StatusBar';
import { planService } from '../lib/planService';

const SubscriptionDetails: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgradeSelection, setUpgradeSelection] = useState<any>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
    fetchPlans();

    // Set up real-time subscription for profile updates
    const setupSubscription = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const subscription = supabase
          .channel(`subscription_${authUser.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${authUser.id}`
            },
            () => {
              // Refetch when profile changes
              fetchSubscriptionData();
            }
          )
          .subscribe();

        return subscription;
      }
    };

    let subscription: any;
    setupSubscription().then((sub) => {
      subscription = sub;
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const fetchPlans = async () => {
    const { data } = await supabase.from('plans').select('*').order('price', { ascending: true });
    if (data) setPlans(data);
  };

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);
      console.log('Profile data fetched:', profileData);

      if (profileData?.plan) {
        const { data: planData } = await supabase
          .from('plans')
          .select('*')
          .eq('id', profileData.plan)
          .single();
        setCurrentPlan(planData);
      }

      // Fetch payment history
      const { data: historyData } = await supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', user.id)
        .order('payment_date', { ascending: false });

      if (historyData) {
        setPaymentHistory(historyData);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeSelect = (newPlan: Plan) => {
    if (!profile || !currentPlan) return;

    // Block upgrade if there's a pending due amount
    if (profile.due_amount > 0) {
      alert(`Please clear your existing due of ₹${profile.due_amount} before upgrading.`);
      setIsUpgradeModalOpen(false);
      return;
    }

    // Check if it's a downgrade
    const currentPrice = parseFloat(currentPlan.price.toString().replace(/[^0-9.]/g, ''));
    const newPrice = parseFloat(newPlan.price.toString().replace(/[^0-9.]/g, ''));

    const isExpired = profile.plan_expiry_date && new Date(profile.plan_expiry_date) <= new Date();

    if (!isExpired && newPrice < currentPrice) {
      alert('Downgrades are not allowed while a plan is active.');
      return;
    }

    const calculation = planService.calculateUpgrade(profile, currentPlan, newPlan);
    setUpgradeSelection({ plan: newPlan, ...calculation });
    setIsUpgradeModalOpen(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!upgradeSelection || !profile) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updateData = {
        plan: upgradeSelection.plan.id,
        plan_start_date: upgradeSelection.new_plan_start_date,
        plan_expiry_date: upgradeSelection.new_plan_end_date,
        payment_status: upgradeSelection.payable_amount > 0 ? 'pending' : 'paid',
        paid_amount: 0, // Reset paid amount for new plan
        due_amount: upgradeSelection.payable_amount,
        plan_status: 'active',
        approval_status: 'approved'
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      // Record in payment history
      await supabase.from('payment_history').insert({
        user_id: user.id,
        amount: 0,
        plan_id: upgradeSelection.plan.id,
        payment_method: 'system',
        notes: `Plan upgraded to ${upgradeSelection.plan.name} (Prorated)`
      });

      // Navigate to application status or success
      alert('Upgrade request submitted! Please pay the due amount if any.');
      setIsUpgradeModalOpen(false);
      fetchSubscriptionData();
    } catch (error) {
      console.error('Error upgrading plan:', error);
      alert('Failed to upgrade plan');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-10">
      <StatusBar />
      <header className="px-5 pt-6 pb-4 flex items-center gap-4">
        <button onClick={() => onNavigate('PROFILE')} className="p-2 bg-slate-900/60 rounded-full">
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">Subscription</h1>
      </header>

      <main className="px-5 space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Current Plan Card */}
            <section className="bg-slate-900/40 border border-slate-800/50 rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full"></div>

              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1 block">Current Plan</span>
                  <h2 className="text-3xl font-black">{currentPlan?.name || 'Free Plan'}</h2>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${profile?.payment_status === 'paid' ? 'bg-primary/20 text-primary' : 'bg-orange-500/20 text-orange-500'
                  }`}>
                  {profile?.payment_status || 'Basic'}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-bold">Start Date</span>
                  <span className="text-white font-bold">{formatDate(profile?.plan_start_date || null)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-bold">Expiry Date</span>
                  <span className="text-white font-bold">{formatDate(profile?.plan_expiry_date || null)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-bold">Price</span>
                  <span className="text-primary font-black">{currentPlan?.price || '₹0'}</span>
                </div>
                {profile?.due_amount ? (
                  <div className="flex justify-between text-sm bg-orange-500/10 p-2 rounded-lg border border-orange-500/20">
                    <span className="text-orange-400 font-bold">Due Amount</span>
                    <span className="text-orange-400 font-black">₹{profile.due_amount}</span>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-8">
                <button
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="bg-primary text-slate-950 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
                >
                  Upgrade Plan
                </button>
                <button
                  onClick={() => handleUpgradeSelect(currentPlan!)}
                  className="bg-slate-800 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-slate-700"
                >
                  Renew Plan
                </button>
              </div>
            </section>

            {/* Plan Selection / Upgrade Options */}
            {isUpgradeModalOpen && (
              <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex flex-col p-6 overflow-y-auto">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black">Choose a Plan</h2>
                  <button onClick={() => setIsUpgradeModalOpen(false)} className="p-2 bg-slate-900 rounded-full">
                    <span className="material-symbols-rounded">close</span>
                  </button>
                </div>

                <div className="space-y-4 pb-10">
                  {plans.map(plan => (
                    <div
                      key={plan.id}
                      onClick={() => handleUpgradeSelect(plan)}
                      className={`p-5 rounded-3xl border-2 transition-all ${currentPlan?.id === plan.id ? 'border-primary bg-primary/5' : 'border-slate-800 bg-slate-900/50'
                        }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">{plan.name}</h3>
                        <span className="text-primary font-black">{plan.price}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-4">{plan.description}</p>
                      {currentPlan?.id === plan.id && (
                        <span className="text-[10px] bg-primary text-slate-950 px-2 py-0.5 rounded font-black uppercase tracking-tighter">Current Plan</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upgrade Confirmation Modal */}
            {upgradeSelection && (
              <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[110] flex items-center justify-center p-6">
                <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl">
                  <h3 className="text-xl font-black mb-6 text-center">Confirm Upgrade</h3>

                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-bold">New Plan</span>
                      <span className="text-white font-black">{upgradeSelection.plan.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-bold">Plan Price</span>
                      <span className="text-white font-black">{upgradeSelection.plan.price}</span>
                    </div>
                    {upgradeSelection.unused_value > 0 && (
                      <div className="flex justify-between text-sm text-green-400">
                        <span className="font-bold">Prorated Credit</span>
                        <span className="font-black">- ₹{upgradeSelection.unused_value}</span>
                      </div>
                    )}
                    <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                      <span className="text-white font-black">Total Payable</span>
                      <span className="text-primary text-2xl font-black">₹{upgradeSelection.payable_amount}</span>
                    </div>
                  </div>

                  {upgradeSelection.unused_value > 0 && (
                    <p className="text-[10px] text-slate-500 text-center mb-8 font-medium italic">
                      "₹{upgradeSelection.unused_value} from your current plan has been adjusted. Pay ₹{upgradeSelection.payable_amount} to activate your new plan."
                    </p>
                  )}

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleConfirmUpgrade}
                      className="w-full bg-primary text-slate-950 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
                    >
                      Confirm & Pay
                    </button>
                    <button
                      onClick={() => setUpgradeSelection(null)}
                      className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Past History */}
            <section>
              <h3 className="text-lg font-bold mb-4 ml-2">Payment History</h3>
              <div className="space-y-3">
                {paymentHistory.length > 0 ? (
                  paymentHistory.map((item) => (
                    <div key={item.id} className="bg-slate-900/40 border border-slate-800/50 rounded-3xl p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center">
                          <span className="material-symbols-rounded text-primary">history</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">{item.notes || 'Plan Payment'}</h4>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{formatDate(item.payment_date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-white">₹{item.amount}</p>
                        <p className="text-[9px] text-primary font-bold uppercase">{item.status}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center">
                    <p className="text-slate-600 text-xs font-bold">No payment records found.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default SubscriptionDetails;
