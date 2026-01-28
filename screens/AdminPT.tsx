
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';

const AdminPT: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [trainers, setTrainers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trainers' | 'sessions'>('trainers');
  const [showAddTrainer, setShowAddTrainer] = useState(false);
  const [showEditTrainer, setShowEditTrainer] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [showEditSession, setShowEditSession] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<any>(null);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [newTrainer, setNewTrainer] = useState({
    name: '',
    specialty: 'Strength & Conditioning',
    experience: '',
    rate: '',
    photo_url: ''
  });
  const [newSession, setNewSession] = useState({
    user_id: '',
    trainer_id: '',
    session_date: '',
    session_time: '',
    exercise_name: 'PT Session',
    status: 'confirmed',
    due_date: ''
  });

  useEffect(() => {
    fetchData();
    if (activeTab === 'sessions') {
      fetchProfiles();
    }
  }, [activeTab]);

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
    setProfiles(data || []);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'trainers') {
        const { data, error } = await supabase.from('pt_trainers').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setTrainers(data || []);
      } else {
        const { data, error } = await supabase
          .from('pt_sessions')
          .select('*, pt_trainers(name), profiles(full_name)')
          .order('session_date', { ascending: false });
        if (error) throw error;
        setSessions(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTrainer = async () => {
    try {
      const { error } = await supabase.from('pt_trainers').insert([newTrainer]);
      if (error) throw error;
      setShowAddTrainer(false);
      setNewTrainer({ name: '', specialty: 'Strength & Conditioning', experience: '', rate: '', photo_url: '' });
      fetchData();
    } catch (e) {
      alert('Error adding trainer');
    }
  };

  const handleUpdateTrainer = async () => {
    try {
      const { id, created_at, ...updateData } = editingTrainer;
      const { error } = await supabase.from('pt_trainers').update(updateData).eq('id', id);
      if (error) throw error;
      setShowEditTrainer(false);
      setEditingTrainer(null);
      fetchData();
    } catch (e) {
      alert('Error updating trainer');
    }
  };

  const handleDeleteTrainer = async (id: number) => {
    if (!confirm('Are you sure you want to delete this trainer?')) return;
    try {
      const { error } = await supabase.from('pt_trainers').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (e) {
      alert('Error deleting trainer');
    }
  };

  const handleAddSession = async () => {
    try {
      if (!newSession.user_id || !newSession.trainer_id || !newSession.session_date || !newSession.session_time) {
        alert('Please fill all fields');
        return;
      }
      const { error } = await supabase.from('pt_sessions').insert([newSession]);
      if (error) throw error;
      setShowAddSession(false);
      setNewSession({ user_id: '', trainer_id: '', session_date: '', session_time: '', exercise_name: 'PT Session', status: 'confirmed', due_date: '' });
      fetchData();
    } catch (e) {
      alert('Error adding session');
    }
  };

  const handleUpdateSession = async () => {
    try {
      const { id, profiles, pt_trainers, created_at, updated_at, ...updateData } = editingSession;
      const { error } = await supabase.from('pt_sessions').update(updateData).eq('id', id);
      if (error) throw error;
      setShowEditSession(false);
      setEditingSession(null);
      fetchData();
    } catch (e) {
      alert('Error updating session');
    }
  };

  const handleDeleteSession = async (id: number) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    try {
      const { error } = await supabase.from('pt_sessions').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (e) {
      alert('Error deleting session');
    }
  };

  const handleUpdateStatus = async (sessionId: number, status: string) => {
    try {
      const { error } = await supabase.from('pt_sessions').update({ status }).eq('id', sessionId);
      if (error) throw error;
      fetchData();
    } catch (e) {
      alert('Error updating session');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="p-2 bg-slate-900 rounded-full">
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <h1 className="text-2xl font-bold">PT Management</h1>
        </div>
        <div className="flex bg-slate-900 rounded-xl p-1">
          <button 
            onClick={() => setActiveTab('trainers')}
            className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'trainers' ? 'bg-primary text-slate-950' : 'text-slate-400'}`}
          >
            Trainers
          </button>
          <button 
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'sessions' ? 'bg-primary text-slate-950' : 'text-slate-400'}`}
          >
            Sessions
          </button>
        </div>
      </header>

      {activeTab === 'trainers' ? (
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold">All Trainers</h2>
            <button 
              onClick={() => setShowAddTrainer(true)}
              className="bg-primary text-slate-950 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
            >
              <span className="material-symbols-rounded">add</span> Add Trainer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainers.map(t => (
              <div key={t.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col gap-4">
                <div className="flex gap-4">
                  <img src={t.photo_url && t.photo_url.startsWith('http') ? t.photo_url : `https://picsum.photos/seed/${t.id}/200`} className="w-20 h-20 rounded-xl object-cover" alt="" />
                  <div className="flex-1">
                    <h3 className="font-bold">{t.name}</h3>
                    <p className="text-xs text-slate-400">{t.specialty}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{t.experience} • {t.rate}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <span className="material-symbols-rounded text-primary text-sm">star</span>
                      <span className="text-xs font-bold">{t.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setEditingTrainer(t); setShowEditTrainer(true); }}
                    className="flex-1 py-2 bg-slate-800 rounded-xl text-xs font-bold hover:bg-slate-700 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-rounded text-sm">edit</span> Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteTrainer(t.id)}
                    className="flex-1 py-2 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500/20 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-rounded text-sm">delete</span> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold">Recent Bookings</h2>
            <button 
              onClick={() => setShowAddSession(true)}
              className="bg-primary text-slate-950 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
            >
              <span className="material-symbols-rounded">add</span> Create Session
            </button>
          </div>
          <div className="space-y-4">
            {sessions.map(s => (
              <div key={s.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {s.profiles?.full_name?.[0] || 'U'}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{s.profiles?.full_name || 'User'}</h3>
                    <p className="text-[10px] text-slate-400">Trainer: {s.pt_trainers?.name} • {s.exercise_name}</p>
                    <p className="text-[10px] text-primary font-bold">{s.session_date} @ {s.session_time}</p>
                    {s.due_date && <p className="text-[10px] text-orange-500 font-bold">Due: {s.due_date} (Recurring)</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setEditingSession(s); setShowEditSession(true); }}
                      className="p-1.5 bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                    >
                      <span className="material-symbols-rounded text-sm">edit</span>
                    </button>
                    <button 
                      onClick={() => handleDeleteSession(s.id)}
                      className="p-1.5 bg-red-500/10 rounded-lg text-red-500 hover:bg-red-500/20"
                    >
                      <span className="material-symbols-rounded text-sm">delete</span>
                    </button>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
                    s.status === 'confirmed' ? 'bg-green-500/20 text-green-500' : 
                    s.status === 'pending' ? 'bg-orange-500/20 text-orange-500' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {s.status}
                  </span>
                  {s.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateStatus(s.id, 'confirmed')} className="p-1.5 bg-green-500 rounded-lg text-slate-950">
                        <span className="material-symbols-rounded text-sm">check</span>
                      </button>
                      <button onClick={() => handleUpdateStatus(s.id, 'cancelled')} className="p-1.5 bg-red-500 rounded-lg text-white">
                        <span className="material-symbols-rounded text-sm">close</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {showAddTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">Add New Trainer</h2>
            <div className="space-y-4">
              <input 
                placeholder="Name" 
                value={newTrainer.name}
                onChange={e => setNewTrainer({...newTrainer, name: e.target.value})}
                className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary"
              />
              <input 
                placeholder="Specialty (Strength & Conditioning)" 
                value={newTrainer.specialty}
                onChange={e => setNewTrainer({...newTrainer, specialty: e.target.value})}
                className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary"
              />
              <input 
                placeholder="Experience (e.g. 5yr)" 
                value={newTrainer.experience}
                onChange={e => setNewTrainer({...newTrainer, experience: e.target.value})}
                className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary"
              />
              <input 
                placeholder="Rate (e.g. ₹1500/hr)" 
                value={newTrainer.rate}
                onChange={e => setNewTrainer({...newTrainer, rate: e.target.value})}
                className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary"
              />
              <input 
                placeholder="Photo URL" 
                value={newTrainer.photo_url}
                onChange={e => setNewTrainer({...newTrainer, photo_url: e.target.value})}
                className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary"
              />
              <div className="flex gap-4 mt-4">
                <button onClick={() => setShowAddTrainer(false)} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold">Cancel</button>
                <button onClick={handleAddTrainer} className="flex-1 py-3 bg-primary text-slate-950 rounded-xl font-bold">Add Trainer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditTrainer && editingTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">Edit Trainer</h2>
            <div className="space-y-4">
              <input 
                placeholder="Name" 
                value={editingTrainer.name}
                onChange={e => setEditingTrainer({...editingTrainer, name: e.target.value})}
                className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary"
              />
              <input 
                placeholder="Specialty" 
                value={editingTrainer.specialty}
                onChange={e => setEditingTrainer({...editingTrainer, specialty: e.target.value})}
                className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary"
              />
              <input 
                placeholder="Experience" 
                value={editingTrainer.experience}
                onChange={e => setEditingTrainer({...editingTrainer, experience: e.target.value})}
                className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary"
              />
              <input 
                placeholder="Rate" 
                value={editingTrainer.rate}
                onChange={e => setEditingTrainer({...editingTrainer, rate: e.target.value})}
                className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary"
              />
              <input 
                placeholder="Photo URL" 
                value={editingTrainer.photo_url}
                onChange={e => setEditingTrainer({...editingTrainer, photo_url: e.target.value})}
                className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary"
              />
              <div className="flex gap-4 mt-4">
                <button onClick={() => setShowEditTrainer(false)} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold">Cancel</button>
                <button onClick={handleUpdateTrainer} className="flex-1 py-3 bg-primary text-slate-950 rounded-xl font-bold">Update Trainer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">Create New Session</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Select User</label>
                <select 
                  value={newSession.user_id}
                  onChange={e => setNewSession({...newSession, user_id: e.target.value})}
                  className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary text-white"
                >
                  <option value="">Select a user</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Select Trainer</label>
                <select 
                  value={newSession.trainer_id}
                  onChange={e => setNewSession({...newSession, trainer_id: e.target.value})}
                  className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary text-white"
                >
                  <option value="">Select a trainer</option>
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <input 
                type="date"
                value={newSession.session_date}
                onChange={e => setNewSession({...newSession, session_date: e.target.value})}
                className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary text-white"
              />
              <input 
                type="time"
                value={newSession.session_time}
                onChange={e => setNewSession({...newSession, session_time: e.target.value})}
                className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary text-white"
              />
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Recurring Due Date (Optional)</label>
                <input 
                  type="date"
                  value={newSession.due_date}
                  onChange={e => setNewSession({...newSession, due_date: e.target.value})}
                  className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary text-white"
                />
              </div>
              <input 
                placeholder="Exercise Name" 
                value={newSession.exercise_name}
                onChange={e => setNewSession({...newSession, exercise_name: e.target.value})}
                className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary"
              />
              <div className="flex gap-4 mt-4">
                <button onClick={() => setShowAddSession(false)} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold">Cancel</button>
                <button onClick={handleAddSession} className="flex-1 py-3 bg-primary text-slate-950 rounded-xl font-bold">Create Session</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditSession && editingSession ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">Edit Session</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Select User</label>
                <select 
                  value={editingSession.user_id}
                  onChange={e => setEditingSession({...editingSession, user_id: e.target.value})}
                  className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary text-white"
                >
                  <option value="">Select a user</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Select Trainer</label>
                <select 
                  value={editingSession.trainer_id}
                  onChange={e => setEditingSession({...editingSession, trainer_id: e.target.value})}
                  className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary text-white"
                >
                  <option value="">Select a trainer</option>
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <input 
                type="date"
                value={editingSession.session_date}
                onChange={e => setEditingSession({...editingSession, session_date: e.target.value})}
                className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary text-white"
              />
              <input 
                type="time"
                value={editingSession.session_time}
                onChange={e => setEditingSession({...editingSession, session_time: e.target.value})}
                className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary text-white"
              />
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Recurring Due Date (Optional)</label>
                <input 
                  type="date"
                  value={editingSession.due_date || ''}
                  onChange={e => setEditingSession({...editingSession, due_date: e.target.value})}
                  className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary text-white"
                />
              </div>
              <input 
                placeholder="Exercise Name" 
                value={editingSession.exercise_name}
                onChange={e => setEditingSession({...editingSession, exercise_name: e.target.value})}
                className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary"
              />
              <select 
                value={editingSession.status}
                onChange={e => setEditingSession({...editingSession, status: e.target.value})}
                className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary text-white"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <div className="flex gap-4 mt-4">
                <button onClick={() => setShowEditSession(false)} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold">Cancel</button>
                <button onClick={handleUpdateSession} className="flex-1 py-3 bg-primary text-slate-950 rounded-xl font-bold">Update Session</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminPT;
