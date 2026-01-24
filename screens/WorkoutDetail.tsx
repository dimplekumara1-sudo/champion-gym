
import React, { useState } from 'react';
import StatusBar from '../components/StatusBar';

const WorkoutDetail: React.FC<{ onBack: () => void, onStart: () => void }> = ({ onBack, onStart }) => {
  const [exercises, setExercises] = useState([
    { name: 'Bench Press - Bars', sets: '3 sets x 12-15 reps - 60kg', done: true, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBhyvsKDuvsJahhFlfwjZBjKeabZdswv7ZXUnde7gxsI6wTVpq8HNkOHTQEfFw8c6oF68wls0Tzkhh2rkhwBdbBpAi2_JPL61V-bWbv2Ixh13lsO-A2nsblcGkvretWuLpWNSIeOVwZDxgVlmVIfyolCe6EEOeWhrWSImpuyaqN6BABQuA_nHh8-HD-KNcMmM07e7qHalMKafLvy_EmL0GIoLCkgh4KnhC3yWGdNRxhQ09nwsYl5Y0X2Lc1sInKuJ0sN2t85zR7wWKk' },
    { name: 'Incline Press - Dumbell', sets: '3 sets x 12-15 reps - 20kg', done: false, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBB__XkTFBz4t9y8V_qXBqg00EXDmyPP_8xKS4Qd0nxOmkOMG48z2UPlAHCiAy_MTstFKD5VuHogxp4s15WVW6vSw4vmeMNPx9KYcXm9yPTxx86_oVvGd7UHr-Ogp1UqcWgDDvDmXxCpvW1AbPhwJZrHe0cqRtuLhqopE09N-rQuAbm70U9shWMhEfsJzL8LXE0pgddBuOtRtbfVQCFqd2rAnjBXhEs3uK4z0utFIikC6X6QTBd66BjzWR_G_4v1_bZOLczUjDZCABJ' },
    { name: 'Decline Press - Dumbell', sets: '3 sets x 12-15 reps - 15kg', done: false, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCduNBU6rHT0sDb3iRoXgiKJHiCHd5tUYJlG29AeiTkjXxqwARxvETU6E7CgLWWFLrSUfodk3eRLiNHwDY2GdduS3isvheCvNLz2wcb3pMYXg2qFAiVwGpEezVfN7qXu4eO6ah9u8n7itm-L2c0Zmk1_r7kPSwb1RKIcDWhJPwpYM87_bTh8kewTzT1116V4tWh7bypd7gWi8-dwakQqz5u18Y4vooxY8zs3iHmZt9tkyyYdO_3XZrkFZtiZITEQHVeBscLQSDSLxRO' },
    { name: 'Cable Pec Flys', sets: '3 sets x 12-15 reps - 10kg', done: false, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5pXLLPckmBPpvK_qlav20R_bXswRffwRIDclxj4Gt_b18XcVf2PwJRtwhSPfH8p1ADmVEja93NsvW7L-nkzROaNY4uR2zv-LJ82S8w0-X_AS27zrZbQqLiUAZuFqqKNGp8khRFqMCutn6hpfhe3RN1czO33eCUdPyQ65bG12naXfXbHg92czNP9TeREuPBXHG1dPtjdrPxPRJj7e9CqJanu1u3gY4_PIsvDzIyYvobLVlCcDbnovsa_XGaNjApVNlAB-WllVcmB3q' },
    { name: 'Dumbell Pullover', sets: '3 sets x 12-15 reps - 25kg', done: false, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAN26JiCTkF_2XZY_nXz7XqVUZhtUjuCYgj48Soo4NnfLtValSFfQG3kdoIcgwz5hr0J3xLztufFA4slM0nudjIHuabWPmSrbtEaZuI090t7Qb6hxGTwwFqmHOmuV-zMp1wW-9mzHnmxzbKku_jLK1UTAWf1UeWPlZdg2NtsohiKt-fBcIJnb1duYN8McRowbP6K8DF521ncccGbYbqkLqk-2L3IXsh4cq8TMgm9Q1zSV9gSxYAOAMMOaCKFcbH2xEL2PdVFbuR2wmt' }
  ]);

  const toggleDone = (index: number) => {
    const next = [...exercises];
    next[index].done = !next[index].done;
    setExercises(next);
  };

  return (
    <div className="min-h-screen bg-[#090E1A] pb-32">
      <StatusBar />
      <header className="px-6 py-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-800 transition-colors">
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold">Day 1 - Chest</h1>
        <div className="w-10"></div>
      </header>

      <main className="px-5 space-y-6">
        <div className="relative aspect-video w-full bg-slate-900 rounded-[2.5rem] overflow-hidden group shadow-2xl">
          <img 
            alt="Bench press" 
            className="w-full h-full object-cover opacity-90" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA0TGNA1b7Earlea4k3HN9XdkNSNFosxHXBJuwpCt-Qb8Xk_cxf-i4CYh4qiB20MzDn8H6fRdjHzGHQIhmpf6xtpLKu5zeQbGba7jsUv7pWaesVFrX86dUhLB-W0k0F1DGBByIsLKfTjxGEmqkOwVgDAa81gQpo93TWp5crFBoait3hqRpoH7ii3nMvU6FUkp-R_-m95j78PWzVoGmOirj82pEXuaDfv0-ROQPhAJQpwwreVQg4jQOQn1mk3_Hw-n5-r9ZuBEVjxZO5" 
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <button className="w-16 h-16 bg-white/95 rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
              <span className="material-symbols-rounded text-slate-900 text-4xl pl-1" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
            </button>
          </div>
        </div>

        <div className="bg-[#151C2C] border border-[#1E293B] rounded-[2.5rem] p-6 shadow-xl space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Day 1 - Chest</h2>
            <div className="w-1/2 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full w-[20%] shadow-[0_0_8px_rgba(34,197,94,0.3)]"></div>
            </div>
          </div>

          <div className="space-y-7">
            {exercises.map((ex, i) => (
              <div key={i} className="flex items-center gap-4 group cursor-pointer" onClick={() => toggleDone(i)}>
                <div className="w-14 h-14 bg-slate-800 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-700/30">
                  <img alt={ex.name} className="w-full h-full object-cover" src={ex.img} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[15px] truncate text-white">{ex.name}</h3>
                  <p className="text-[13px] text-primary font-bold opacity-80">{ex.sets}</p>
                </div>
                <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  ex.done ? 'bg-primary text-slate-950' : 'border-2 border-slate-700/50 text-transparent hover:border-primary'
                }`}>
                  <span className="material-symbols-rounded text-xl font-black">check</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-6">
          <button 
            onClick={onStart}
            className="w-full bg-primary text-slate-950 font-black py-4.5 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-transform flex items-center justify-center gap-2 text-lg"
          >
            <span className="material-symbols-rounded font-black">play_circle</span>
            START WORKOUT
          </button>
        </div>
      </main>
    </div>
  );
};

export default WorkoutDetail;
