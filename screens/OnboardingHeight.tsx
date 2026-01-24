
import React, { useState } from 'react';
import StatusBar from '../components/StatusBar';

const OnboardingHeight: React.FC<{ onNext: (height: number) => void }> = ({ onNext }) => {
  const [unit, setUnit] = useState<'cm' | 'ft'>('cm');
  const [height, setHeight] = useState(170);

  const cmRange = Array.from({ length: 131 }, (_, i) => 220 - i);
  const ftRange = Array.from({ length: 49 }, (_, i) => {
    const totalInches = 84 - i; // 7ft = 84 inches
    return {
      ft: Math.floor(totalInches / 12),
      in: totalInches % 12,
      totalInches
    };
  });

  const displayHeight = () => {
    if (unit === 'cm') return height;
    const totalInches = Math.round(height / 2.54);
    const ft = Math.floor(totalInches / 12);
    const inch = totalInches % 12;
    return `${ft}'${inch}"`;
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 p-6 flex flex-col">
      <StatusBar light />
      <div className="flex items-center gap-1.5 mb-8">
        <div className="w-8 h-1.5 rounded-full bg-primary"></div>
        <div className="w-8 h-1.5 rounded-full bg-primary"></div>
        <div className="w-8 h-1.5 rounded-full bg-primary"></div>
        <div className="w-8 h-1.5 rounded-full bg-slate-200"></div>
      </div>

      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">What's your height?</h1>
        <p className="text-slate-500">This helps us calculate your BMI and daily caloric needs accurately.</p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="bg-slate-100 p-1 rounded-xl flex">
          <button 
            onClick={() => setUnit('cm')}
            className={`px-8 py-2 rounded-lg text-sm font-bold transition-all ${unit === 'cm' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
          >
            cm
          </button>
          <button 
            onClick={() => setUnit('ft')}
            className={`px-8 py-2 rounded-lg text-sm font-bold transition-all ${unit === 'ft' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
          >
            ft
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-between px-4 relative overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-end h-full pb-4">
          <div className="relative">
            <svg className="w-48 h-auto text-slate-200" fill="currentColor" viewBox="0 0 200 500">
              <path d="M100 20C80 20 65 35 65 55C65 75 80 90 100 90C120 90 135 75 135 55C135 35 120 20 100 20ZM100 100C70 100 45 120 40 150L30 300C28 320 45 335 65 330L80 325V480C80 490 90 500 100 500C110 500 120 490 120 480V325L135 330C155 335 172 320 170 300L160 150C155 120 130 100 100 100Z"></path>
            </svg>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
              <span className="text-5xl font-black text-primary">{displayHeight()}</span>
              <span className="text-sm font-bold uppercase tracking-widest text-slate-400">{unit === 'cm' ? 'Centimeters' : 'Feet & Inches'}</span>
            </div>
          </div>
        </div>

        <div className="w-24 h-full relative flex items-center">
          <div className="h-[400px] w-full overflow-y-scroll no-scrollbar py-[180px] snap-y snap-mandatory scroll-smooth">
            <div className="flex flex-col items-end pr-6">
              {unit === 'cm' ? (
                cmRange.map(h => (
                  <div key={h} className="h-12 flex items-center justify-end gap-3 snap-center cursor-pointer" onClick={() => setHeight(h)}>
                    <span className={`font-medium transition-all ${h === height ? 'text-primary text-2xl font-bold' : 'text-slate-300 text-sm'}`}>{h}</span>
                    <div className={`h-0.5 rounded-full bg-slate-300 transition-all ${h === height ? 'w-12 bg-primary h-1' : 'w-8'}`}></div>
                  </div>
                ))
              ) : (
                ftRange.map(f => {
                  const currentTotalInches = Math.round(height / 2.54);
                  const isSelected = f.totalInches === currentTotalInches;
                  return (
                    <div key={`${f.ft}-${f.in}`} className="h-12 flex items-center justify-end gap-3 snap-center cursor-pointer" onClick={() => setHeight(Math.round(f.totalInches * 2.54))}>
                      <span className={`font-medium transition-all ${isSelected ? 'text-primary text-2xl font-bold' : 'text-slate-300 text-sm'}`}>{f.ft}'{f.in}"</span>
                      <div className={`h-0.5 rounded-full bg-slate-300 transition-all ${isSelected ? 'w-12 bg-primary h-1' : 'w-8'}`}></div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <button 
          onClick={() => onNext(height)}
          className="w-full bg-primary hover:bg-green-600 text-white font-bold py-5 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 group"
        >
          <span>Continue</span>
          <span className="material-symbols-rounded">arrow_forward</span>
        </button>
      </div>
      <div className="mt-4 mx-auto w-32 h-1.5 bg-slate-300 rounded-full"></div>
    </div>
  );
};

export default OnboardingHeight;
