
import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import StatusBar from '../components/StatusBar';
import BottomNav from '../components/BottomNav';
import { AppScreen } from '../types';

const data = [
  { name: 'M', kcal: 1200 },
  { name: 'T', kcal: 1800 },
  { name: 'W', kcal: 1400 },
  { name: 'T', kcal: 2100 },
  { name: 'F', kcal: 1600 },
  { name: 'S', kcal: 2400 },
  { name: 'S', kcal: 1900 },
];

const DailyTracker: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  return (
    <div className="pb-32 bg-[#090E1A] min-h-screen">
      <StatusBar />
      <main className="pt-4 px-5">
        <header className="mb-6 flex items-center justify-between">
          <button onClick={() => onNavigate('DASHBOARD')} className="p-2 -ml-2 rounded-full hover:bg-slate-800">
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <div className="text-center flex-1 pr-8">
            <h1 className="text-xl font-extrabold tracking-tight">Daily Detailed</h1>
            <p className="text-slate-400 text-xs font-medium">Monday, Oct 24</p>
          </div>
        </header>

        <div className="bg-[#151C2C] rounded-3xl p-5 mb-6 border border-[#1E293B]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Weekly Trend</span>
            <span className="text-xs text-green-400 font-medium">Avg: 1,840 kcal</span>
          </div>

          <div className="h-24 w-full mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorKcal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="kcal" stroke="#22C55E" fillOpacity={1} fill="url(#colorKcal)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-slate-800/60 p-4 rounded-2xl flex flex-col items-center border border-slate-700/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Consumed</span>
              <span className="text-lg font-extrabold text-white">1,240</span>
            </div>
            <div className="bg-primary p-4 rounded-2xl flex flex-col items-center shadow-lg shadow-primary/20">
              <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest mb-1">Remaining</span>
              <span className="text-lg font-extrabold text-white">760</span>
            </div>
            <div className="bg-slate-800/60 p-4 rounded-2xl flex flex-col items-center border border-slate-700/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Burned</span>
              <span className="text-lg font-extrabold text-white">450</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                <span className="material-symbols-rounded text-orange-400">light_mode</span>
                Breakfast
              </h2>
              <span className="text-sm font-semibold text-slate-400">420 kcal</span>
            </div>
            <div className="bg-[#151C2C] rounded-2xl divide-y divide-[#1E293B] border border-[#1E293B]">
              {[
                { name: 'Oatmeal with Blueberries', detail: '250g • 1 bowl', kcal: 310 },
                { name: 'Black Coffee', detail: '1 cup', kcal: 5 },
                { name: 'Boiled Egg', detail: '2 large', kcal: 105 },
              ].map((item, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-200">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.detail}</p>
                  </div>
                  <span className="font-bold text-slate-300">{item.kcal}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <BottomNav active="HOME" onNavigate={onNavigate} />
    </div>
  );
};

export default DailyTracker;
