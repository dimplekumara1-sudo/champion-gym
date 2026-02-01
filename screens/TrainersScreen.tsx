
import React, { useEffect, useState } from 'react';
import StatusBar from '../components/StatusBar';
import Header from '../components/Header';
import { AppScreen } from '../types';
import { supabase } from '../lib/supabase';

interface Trainer {
  id: number;
  name: string;
  specialty: string;
  experience: string;
  rate: string;
  rating: number;
  photo_url: string;
  is_active: boolean;
}

const TrainersScreen: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('09:00');
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pt_trainers')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setTrainers(data || []);
    } catch (error) {
      console.error('Error fetching trainers:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 5; hour <= 22; hour++) {
      for (let min of ['00', '30']) {
        const h = hour.toString().padStart(2, '0');
        slots.push(`${h}:${min}`);
      }
    }
    slots.push('23:00');
    return slots;
  };

  const handleBookSession = async () => {
    if (!selectedTrainer) return;

    try {
      setIsBooking(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { error } = await supabase
        .from('pt_sessions')
        .insert({
          trainer_id: selectedTrainer.id,
          user_id: user.id,
          exercise_name: 'Strength & Conditioning',
          session_date: bookingDate,
          session_time: bookingTime,
          status: 'pending'
        });

      if (error) throw error;

      alert('PT Session booked successfully! Wait for confirmation.');
      setShowBookingModal(false);
      onNavigate('DASHBOARD');
    } catch (error: any) {
      console.error('Error booking session:', error);
      alert(error.message || 'Failed to book session');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="pb-32 min-h-screen bg-[#090E1A] text-white">
      <StatusBar />
      <Header onProfileClick={() => onNavigate('PROFILE')} />
      <main className="px-6 pt-2">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => onNavigate('DASHBOARD')} className="p-2 bg-slate-900/60 rounded-full">
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold">Personal Trainers</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : trainers.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <span className="material-symbols-rounded text-5xl mb-4">person_off</span>
            <p>No trainers available at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {trainers.map((t) => (
              <div key={t.id} className="p-4 rounded-[2rem] bg-slate-900 border border-slate-800 flex flex-col gap-4 shadow-xl">
                <div className="flex gap-4">
                  <div className="relative">
                    <img 
                      alt={t.name} 
                      className="w-24 h-24 rounded-2xl object-cover shrink-0 shadow-lg" 
                      src={t.photo_url && t.photo_url.startsWith('http') ? t.photo_url : `https://picsum.photos/seed/${t.id}/200`} 
                    />
                    <div className="absolute -bottom-2 -right-2 bg-primary w-8 h-8 rounded-full border-4 border-slate-900 flex items-center justify-center">
                      <span className="material-symbols-rounded text-[14px] text-white">verified</span>
                    </div>
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
                      <div className="flex items-center gap-1"><span className="material-symbols-rounded text-sm">schedule</span>{t.experience}</div>
                      <div className="flex items-center gap-1"><span className="material-symbols-rounded text-sm">payments</span>{t.rate}</div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedTrainer(t);
                    setShowBookingModal(true);
                  }}
                  className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm shadow-lg active:scale-[0.98] transition-all"
                >
                  Book Now
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {showBookingModal && selectedTrainer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-[380px] bg-[#151C2C] border border-[#1E293B] rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold">Book PT Session</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Strength & Conditioning</p>
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 active:scale-90 transition-transform"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Trainer</label>
                <div className="flex items-center gap-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/30">
                  <img src={selectedTrainer.photo_url && selectedTrainer.photo_url.startsWith('http') ? selectedTrainer.photo_url : `https://picsum.photos/seed/${selectedTrainer.id}/200`} className="w-10 h-10 rounded-xl object-cover" alt="" />
                  <span className="font-bold">{selectedTrainer.name}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Select Date</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Select Time (30min slots)</label>
                <div className="grid grid-cols-3 gap-2 max-h-[150px] overflow-y-auto no-scrollbar pr-1">
                  {generateTimeSlots().map(time => (
                    <button
                      key={time}
                      onClick={() => setBookingTime(time)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        bookingTime === time 
                          ? 'bg-primary text-slate-950 shadow-[0_0_10px_rgba(34,197,94,0.3)]' 
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={isBooking}
                onClick={handleBookSession}
                className="w-full py-4 bg-primary text-slate-950 font-black rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
              >
                {isBooking ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span className="material-symbols-rounded text-lg">calendar_add_on</span>
                    CONFIRM BOOKING
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TrainersScreen;
