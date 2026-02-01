import React from 'react';
import { AppScreen } from '../types';

interface BottomNavProps {
  active: 'HOME' | 'EXPLORE' | 'STATS' | 'WORKOUTS';
  onNavigate: (screen: AppScreen) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ active, onNavigate }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full max-w-[430px] mx-auto bg-[#090E1A]/80 backdrop-blur-xl border-t border-white/5 px-6 pb-8 pt-3 flex justify-between items-center z-40">
      <button 
        onClick={() => onNavigate('DASHBOARD')}
        className={`flex flex-col items-center gap-1 transition-colors ${active === 'HOME' ? 'text-primary' : 'text-slate-500'}`}
      >
        <span className="material-symbols-rounded text-[26px]" style={{ fontVariationSettings: active === 'HOME' ? "'FILL' 1" : "'FILL' 0" }}>home</span>
        <span className={`text-[10px] font-bold`}>Home</span>
      </button>

      <button 
        onClick={() => onNavigate('EXPLORE')}
        className={`flex flex-col items-center gap-1 transition-colors ${active === 'EXPLORE' ? 'text-primary' : 'text-slate-500'}`}
      >
        <span className="material-symbols-rounded text-[26px]" style={{ fontVariationSettings: active === 'EXPLORE' ? "'FILL' 1" : "'FILL' 0" }}>explore</span>
        <span className={`text-[10px] font-bold`}>Explore</span>
      </button>

      <div className="relative -top-10">
        <button 
          onClick={() => onNavigate('CREATE_WORKOUT')}
          className="bg-primary w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)] text-slate-950 border-[6px] border-[#090E1A] transition-transform active:scale-90 hover:scale-105"
        >
          <span className="material-symbols-rounded text-3xl font-black">add</span>
        </button>
      </div>

      <button 
        onClick={() => onNavigate('STATS')}
        className={`flex flex-col items-center gap-1 transition-colors ${active === 'STATS' ? 'text-primary' : 'text-slate-500'}`}
      >
        <span className="material-symbols-rounded text-[26px]" style={{ fontVariationSettings: active === 'STATS' ? "'FILL' 1" : "'FILL' 0" }}>bar_chart</span>
        <span className={`text-[10px] font-bold`}>Stats</span>
      </button>

      <button 
        onClick={() => onNavigate('WORKOUT_PROGRAM')}
        className={`flex flex-col items-center gap-1 transition-colors ${active === 'WORKOUTS' ? 'text-primary' : 'text-slate-500'}`}
      >
        <span className="material-symbols-rounded text-[26px]" style={{ fontVariationSettings: active === 'WORKOUTS' ? "'FILL' 1" : "'FILL' 0" }}>fitness_center</span>
        <span className={`text-[10px] font-bold`}>Workouts</span>
      </button>

      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/10 rounded-full"></div>
    </nav>
  );
};

export default BottomNav;
