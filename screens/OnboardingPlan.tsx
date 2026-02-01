
import React, { useEffect, useState } from 'react';
import StatusBar from '../components/StatusBar';
import { supabase } from '../lib/supabase';

interface OnboardingPlanProps {
  onNext: () => void;
  onBack: () => void;
  onboardingData?: {
    goal: string;
    gender: string;
    height: number;
    weight: number;
    target_weight: number;
  };
}

const CountdownTimer: React.FC<{ expiry: string }> = ({ expiry }) => {
  const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);

  useEffect(() => {
    const calculateTime = () => {
      const difference = new Date(expiry).getTime() - new Date().getTime();
      if (difference <= 0) return null;

      return {
        d: Math.floor(difference / (1000 * 60 * 60 * 24)),
        h: Math.floor((difference / (1000 * 60 * 60)) % 24),
        m: Math.floor((difference / 1000 / 60) % 60),
        s: Math.floor((difference / 1000) % 60)
      };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTime());
    }, 1000);

    setTimeLeft(calculateTime());
    return () => clearInterval(timer);
  }, [expiry]);

  if (!timeLeft) return null;

  return (
    <div className="flex gap-2 items-center mt-2">
      <span className="material-symbols-rounded text-orange-400 text-xs">timer</span>
      <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">
        Offer ends in: {timeLeft.d}d {timeLeft.h}h {timeLeft.m}m {timeLeft.s}s
      </span>
    </div>
  );
};

const OnboardingPlan: React.FC<OnboardingPlanProps> = ({ onNext, onBack, onboardingData }) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('hidden', false)
        .order('duration_months', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
      if (data && data.length > 0) {
        const proPlan = data.find(p => p.id === 'pro') || data[0];
        setSelected(proPlan.id);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) throw new Error('No session found');

      const updateData: any = {
        plan: selected,
        approval_status: 'pending',
        plan_expiry_date: null,
        updated_at: new Date().toISOString(),
      };

      if (onboardingData) {
        Object.assign(updateData, onboardingData);
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', session.user.id);

      if (error) throw error;
      onNext();
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      alert('Failed to save your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <StatusBar />
      <main className="flex-1 px-4 pt-8 pb-32 overflow-y-auto no-scrollbar">
        <header className="mb-8">
          <div className="flex items-center mb-6">
            <button 
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mr-4 active:scale-90 transition-transform"
            >
              <span className="material-symbols-rounded text-2xl text-white">arrow_back</span>
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight">Choose Your Plan</h1>
          </div>
          <p className="text-slate-400">Unlock your full potential with a fitness plan designed for your goals.</p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {plans.map(plan => (
              <div 
                key={plan.id}
                onClick={() => setSelected(plan.id)}
                className={`relative rounded-xl border-2 p-6 transition-all cursor-pointer ${
                  selected === plan.id ? 'border-primary bg-slate-800' : 'border-slate-800 bg-slate-900'
                } ${plan.popular ? 'scale-[1.02]' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary px-4 py-1 rounded-full shadow-lg">
                    <span className="text-slate-900 text-[10px] font-black uppercase tracking-widest">Most Popular</span>
                  </div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className="text-slate-500 text-xs">{plan.description || 'Flexible plan option'}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex flex-col items-end">
                      {(() => {
                        const originalPrice = parseInt(plan.price.replace('₹', ''));
                        const isExpired = plan.discount_expiry && new Date(plan.discount_expiry).getTime() < new Date().getTime();
                        let discountedPrice = originalPrice;
                        
                        if (!isExpired) {
                          if (plan.discount_percentage > 0) {
                            discountedPrice = originalPrice * (1 - plan.discount_percentage / 100);
                          } else if (plan.discount_amount > 0) {
                            discountedPrice = originalPrice - plan.discount_amount;
                          }
                        }

                        if (discountedPrice < originalPrice) {
                          return (
                            <>
                              <span className="text-xs text-slate-500 line-through font-bold">₹{originalPrice}</span>
                              <div className="flex items-baseline gap-1 text-primary justify-end">
                                <span className="text-3xl font-black">₹{Math.round(discountedPrice)}</span>
                              </div>
                            </>
                          );
                        }
                        
                        return (
                          <div className="flex items-baseline gap-1 text-primary justify-end">
                            <span className="text-3xl font-black">{plan.price.startsWith('₹') ? plan.price : `₹${plan.price}`}</span>
                          </div>
                        );
                      })()}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      {plan.duration_months === 1 ? 'Per Month' : `Per ${plan.duration_months} Months`}
                    </span>
                  </div>
                </div>
                {plan.discount_expiry && new Date(plan.discount_expiry).getTime() > new Date().getTime() && (
                  <div className="mb-4">
                    <CountdownTimer expiry={plan.discount_expiry} />
                  </div>
                )}
                {plan.features && plan.features.length > 0 && (
                  <div className="space-y-3">
                    {plan.features.map((f: string, i: number) => (
                      <div key={i} className="flex gap-3 text-sm text-slate-300">
                        <span className="material-symbols-rounded text-primary text-[18px]">check</span>
                        {f}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 px-4 pt-4 pb-8 z-50">
        <button 
          onClick={handleComplete}
          disabled={saving || !selected}
          className="w-full bg-primary text-slate-900 font-bold py-4 rounded-full text-lg shadow-lg shadow-primary/20 transition-transform active:scale-95 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Select Plan'}
        </button>
      </div>
    </div>
  );
};

export default OnboardingPlan;
