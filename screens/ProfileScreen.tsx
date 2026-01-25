
import React, { useEffect, useState, useRef } from 'react';
import StatusBar from '../components/StatusBar';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { AppScreen } from '../types';
import { supabase } from '../lib/supabase';
import { cache, CACHE_KEYS, CACHE_TTL } from '../lib/cache';

const ProfileScreen: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Check cache first
        const cachedProfile = cache.get(CACHE_KEYS.PROFILE_DATA);
        if (cachedProfile) {
          setProfile(cachedProfile);
          if (cachedProfile.avatar_url) {
            setProfilePhoto(cachedProfile.avatar_url);
          }
        } else {
          // Fetch from Supabase only if not cached
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileData) {
            setProfile(profileData);
            // Cache for 15 minutes
            cache.set(CACHE_KEYS.PROFILE_DATA, profileData, CACHE_TTL.LONG);
            if (profileData.avatar_url) {
              setProfilePhoto(profileData.avatar_url);
            }
          }
        }
      }
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onNavigate('SPLASH');
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      const userId = user?.id;
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `profile-photos/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Update cache with new profile data
      const updatedProfile = { ...profile, avatar_url: publicUrl };
      cache.set(CACHE_KEYS.PROFILE_DATA, updatedProfile, CACHE_TTL.LONG);

      setProfilePhoto(publicUrl);
      alert('Profile photo updated successfully!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const calculateBMI = (w: number, h: number) => {
    if (!w || !h) return 0;
    const heightInMeters = h / 100;
    return parseFloat((w / (heightInMeters * heightInMeters)).toFixed(1));
  };

  const bmi = calculateBMI(profile?.weight, profile?.height);

  return (
    <div className="pb-32 min-h-screen bg-[#090E1A] text-white">
      <StatusBar />
      <Header onProfileClick={() => onNavigate('DASHBOARD')} />

      <main className="px-6">
        <section className="flex flex-col items-center mb-10 text-center">
          <div className="relative mb-4">
            <div className="w-28 h-28 rounded-full border-4 border-primary/20 p-1">
              {profilePhoto ? (
                <img alt="Profile" className="w-full h-full rounded-full object-cover shadow-2xl bg-slate-800" src={profilePhoto} />
              ) : (
                <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center">
                  <span className="material-symbols-rounded text-4xl text-slate-600">account_circle</span>
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 bg-primary text-slate-900 p-2 rounded-full shadow-lg border-4 border-[#090E1A] hover:bg-green-600 disabled:opacity-50 transition-all"
            >
              <span className="material-symbols-rounded text-sm font-bold block">{uploading ? 'cloud_upload' : 'edit'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
              className="hidden"
            />
          </div>
          <h1 className="text-3xl font-black mb-1 tracking-tight">{profile?.full_name || user?.user_metadata?.full_name || 'User'}</h1>
          <p className="text-slate-500 font-bold text-sm mb-5 uppercase tracking-widest">{user?.email}</p>
          <button className="px-8 py-3 bg-[#151C2C] border border-[#1E293B] rounded-2xl text-sm font-black active:scale-95 transition-transform shadow-xl">Edit Profile</button>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-black mb-4 px-1 tracking-tight">Body Stats</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Height', val: profile?.height || '0', unit: 'cm', icon: 'height' },
              { label: 'Weight', val: profile?.weight || '0', unit: 'kg', icon: 'monitor_weight' },
              { label: 'BMI', val: bmi || '0.0', unit: '', icon: 'speed' },
            ].map((stat, i) => (
              <div key={i} className="bg-[#151C2C] border border-[#1E293B] p-5 rounded-3xl flex flex-col items-center text-center shadow-lg">
                <span className="material-symbols-rounded text-primary mb-3 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{stat.label}</span>
                <span className="text-lg font-black">{stat.val}<span className="text-[11px] text-slate-500 ml-0.5">{stat.unit}</span></span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4 mb-12">
          <button
            onClick={() => onNavigate('WORKOUT_PROGRAM')}
            className="w-full flex items-center justify-between p-6 bg-primary/10 border-2 border-primary/20 rounded-3xl active:bg-primary/20 transition-all shadow-xl shadow-primary/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="material-symbols-rounded text-slate-950 font-black">fitness_center</span>
              </div>
              <div className="text-left">
                <span className="font-black text-white block text-lg">My Workout Program</span>
                <span className="text-xs font-bold text-primary uppercase tracking-widest">Personalised Plan</span>
              </div>
            </div>
            <span className="material-symbols-rounded text-primary font-black">chevron_right</span>
          </button>

          {[
            { label: 'Subscription Details', icon: 'card_membership', color: 'text-blue-400', bg: 'bg-blue-500/10', screen: 'SUBSCRIPTION_DETAILS' as AppScreen },
            { label: 'Workout History', icon: 'history', color: 'text-orange-400', bg: 'bg-orange-500/10', screen: 'WORKOUT_HISTORY' as AppScreen },
            { label: 'Settings', icon: 'settings', color: 'text-slate-400', bg: 'bg-slate-800' },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => item.screen && onNavigate(item.screen)}
              className="w-full flex items-center justify-between p-5 bg-[#151C2C] rounded-[2rem] border border-[#1E293B] active:bg-[#1E293B] transition-colors shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-2xl ${item.bg} flex items-center justify-center`}>
                  <span className={`material-symbols-rounded ${item.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                </div>
                <span className="font-black text-[15px]">{item.label}</span>
              </div>
              <span className="material-symbols-rounded text-slate-500">chevron_right</span>
            </button>
          ))}

          {profile?.role === 'admin' && (
            <button
              onClick={() => onNavigate('ADMIN_DASHBOARD')}
              className="w-full flex items-center justify-between p-6 bg-red-500/10 border-2 border-red-500/20 rounded-3xl active:bg-red-500/20 transition-all shadow-xl shadow-red-500/5 mt-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                  <span className="material-symbols-rounded text-white font-black">admin_panel_settings</span>
                </div>
                <div className="text-left">
                  <span className="font-black text-white block text-lg">Admin Dashboard</span>
                  <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Management Suite</span>
                </div>
              </div>
              <span className="material-symbols-rounded text-red-500 font-black">chevron_right</span>
            </button>
          )}
        </section>

        <button
          onClick={handleLogout}
          className="w-full py-5 rounded-3xl bg-red-500/10 text-red-500 font-black flex items-center justify-center gap-2 active:scale-95 transition-transform mb-12"
        >
          <span className="material-symbols-rounded font-black">logout</span>
          Logout
        </button>
      </main>

      <BottomNav active="STATS" onNavigate={onNavigate} />
    </div>
  );
};

export default ProfileScreen;
