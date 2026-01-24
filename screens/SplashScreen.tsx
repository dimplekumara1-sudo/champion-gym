
import React from 'react';
import StatusBar from '../components/StatusBar';

interface SplashScreenProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onGetStarted, onSignIn }) => {
  return (
    <div className="relative h-screen flex flex-col">
      <StatusBar />
      <div className="absolute inset-0 z-0">
        <img 
          alt="Athlete training" 
          className="w-full h-full object-cover" 
          src="https://picsum.photos/seed/fitness/800/1600" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/60 to-transparent"></div>
      </div>

      <div className="relative z-10 flex flex-col flex-1 justify-between px-8 py-12">
        <div className="flex flex-col items-center mt-12">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-4 transform -rotate-3">
            <span className="material-symbols-rounded text-white text-5xl">fitness_center</span>
          </div>
          <h1 className="text-white text-2xl font-extrabold tracking-tighter uppercase italic">
            Power<span className="text-secondary">Flex</span>
          </h1>
        </div>

        <div className="space-y-4">
          <h2 className="text-white text-5xl font-black leading-tight tracking-tight">
            Train <span className="text-primary">anywhere</span>,<br />
            anytime
          </h2>
          <p className="text-slate-300 text-lg font-medium max-w-[280px]">
            The ultimate companion for your fitness journey. Real-time tracking and pro routines.
          </p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={onGetStarted}
            className="w-full bg-primary hover:bg-green-500 text-slate-900 font-extrabold py-5 rounded-2xl text-lg transition-all transform active:scale-95 shadow-xl shadow-primary/30 flex items-center justify-center gap-2"
          >
            GET STARTED
            <span className="material-symbols-rounded">arrow_forward</span>
          </button>
          <button 
            onClick={onSignIn}
            className="w-full bg-transparent border-2 border-slate-700 text-white font-bold py-5 rounded-2xl text-lg hover:bg-slate-800 transition-all"
          >
            SIGN IN
          </button>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
