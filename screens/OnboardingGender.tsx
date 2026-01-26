
import React, { useState } from 'react';
import StatusBar from '../components/StatusBar';

const OnboardingGender: React.FC<{ onNext: (gender: string) => void; onBack: () => void }> = ({ onNext, onBack }) => {
  const [selected, setSelected] = useState<'male' | 'female'>('female');

  return (
    <div className="min-h-screen bg-background-dark p-6 flex flex-col">
      <StatusBar />
      <header className="mb-10">
        <div className="flex items-center mb-8">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mr-4 active:scale-90 transition-transform"
          >
            <span className="material-symbols-rounded text-2xl text-white">arrow_back</span>
          </button>
          <div className="flex-1 flex gap-1.5">
            <div className="flex-1 h-1.5 rounded-full bg-primary"></div>
            <div className="flex-1 h-1.5 rounded-full bg-primary"></div>
            <div className="flex-1 h-1.5 rounded-full bg-slate-800"></div>
            <div className="flex-1 h-1.5 rounded-full bg-slate-800"></div>
          </div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-3">Which one are you?</h1>
        <p className="text-slate-400">To give you a better experience, we need to know your gender.</p>
      </header>

      <div className="flex-1 grid grid-cols-1 gap-6 mb-8">
        <button 
          onClick={() => setSelected('male')}
          className={`relative flex flex-col items-center justify-center border-2 rounded-[2rem] transition-all duration-300 ${
            selected === 'male' ? 'border-primary bg-primary/5' : 'border-slate-800 bg-slate-900/50'
          }`}
        >
          <div className={`mb-6 w-24 h-24 rounded-full flex items-center justify-center transition-colors ${
            selected === 'male' ? 'bg-primary' : 'bg-slate-800'
          }`}>
            <span className={`material-symbols-rounded text-5xl ${selected === 'male' ? 'text-white' : 'text-slate-400'}`} style={{ fontVariationSettings: "'FILL' 1" }}>male</span>
          </div>
          <span className={`text-xl font-bold ${selected === 'male' ? 'text-white' : 'text-slate-300'}`}>Male</span>
          {selected === 'male' && (
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-rounded text-white text-sm font-bold">check</span>
            </div>
          )}
        </button>

        <button 
          onClick={() => setSelected('female')}
          className={`relative flex flex-col items-center justify-center border-2 rounded-[2rem] transition-all duration-300 ${
            selected === 'female' ? 'border-primary bg-primary/5' : 'border-slate-800 bg-slate-900/50'
          }`}
        >
          <div className={`mb-6 w-24 h-24 rounded-full flex items-center justify-center transition-colors ${
            selected === 'female' ? 'bg-primary' : 'bg-slate-800'
          }`}>
            <span className={`material-symbols-rounded text-5xl ${selected === 'female' ? 'text-white' : 'text-slate-400'}`} style={{ fontVariationSettings: "'FILL' 1" }}>female</span>
          </div>
          <span className={`text-xl font-bold ${selected === 'female' ? 'text-white' : 'text-slate-300'}`}>Female</span>
          {selected === 'female' && (
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-rounded text-white text-sm font-bold">check</span>
            </div>
          )}
        </button>
      </div>

      <button 
        onClick={() => onNext(selected)}
        className="w-full bg-primary hover:bg-green-600 text-white font-bold py-5 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 group"
      >
        <span>Next Step</span>
        <span className="material-symbols-rounded group-hover:translate-x-1 transition-transform">arrow_forward</span>
      </button>
      <div className="mt-4 mx-auto w-32 h-1.5 bg-slate-800 rounded-full"></div>
    </div>
  );
};

export default OnboardingGender;
