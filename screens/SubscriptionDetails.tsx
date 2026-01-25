
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen, Plan, Profile } from '../types';
import StatusBar from '../components/StatusBar';

const SubscriptionDetails: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

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

      if (profileData?.plan_id) {
        const { data: planData } = await supabase
          .from('plans')
          .select('*')
          .eq('id', profileData.plan_id)
          .single();
        setCurrentPlan(planData);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
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
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  profile?.payment_status === 'paid' ? 'bg-primary/20 text-primary' : 'bg-orange-500/20 text-orange-500'
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
              </div>

              <button 
                onClick={() => onNavigate('ONBOARDING_PLAN')}
                className="w-full bg-primary text-slate-950 py-4 rounded-2xl font-black uppercase tracking-widest text-xs mt-8 shadow-lg shadow-primary/20"
              >
                Upgrade Plan
              </button>
            </section>

            {/* Past History */}
            <section>
              <h3 className="text-lg font-bold mb-4 ml-2">Plan History</h3>
              <div className="space-y-3">
                {/* For now we use the current plan as there's no history table yet, 
                    but we'll show a placeholder or the single entry */}
                <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center">
                      <span className="material-symbols-rounded text-primary">history</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{currentPlan?.name || 'Initial Plan'}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{formatDate(profile?.plan_start_date || null)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-white">{currentPlan?.price || '₹0'}</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase">Completed</p>
                  </div>
                </div>
                
                <div className="py-10 text-center">
                  <p className="text-slate-600 text-xs font-bold">No older subscription records found.</p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default SubscriptionDetails;
