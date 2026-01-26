
import React, { useState, useRef, useEffect } from 'react';
import StatusBar from '../components/StatusBar';

const OnboardingWeight: React.FC<{ onNext: (data: { weight: number, target_weight: number }) => void; onBack: () => void }> = ({ onNext, onBack }) => {
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [weight, setWeight] = useState(75);
  const [targetWeight, setTargetWeight] = useState(70);
  const [activeTab, setActiveTab] = useState<'current' | 'target'>('current');
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  const kgRange = Array.from({ length: 166 }, (_, i) => 25 + i);
  const lbsRange = Array.from({ length: 366 }, (_, i) => 55 + i);

  const itemWidth = 80;

  useEffect(() => {
    if (!scrollRef.current) return;

    let index = 0;
    const currentVal = activeTab === 'current' ? weight : targetWeight;

    if (unit === 'kg') {
      index = kgRange.indexOf(currentVal);
    } else {
      const valInLbs = Math.round(currentVal * 2.20462);
      index = lbsRange.indexOf(valInLbs);
    }

    if (index !== -1) {
      isScrollingRef.current = true;
      scrollRef.current.scrollLeft = index * itemWidth;
      setTimeout(() => { isScrollingRef.current = false; }, 50);
    }
  }, [unit, activeTab]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isScrollingRef.current) return;

    const scrollLeft = e.currentTarget.scrollLeft;
    const index = Math.round(scrollLeft / itemWidth);

    if (unit === 'kg') {
      const w = kgRange[index];
      if (w !== undefined) {
        if (activeTab === 'current') {
          if (w !== weight) setWeight(w);
        } else {
          if (w !== targetWeight) setTargetWeight(w);
        }
      }
    } else {
      const l = lbsRange[index];
      if (l !== undefined) {
        const val = Math.round(l / 2.20462);
        if (activeTab === 'current') {
          if (val !== weight) setWeight(val);
        } else {
          if (val !== targetWeight) setTargetWeight(val);
        }
      }
    }
  };

  const displayWeight = (val: number) => {
    if (unit === 'kg') return val;
    return Math.round(val * 2.20462);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 p-6 flex flex-col">
      <StatusBar light />
      <div className="flex items-center mb-8">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mr-4 active:scale-90 transition-transform"
        >
          <span className="material-symbols-rounded text-2xl text-slate-900">arrow_back</span>
        </button>
        <div className="flex-1 flex gap-1.5">
          <div className="flex-1 h-1.5 rounded-full bg-primary"></div>
          <div className="flex-1 h-1.5 rounded-full bg-primary"></div>
          <div className="flex-1 h-1.5 rounded-full bg-primary"></div>
          <div className="flex-1 h-1.5 rounded-full bg-primary"></div>
        </div>
      </div>

      <div className="text-center mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Weight Goals</h1>
        <p className="text-slate-500">This helps us personalize your training and nutrition plans.</p>
      </div>

      <div className="flex justify-center mb-6">
        <div className="bg-slate-100 p-1 rounded-xl flex">
          <button
            onClick={() => setUnit('kg')}
            className={`px-8 py-2 rounded-lg text-sm font-bold transition-all ${unit === 'kg' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
          >
            kg
          </button>
          <button
            onClick={() => setUnit('lbs')}
            className={`px-8 py-2 rounded-lg text-sm font-bold transition-all ${unit === 'lbs' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
          >
            lbs
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setActiveTab('current')}
            className={`p-4 rounded-2xl border-2 transition-all ${activeTab === 'current' ? 'border-primary bg-primary/5' : 'border-slate-100 bg-slate-50'}`}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Current</p>
            <p className="text-2xl font-black text-slate-900">{displayWeight(weight)}<span className="text-sm ml-0.5">{unit}</span></p>
          </button>
          <button
            onClick={() => setActiveTab('target')}
            className={`p-4 rounded-2xl border-2 transition-all ${activeTab === 'target' ? 'border-primary bg-primary/5' : 'border-slate-100 bg-slate-50'}`}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Target</p>
            <p className="text-2xl font-black text-slate-900">{displayWeight(targetWeight)}<span className="text-sm ml-0.5">{unit}</span></p>
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-4">
          <div className="relative w-full max-w-[400px] h-full flex flex-col items-center justify-center">
            {/* Silhouette background */}
            <div className="absolute inset-0 flex flex-col items-center justify-end pointer-events-none z-0 pb-10 transform translate-y-60">
              <div className="relative transform scale-[0.75]">
                <svg className="w-56 h-auto text-slate-50" fill="currentColor" viewBox="0 0 200 500">
                  <path d="M100 20C80 20 65 35 65 55C65 75 80 90 100 90C120 90 135 75 135 55C135 35 120 20 100 20ZM100 100C65 100 35 120 30 155L20 300C18 325 38 340 60 335L75 330V480C75 491 85 500 100 500C115 500 125 491 125 480V330L140 335C162 340 182 325 180 300L170 155C165 120 135 100 100 100Z"></path>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pb-12">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-primary">{activeTab === 'current' ? displayWeight(weight) : displayWeight(targetWeight)}</span>
                    <span className="text-xl font-bold text-primary opacity-80">{unit}</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 mt-2">{activeTab} weight</span>
                </div>
              </div>
            </div>

            {/* Scale Foreground */}
            <div className="mt-auto relative w-full h-32 overflow-hidden z-50 transform translate-y-40">
              <div className=" mt-10 absolute left-1/2 -translate-x-1/2 top-0 w-1 h-6 bg-primary z-50 rounded-full shadow-lg shadow-primary/40"></div>
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="w-full h-full overflow-x-scroll no-scrollbar snap-x snap-mandatory flex items-end pb-8 px-[45%] scroll-smooth"
              >
                {unit === 'kg' ? (
                  kgRange.map(w => {
                    const isSelected = activeTab === 'current' ? w === weight : w === targetWeight;
                    return (
                      <div key={w} className="flex flex-col items-center gap-4 snap-center min-w-[80px] cursor-pointer" onClick={() => {
                        if (activeTab === 'current') setWeight(w); else setTargetWeight(w);
                        const index = kgRange.indexOf(w);
                        if (scrollRef.current) scrollRef.current.scrollLeft = index * itemWidth;
                      }}>
                        <span className={`font-bold transition-all duration-200 ${isSelected ? 'text-primary text-xl' : 'text-slate-300 text-sm'}`}>{w}</span>
                        <div className={`w-1 rounded-full transition-all duration-200 ${isSelected ? 'h-10 w-1 bg-primary' : 'h-10 bg-slate-200'}`}></div>
                      </div>
                    );
                  })
                ) : (
                  lbsRange.map(l => {
                    const currentValInLbs = displayWeight(activeTab === 'current' ? weight : targetWeight);
                    const isSelected = l === currentValInLbs;
                    return (
                      <div key={l} className="flex flex-col items-center gap-6 snap-center min-w-[80px] cursor-pointer" onClick={() => {
                        const val = Math.round(l / 2.20462);
                        if (activeTab === 'current') setWeight(val); else setTargetWeight(val);
                        const index = lbsRange.indexOf(l);
                        if (scrollRef.current) scrollRef.current.scrollLeft = index * itemWidth;
                      }}>
                        <span className={`font-bold transition-all duration-200 ${isSelected ? 'text-primary text-xl' : 'text-slate-300 text-sm'}`}>{l}</span>
                        <div className={`w-1 rounded-full transition-all duration-200 ${isSelected ? 'h-10 w-1.5 bg-primary' : 'h-10 bg-slate-200'}`}></div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => onNext({ weight, target_weight: targetWeight })}
        className="w-full bg-primary hover:bg-green-600 text-white font-bold py-5 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 group mt-8"
      >
        <span>Continue</span>
        <span className="material-symbols-rounded">arrow_forward</span>
      </button>
      <div className="mt-4 mx-auto w-32 h-1.5 bg-slate-300 rounded-full"></div>
    </div>
  );
};

export default OnboardingWeight;
