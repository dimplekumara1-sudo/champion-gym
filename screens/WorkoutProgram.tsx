
import React from 'react';
import StatusBar from '../components/StatusBar';
import BottomNav from '../components/BottomNav';
import { AppScreen } from '../types';

const WorkoutProgram: React.FC<{ onNavigate: (s: AppScreen) => void, onSelectWorkout: () => void }> = ({ onNavigate, onSelectWorkout }) => {
  return (
    <div className="pb-32 min-h-screen bg-[#090E1A] text-white">
      <StatusBar />
      <nav className="flex items-center px-4 py-2 mb-4">
        <button onClick={() => onNavigate('DASHBOARD')} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold mr-10">Workout Program</h1>
      </nav>

      <section className="px-6 py-4">
        <p className="text-slate-400 text-sm leading-relaxed">
          This workout programme is tailor-made for you by a personal trainer at your gym in line with your goals.
        </p>
      </section>

      <main className="px-4 space-y-6">
        {/* Week 1 Card */}
        <div className="bg-[#151C2C] border border-[#1E293B] rounded-[2.5rem] p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Week 1</h2>
            <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="bg-primary h-full w-[40%] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.3)]"></div>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {[
              { day: 1, name: 'Chest', done: true, icon: 'check_circle' },
              { day: 2, name: 'Abs', done: true, icon: 'check_circle' },
              { day: 3, name: 'Legs', done: false, icon: 'fitness_center' },
              { day: 4, name: 'Arms', done: false, icon: 'sports_gymnastics' },
              { day: 5, name: 'Glutes', done: false, icon: 'self_improvement' },
            ].map((d, i) => (
              <button 
                key={i} 
                onClick={d.day === 1 ? onSelectWorkout : undefined}
                className="flex flex-col items-center min-w-[70px] gap-2 active:scale-95 transition-transform"
              >
                <div className="text-xs text-slate-500 font-bold">{d.day}</div>
                <div className={`w-16 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all ${
                  d.done ? 'bg-primary/20 border-primary/40' : 'bg-slate-800/40 border-slate-700/30'
                }`}>
                  <span className={`material-symbols-rounded text-xl ${d.done ? 'text-primary' : 'text-slate-500'}`} style={{ fontVariationSettings: d.done ? "'FILL' 1" : "'FILL' 0" }}>{d.icon}</span>
                  <span className={`text-[9px] uppercase tracking-wider font-black ${d.done ? 'text-primary' : 'text-slate-500'}`}>{d.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Week 2 Card */}
        <div className="bg-[#151C2C] border border-[#1E293B] rounded-[2.5rem] p-6 opacity-60 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-400">Week 2</h2>
            <div className="w-32 h-2 bg-slate-800 rounded-full"></div>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {[
              { day: 1, name: 'Chest', icon: 'accessibility' },
              { day: 2, name: 'Glutes', icon: 'self_improvement' },
              { day: 3, name: 'Legs', icon: 'fitness_center' },
              { day: 4, name: 'Arms', icon: 'sports_gymnastics' },
            ].map((d, i) => (
              <div key={i} className="flex flex-col items-center min-w-[70px] gap-2">
                <div className="text-xs text-slate-600 font-bold">{d.day}</div>
                <div className="w-16 h-20 bg-slate-800/20 border border-slate-700/20 rounded-2xl flex flex-col items-center justify-center gap-1">
                  <span className="material-symbols-rounded text-xl text-slate-600">{d.icon}</span>
                  <span className="text-[9px] uppercase tracking-wider font-black text-slate-600">{d.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <BottomNav active="WORKOUTS" onNavigate={onNavigate} />
    </div>
  );
};

export default WorkoutProgram;
