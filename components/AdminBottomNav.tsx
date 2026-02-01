import React from 'react';
import { AppScreen } from '../types';

interface AdminBottomNavProps {
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
}

const AdminBottomNav: React.FC<AdminBottomNavProps> = ({ activeScreen, onNavigate }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-4 py-3 pb-8 flex justify-between items-center z-50 max-w-[430px] mx-auto gap-2">
      <button 
        onClick={() => onNavigate('ADMIN_DASHBOARD')} 
        className={`flex flex-col items-center space-y-1 text-xs transition-colors ${activeScreen === 'ADMIN_DASHBOARD' ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}
      >
        <span className="material-symbols-rounded text-lg" style={{ fontVariationSettings: activeScreen === 'ADMIN_DASHBOARD' ? "'FILL' 1" : "'FILL' 0" }}>dashboard</span>
        <span className="font-bold">Home</span>
      </button>

      <button 
        onClick={() => onNavigate('ADMIN_ORDERS')} 
        className={`flex flex-col items-center space-y-1 text-xs transition-colors ${activeScreen === 'ADMIN_ORDERS' ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}
      >
        <span className="material-symbols-rounded text-lg" style={{ fontVariationSettings: activeScreen === 'ADMIN_ORDERS' ? "'FILL' 1" : "'FILL' 0" }}>shopping_cart_checkout</span>
        <span className="font-medium">Orders</span>
      </button>

      <button 
        onClick={() => onNavigate('DASHBOARD')} 
        className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 -mt-10 border-4 border-white dark:border-[#0F172A] active:scale-95 transition-transform"
      >
        <span className="material-symbols-rounded text-3xl">home</span>
      </button>

      <button 
        onClick={() => onNavigate('ADMIN_USERS')} 
        className={`flex flex-col items-center space-y-1 text-xs transition-colors ${activeScreen === 'ADMIN_USERS' ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}
      >
        <span className="material-symbols-rounded text-lg" style={{ fontVariationSettings: activeScreen === 'ADMIN_USERS' ? "'FILL' 1" : "'FILL' 0" }}>people</span>
        <span className="font-medium">Users</span>
      </button>

      <button 
        onClick={() => onNavigate('CONFIG')} 
        className={`flex flex-col items-center space-y-1 text-xs transition-colors ${activeScreen === 'CONFIG' ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}
      >
        <span className="material-symbols-rounded text-lg" style={{ fontVariationSettings: activeScreen === 'CONFIG' ? "'FILL' 1" : "'FILL' 0" }}>settings</span>
        <span className="font-medium">Config</span>
      </button>
    </nav>
  );
};

export default AdminBottomNav;
