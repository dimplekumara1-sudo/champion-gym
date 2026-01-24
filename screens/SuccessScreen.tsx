
import React from 'react';
import StatusBar from '../components/StatusBar';

const SuccessScreen: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#122118] to-background-dark flex flex-col">
      <StatusBar />
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full"></div>
          <div className="relative flex items-center justify-center">
            <div className="absolute w-48 h-48 border border-primary/30 rounded-full animate-pulse"></div>
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-primary text-slate-900">
              <span className="material-symbols-rounded text-[64px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-white tracking-tight text-[40px] font-bold leading-tight pb-2">Success!</h1>
          <p className="text-white/70 text-lg font-normal leading-relaxed max-w-[280px] mx-auto">
            Your fitness journey continues...
          </p>
        </div>
      </div>
      <div className="p-6 pb-12">
        <button 
          onClick={onNext}
          className="w-full bg-primary text-slate-900 font-bold h-16 rounded-full text-lg shadow-lg shadow-primary/20 transition-transform active:scale-95"
        >
          Continue to Dashboard
        </button>
      </div>
      <div className="flex justify-center pb-2">
        <div className="h-1.5 w-32 bg-white/20 rounded-full"></div>
      </div>
    </div>
  );
};

export default SuccessScreen;
