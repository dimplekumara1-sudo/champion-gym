
import React, { useState } from 'react';
import StatusBar from '../components/StatusBar';

import { supabase } from '../lib/supabase';

const plans = [
  { id: 'basic', name: 'Basic', price: '$0', desc: 'Get started today', features: ['Basic activity tracking', '3 preset workouts/week', 'Community board access'] },
  { id: 'pro', name: 'Pro', price: '$14.99', desc: 'Level up your fitness', popular: true, features: ['Unlimited custom workouts', 'Personalized AI training plans', 'Offline mode & GPS maps', 'Ad-free experience'] },
  { id: 'elite', name: 'Elite', price: '$29.99', desc: 'Total health transformation', features: ['1-on-1 performance coaching', 'Nutritionist video consultation', 'All wearable device integrations'] },
];

interface OnboardingPlanProps {
  onNext: () => void;
  onboardingData: {
    goal: string;
    gender: string;
    height: number;
    weight: number;
    target_weight: number;
  };
}

const OnboardingPlan: React.FC<OnboardingPlanProps> = ({ onNext, onboardingData }) => {
  const [selected, setSelected] = useState('pro');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) throw new Error('No session found');

      const { error } = await supabase
        .from('profiles')
        .update({
          ...onboardingData,
          plan: selected,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (error) throw error;
      onNext();
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      alert('Failed to save your preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <StatusBar />
      <main className="flex-1 px-4 pt-12 pb-32">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Choose Your Plan</h1>
          <p className="text-slate-400">Unlock your full potential with a fitness plan designed for your goals.</p>
        </header>

        <div className="flex justify-center mb-8">
          <div className="bg-slate-800 p-1 rounded-full flex gap-1">
            <button className="px-6 py-2 rounded-full bg-slate-700 text-white text-sm font-bold">Monthly</button>
            <button className="px-6 py-2 rounded-full text-slate-400 text-sm font-bold">Yearly <span className="text-primary">-20%</span></button>
          </div>
        </div>

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
                  <p className="text-slate-500 text-xs">{plan.desc}</p>
                </div>
                <div className="flex items-baseline gap-1 text-primary">
                  <span className="text-3xl font-black">{plan.price}</span>
                  <span className="text-sm font-bold">/mo</span>
                </div>
              </div>
              <div className="space-y-3">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex gap-3 text-sm text-slate-300">
                    <span className="material-symbols-rounded text-primary text-[18px]">check</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 px-4 pt-4 pb-8 z-50">
        <button 
          onClick={handleComplete}
          disabled={loading}
          className="w-full bg-primary text-slate-900 font-bold py-4 rounded-full text-lg shadow-lg shadow-primary/20 transition-transform active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Select Plan'}
        </button>
        <p className="text-center text-[10px] text-slate-500 mt-3 px-4 leading-tight">
          By selecting a plan, you agree to our Terms of Service. Payment will be charged to your iTunes account.
        </p>
      </div>
    </div>
  );
};

export default OnboardingPlan;
