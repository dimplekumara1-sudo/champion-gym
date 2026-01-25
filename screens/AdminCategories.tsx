
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';

const AdminCategories: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workout_categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name) return alert('Name is required');
    try {
      const catData = { name, icon, image_url: imageUrl, is_active: isActive };
      if (editingCategory?.id) {
        await supabase.from('workout_categories').update(catData).eq('id', editingCategory.id);
      } else {
        await supabase.from('workout_categories').insert(catData);
      }
      setEditingCategory(null);
      resetForm();
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const resetForm = () => {
    setName('');
    setIcon('');
    setImageUrl('');
    setIsActive(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-20">
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="material-symbols-rounded">arrow_back</button>
          <h1 className="text-xl font-bold">Manage Categories</h1>
        </div>
        <button
          onClick={() => { resetForm(); setEditingCategory({}); }}
          className="bg-primary text-slate-900 px-4 py-2 rounded-xl text-xs font-black uppercase"
        >
          Add Category
        </button>
      </header>

      <main className="p-6">
        <div className="grid gap-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : categories.map(cat => (
            <div key={cat.id} className="bg-slate-800 p-4 rounded-3xl border border-slate-700 flex items-center gap-4">
              <img src={cat.image_url} className="w-16 h-16 rounded-2xl object-cover" alt="" />
              <div className="flex-1">
                <h3 className="font-bold">{cat.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                  <span className="material-symbols-rounded text-sm">{cat.icon}</span>
                  {cat.icon}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded text-center ${cat.is_active ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-slate-500'}`}>
                  {cat.is_active ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => {
                    setEditingCategory(cat);
                    setName(cat.name);
                    setIcon(cat.icon || '');
                    setImageUrl(cat.image_url || '');
                    setIsActive(cat.is_active);
                  }}
                  className="bg-slate-700 p-2 rounded-xl"
                >
                  <span className="material-symbols-rounded text-sm">edit</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {editingCategory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] p-6 flex items-center justify-center">
          <div className="bg-slate-800 rounded-[2.5rem] p-8 w-full max-w-sm border border-slate-700">
            <h2 className="text-xl font-bold mb-6">Category Editor</h2>
            <div className="space-y-4 mb-8">
              <input
                placeholder="Category Name"
                className="w-full bg-slate-900 border-none rounded-2xl p-4 text-sm"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <input
                placeholder="Icon Name (Material Symbol)"
                className="w-full bg-slate-900 border-none rounded-2xl p-4 text-sm"
                value={icon}
                onChange={e => setIcon(e.target.value)}
              />
              <input
                placeholder="Image URL"
                className="w-full bg-slate-900 border-none rounded-2xl p-4 text-sm"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
              />
              <div className="flex items-center gap-3 bg-slate-900 p-4 rounded-2xl">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                />
                <label htmlFor="isActive" className="text-sm font-bold text-slate-400">Active</label>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditingCategory(null)} className="flex-1 bg-slate-700 py-4 rounded-2xl font-black uppercase text-xs">Cancel</button>
              <button onClick={handleSave} className="flex-1 bg-primary text-slate-900 py-4 rounded-2xl font-black uppercase text-xs">Save</button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-lg border-t border-slate-800 px-6 py-3 pb-6 flex justify-between items-center z-40 max-w-[430px] mx-auto">
        <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-rounded">dashboard</span>
          <span className="text-[10px] font-bold">Dashboard</span>
        </button>
        <button onClick={() => onNavigate('ADMIN_EXERCISES')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-rounded">fitness_center</span>
          <span className="text-[10px] font-bold">Exercises</span>
        </button>
        <button onClick={() => onNavigate('ADMIN_WORKOUTS')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-rounded">sports_gymnastics</span>
          <span className="text-[10px] font-bold">Workouts</span>
        </button>
        <button onClick={() => onNavigate('ADMIN_PLANS')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-rounded">card_membership</span>
          <span className="text-[10px] font-bold">Plans</span>
        </button>
        <button onClick={() => onNavigate('ADMIN_CATEGORIES')} className="flex flex-col items-center gap-1 text-primary transition-colors">
          <span className="material-symbols-rounded">category</span>
          <span className="text-[10px] font-bold">Categories</span>
        </button>
      </nav>
    </div>
  );
};

export default AdminCategories;
