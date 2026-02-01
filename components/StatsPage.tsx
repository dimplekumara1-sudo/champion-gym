import React, { useState } from 'react';

interface StatsPageProps {
  onBack: () => void;
}

// Simple stats page component
const StatsPage: React.FC<StatsPageProps> = ({ onBack }) => {
  return (
    <div className="pb-32 bg-[#090E1A] min-h-screen relative">
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-40 w-12 h-12 bg-slate-800/80 backdrop-blur-sm border border border-slate-700/50 rounded-full flex items-center justify-center hover:bg-slate-700/90 transition-colors"
      >
        <span className="material-symbols-rounded text-lg">arrow_back</span>
        <span className="text-sm font-medium text-slate-300">Back</span>
      </button>
      </div>
      
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Statistics</h1>
        </div>
        
        <div className="bg-[#151C2C] rounded-3xl p-8 shadow-xl border border-slate-700/50">
          <div className="text-center text-white">
            <h2 className="text-3xl font-bold">Your Fitness Stats</h2>
            <p className="text-sm text-slate-300 mb-4">Track your progress over time</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;