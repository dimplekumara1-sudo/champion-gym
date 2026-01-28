
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen, Announcement } from '../types';

const AdminAnnouncements: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Partial<Announcement> | null>(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title || !content) return alert('Title and Content are required');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const announcementData = { 
        title, 
        content, 
        priority, 
        is_active: isActive,
        created_by: user?.id
      };

      if (editingAnnouncement?.id) {
        const { error } = await supabase
          .from('announcements')
          .update(announcementData)
          .eq('id', editingAnnouncement.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert([announcementData]);
        if (error) throw error;
      }
      
      setEditingAnnouncement(null);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      alert('Failed to save announcement');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setPriority('medium');
    setIsActive(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-20">
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="material-symbols-rounded">arrow_back</button>
          <h1 className="text-xl font-bold">Gym Announcements</h1>
        </div>
        <button
          onClick={() => { resetForm(); setEditingAnnouncement({}); }}
          className="bg-primary text-slate-900 px-4 py-2 rounded-xl text-xs font-black uppercase"
        >
          New Broadcast
        </button>
      </header>

      <main className="p-6">
        <div className="grid gap-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-20 bg-slate-800/50 rounded-[2.5rem] border border-dashed border-slate-700">
              <span className="material-symbols-rounded text-5xl text-slate-600 mb-4 block">campaign</span>
              <p className="text-slate-400 font-medium">No announcements yet</p>
            </div>
          ) : announcements.map(ann => (
            <div key={ann.id} className="bg-slate-800 p-5 rounded-3xl border border-slate-700">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    ann.priority === 'high' ? 'bg-red-500' : 
                    ann.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                  }`}></span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{ann.priority} Priority</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingAnnouncement(ann);
                      setTitle(ann.title);
                      setContent(ann.content);
                      setPriority(ann.priority);
                      setIsActive(ann.is_active);
                    }}
                    className="bg-slate-700/50 p-2 rounded-lg text-slate-400 hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-rounded text-sm">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="bg-slate-700/50 p-2 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <span className="material-symbols-rounded text-sm">delete</span>
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-lg mb-1">{ann.title}</h3>
              <p className="text-sm text-slate-400 line-clamp-2 mb-4">{ann.content}</p>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-[10px] text-slate-500 font-bold uppercase">{new Date(ann.created_at).toLocaleDateString()}</span>
                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${ann.is_active ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-slate-500'}`}>
                  {ann.is_active ? 'Live' : 'Draft'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {editingAnnouncement && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] p-6 flex items-center justify-center">
          <div className="bg-slate-800 rounded-[2.5rem] p-8 w-full max-w-sm border border-slate-700 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{editingAnnouncement.id ? 'Edit' : 'New'} Announcement</h2>
              <button onClick={() => setEditingAnnouncement(null)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="space-y-6 mb-8">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4 mb-1 block">Title</label>
                <input
                  placeholder="Announcement title"
                  className="w-full bg-slate-900 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4 mb-1 block">Content</label>
                <textarea
                  placeholder="Announcement message..."
                  rows={4}
                  className="w-full bg-slate-900 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4 mb-1 block">Priority Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                        priority === p ? 'bg-primary text-slate-900 border-primary' : 'bg-slate-900 text-slate-500 border-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl">
                <label className="text-sm font-bold text-slate-400">Published Status</label>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEditingAnnouncement(null)} className="flex-1 bg-slate-700/50 hover:bg-slate-700 py-4 rounded-2xl font-black uppercase text-xs transition-colors">Cancel</button>
              <button onClick={handleSave} className="flex-1 bg-primary text-slate-900 py-4 rounded-2xl font-black uppercase text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">Save & Broadcast</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnnouncements;
