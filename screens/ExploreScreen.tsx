
import React from 'react';
import StatusBar from '../components/StatusBar';
import BottomNav from '../components/BottomNav';
import { AppScreen } from '../types';

const categories = [
  { name: 'Weight Loss', icon: 'trending_down', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUXmOArbYP-r9FLVLawzHqU_WtPi0EVGm5gN1rXL3rKPoo-AcCgi9LXp7WIheDNaBwSK06WOqqkt-X29jRh2mRDP_9Q-SumONfWCeZzT4cdzTQhRP1lX1uvkY-V2wi0TFAG816mPHlseUu4tCPfPBDFhApTI9O0F8fV7PQzWH8lC19r4IAIcZwrzfKNpMNcjP0B6wkPv45RULBsSs4LhheKIqE8y2mr9yOwGZz_X0puWlhZlE5DrFgj8JoLd3Cdo84lwlEv_IMC6aF' },
  { name: 'Strength', icon: 'fitness_center', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwp9GjmBreaYSjHY_0YbtiaoLtNL15rwkyMDHfDMU62G7oQTENLGXyZ2vg5yOH22nWyNRqtGWWYTey-z2QTTxQ5cWfB64bbe25-qAUflpO5Qk0sjo7-xDiUkgAcnV6wS2nFLnuz1wZsZiXx8e_U-k44JOEglc1wsLGCQsC6jb0SRbKWTpBJ9bAxM8AtI6PBaaxcdZFZUiHX1P73sL1aZby2pFJeEI57RKDsuACXj1WOCSTIjZohG4qooHB1S83qvv26CNULphu85Ik' },
  { name: 'Yoga', icon: 'self_improvement', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDJ-uiX20Cccpk-ln8pv9WIoVWDznkLsikOJ8xZCbrseGDFFwvCnbt_ixm-VTcfVWqjiwLDWoYAwt6_o1DcXYsbiYkfEinn-Gc--86cqqeBX1bOO9RtBOqFlve9-7wdYZXqqgCft74qbFYGUSpyBL2IzmiWNDGlw_dnU-AMG7sdFhT8ojHHKSd21va36x65dQ1zoCrDaod4ooBFq7T-QJEFaOYfWIK6Rnb5dnnVZCb6LPgWRwQUq4r4ba_55hxEdcgbii6D0jkUc90T' },
  { name: 'HIIT', icon: 'bolt', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBoPR1Rnir48lRHlhVPLxqDHjWssqfPm7HTHUxwVBYlk2mvYn22dm_-OHOKKbTGJI5WV_3hLCS6EidkEQ5WoWg8Wh0UqGsheOwz7baykEaWBa263Y2pzCRtS8v-5TctkJZrNS2Im655OwmMv0m_-RjPBRjkFkPLpLknl7pNoLXSfb1Ve8Az8m6hGowQ5sg1VL8om8BR16XzIu3F2pfRIfdaxd5yg7mzOfiX88DjvjtYxO3rWDf3_nhMbdiX0GkuWcwuCO_9qIXfaLcZ', active: true },
];

const featured = [
  { 
    title: 'Full Body Shred', 
    level: 'ADVANCED', 
    cat: 'HIIT', 
    duration: '45m', 
    kcal: '450 kcal',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBeoV1Tik-zxm3WbGqRrbqJKw8tfBo65j_Iwg3BXpb92UlHFX48NrIqhr_MY7up_SHCCJw2jTiLlHmnkds2s8UiyLnzgBk9Si48vG5feH_PBz5EI57zu8zhC73jZiYcjuJfVNSIo0G0Jl7EJ8s0s71I55VL6qBsu4zxgAW1PDFgoa4RZ-v8XicZ73iXZO2-LDuCekuQPtucCO7zv5v6-YeChDOkjqIMruCDJqd-ujbLq4qbcNonYCx3TjXiLPIg_Eu5onliMmw9PhYZ'
  },
  { 
    title: 'Morning Flow', 
    level: 'BEGINNER', 
    cat: 'YOGA', 
    duration: '20m', 
    kcal: '120 kcal',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUPttkAcDYpdih6IwlawY79wjjzjtzSlmKZ6TDxPt5kgMSr_IY55T9v-rMLAlBy-s_BXAQIjN3bHxR3di6QEQKZDhkQGlwcQRFOTp03GpITm1ddiBuylh51Q2KhO5shAR6FqkoaSqgwa0c7FX3CLkSGGOL6Cp6D7j6R8Wyxxx9G2Tnw663l7s7G08LbaNQSx50FII2KXHzSVuR-NIePNm_hhxBgGBYesuGNYMCulDnwfgAntBa-TQCc4sDXZLYPS_BLAx7RmiaN6X4'
  }
];

const ExploreScreen: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  return (
    <div className="pb-32 min-h-screen bg-[#020617] text-white">
      <StatusBar />
      
      <main className="pt-6">
        {/* Search Header */}
        <div className="px-5 mt-4 mb-8">
          <h1 className="text-[34px] font-extrabold mb-6 tracking-tight leading-none">Explore</h1>
          <div className="relative group">
            <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
            <input 
              className="w-full bg-slate-900/60 border-none rounded-2xl py-4 pl-12 pr-4 text-[15px] focus:ring-1 focus:ring-primary placeholder:text-slate-500 transition-all shadow-inner" 
              placeholder="Find your next workout..." 
              type="text" 
            />
          </div>
        </div>

        {/* Featured Workouts */}
        <section className="mb-10">
          <div className="flex items-center justify-between px-5 mb-5">
            <h2 className="text-xl font-bold tracking-tight">Featured Workouts</h2>
            <button className="text-primary text-sm font-bold hover:opacity-80 transition-opacity">View All</button>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar px-5">
            {featured.map((item, i) => (
              <div key={i} className="min-w-[300px] h-52 relative rounded-[2.5rem] overflow-hidden group flex-shrink-0 shadow-2xl">
                <img 
                  alt={item.title} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                  src={item.img} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex gap-2 mb-2">
                    <span className="bg-primary text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">{item.level}</span>
                    <span className="bg-white/10 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">{item.cat}</span>
                  </div>
                  <h3 className="text-2xl font-bold leading-tight mb-2">{item.title}</h3>
                  <div className="flex items-center gap-4 text-[11px] text-slate-300 font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><span className="material-symbols-rounded text-[16px]">schedule</span> {item.duration}</span>
                    <span className="flex items-center gap-1.5"><span className="material-symbols-rounded text-[16px]">local_fire_department</span> {item.kcal}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Workout Categories */}
        <section className="px-5 mb-10">
          <h2 className="text-xl font-bold mb-5 tracking-tight">Workout Categories</h2>
          <div className="grid grid-cols-2 gap-4">
            {categories.map((cat, idx) => (
              <div key={idx} className={`relative aspect-square rounded-[2rem] overflow-hidden group cursor-pointer shadow-lg border-2 transition-all ${cat.active ? 'border-primary' : 'border-transparent'}`}>
                <img alt={cat.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src={cat.img} />
                <div className={`absolute inset-0 ${cat.active ? 'bg-primary/20' : 'bg-slate-950/40'} group-hover:bg-slate-950/20 transition-colors`}></div>
                <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-slate-950/80 to-transparent">
                  <h3 className={`text-base font-bold text-center tracking-tight ${cat.active ? 'text-primary' : 'text-white'}`}>{cat.name}</h3>
                </div>
                {cat.icon && (
                  <div className={`absolute top-4 right-4 ${cat.active ? 'bg-primary text-slate-950' : 'bg-white/10 backdrop-blur-xl text-white'} rounded-full p-2.5 shadow-xl`}>
                    <span className="material-symbols-rounded text-[18px] font-bold block">{cat.icon}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav active="EXPLORE" onNavigate={onNavigate} />

      {/* Background visual elements */}
      <div className="fixed top-0 right-0 -z-10 w-80 h-80 bg-primary/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
      <div className="fixed bottom-0 left-0 -z-10 w-96 h-96 bg-primary/5 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2"></div>
    </div>
  );
};

export default ExploreScreen;
