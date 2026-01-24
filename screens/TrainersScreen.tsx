
import React from 'react';
import StatusBar from '../components/StatusBar';
import BottomNav from '../components/BottomNav';
import { AppScreen } from '../types';

const trainers = [
  { name: 'Alex Rivers', specialty: 'Strength & Conditioning', exp: '8yr', rate: '$45/hr', rating: '4.9', img: 'https://picsum.photos/seed/t1/200' },
  { name: 'Sarah Jenkins', specialty: 'Yoga & Mobility', exp: '6yr', rate: '$50/hr', rating: '5.0', img: 'https://picsum.photos/seed/t2/200' },
  { name: 'Marcus Chen', specialty: 'HIIT & Weight Loss', exp: '4yr', rate: '$40/hr', rating: '4.7', img: 'https://picsum.photos/seed/t3/200', away: true },
];

const TrainersScreen: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  return (
    <div className="pb-32 min-h-screen">
      <StatusBar />
      <main className="px-6 pt-4">
        <header className="mb-6 flex items-center justify-between">
          <button onClick={() => onNavigate('DASHBOARD')} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800">
            <span className="material-symbols-rounded">arrow_back_ios_new</span>
          </button>
          <h1 className="text-xl font-bold">Personal Trainers</h1>
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800">
            <span className="material-symbols-rounded">search</span>
          </button>
        </header>

        <div className="space-y-4">
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-6 px-6 mb-6">
            <button className="whitespace-nowrap px-5 py-2.5 rounded-full bg-primary text-white font-semibold text-sm">All Specialties</button>
            {['Strength', 'Yoga', 'HIIT', 'Cardio'].map(s => (
              <button key={s} className="whitespace-nowrap px-5 py-2.5 rounded-full bg-slate-800 text-slate-400 font-semibold text-sm">{s}</button>
            ))}
          </div>

          <div className="space-y-4">
            {trainers.map((t, idx) => (
              <div key={idx} className={`p-4 rounded-[2rem] bg-slate-900 border border-slate-800 flex flex-col gap-4 ${t.away ? 'opacity-75' : ''}`}>
                <div className="flex gap-4">
                  <div className="relative">
                    <img alt={t.name} className={`w-24 h-24 rounded-2xl object-cover shrink-0 ${t.away ? 'grayscale' : ''}`} src={t.img} />
                    {!t.away && (
                      <div className="absolute -bottom-2 -right-2 bg-primary w-8 h-8 rounded-full border-4 border-slate-900 flex items-center justify-center">
                        <span className="material-symbols-rounded text-[14px] text-white">verified</span>
                      </div>
                    )}
                    {t.away && (
                      <div className="absolute inset-0 bg-slate-900/40 rounded-2xl flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white uppercase bg-slate-900/60 px-1.5 py-0.5 rounded">Away</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-lg font-bold">{t.name}</h3>
                      <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-lg">
                        <span className="material-symbols-rounded text-primary text-[14px]">star</span>
                        <span className="text-xs font-bold text-primary">{t.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 font-medium mb-2">{t.specialty}</p>
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                      <div className="flex items-center gap-1"><span className="material-symbols-rounded text-sm">schedule</span>{t.exp} Exp.</div>
                      <div className="flex items-center gap-1"><span className="material-symbols-rounded text-sm">payments</span>{t.rate}</div>
                    </div>
                  </div>
                </div>
                <button 
                  disabled={t.away}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md transition-all ${
                    t.away ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-primary text-white active:scale-[0.98]'
                  }`}
                >
                  {t.away ? 'Next Available: Tomorrow' : 'Book Now'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
      <BottomNav active="WORKOUTS" onNavigate={onNavigate} />
    </div>
  );
};

export default TrainersScreen;
