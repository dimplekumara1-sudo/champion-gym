
import React, { useState } from 'react';
import StatusBar from '../components/StatusBar';

const goals = [
  { id: 'lose_weight', title: 'Lose Weight', desc: 'Burn fat and get leaner with high-intensity training.', icon: 'monitor_weight' },
  { id: 'build_muscle', title: 'Build Muscle', desc: 'Increase strength and gain muscle mass effectively.', icon: 'fitness_center' },
  { id: 'keep_fit', title: 'Keep Fit', desc: 'Maintain a healthy lifestyle and stay active daily.', icon: 'directions_run' },
  { id: 'flexibility', title: 'Improve Flexibility', desc: 'Focus on mobility, stretching and mental balance.', icon: 'self_improvement' },
];

const OnboardingGoal: React.FC<{ onNext: (goal: string) => void; onBack: () => void }> = ({ onNext, onBack }) => {
  const [selected, setSelected] = useState('lose_weight');

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
          <div className="flex-1">
            <div className="flex gap-1.5">
              <div className="flex-1 h-1 rounded-full bg-primary"></div>
              <div className="flex-1 h-1 rounded-full bg-slate-800"></div>
              <div className="flex-1 h-1 rounded-full bg-slate-800"></div>
              <div className="flex-1 h-1 rounded-full bg-slate-800"></div>
            </div>
          </div>
        </div>
        <h1 className="text-3xl font-extrabold leading-tight mb-3">
          Choose Your <span className="text-primary">Goal</span>
        </h1>
        <p className="text-slate-400 font-medium">
          This helps us create your personalized plan to get the best results.
        </p>
      </header>

      <div className="flex-1 space-y-4">
        {goals.map((goal) => (
          <button
            key={goal.id}
            onClick={() => setSelected(goal.id)}
            className={`w-full flex items-center p-5 rounded-2xl border-2 transition-all duration-200 ${
              selected === goal.id ? 'border-primary bg-primary/5' : 'border-slate-800 bg-slate-900'
            }`}
          >
            <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center mr-5 shrink-0">
              <span className="material-symbols-rounded text-3xl text-primary">{goal.icon}</span>
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-lg font-bold">{goal.title}</h3>
              <p className="text-sm text-slate-400">{goal.desc}</p>
            </div>
            <div className={`ml-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              selected === goal.id ? 'bg-primary border-primary' : 'border-slate-700'
            }`}>
              <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
            </div>
          </button>
        ))}
      </div>

      <footer className="mt-8">
        <button 
          onClick={() => onNext(selected)}
          className="w-full bg-primary text-white py-4 px-6 rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          Next Step
          <span className="material-symbols-rounded">arrow_forward</span>
        </button>
        <div className="mt-4 mx-auto w-32 h-1.5 bg-slate-800 rounded-full"></div>
      </footer>
    </div>
  );
};

export default OnboardingGoal;
