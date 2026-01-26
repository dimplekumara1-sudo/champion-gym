
import React, { useEffect, useState, useRef } from 'react';
import StatusBar from '../components/StatusBar';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { AppScreen, Profile } from '../types';
import { supabase } from '../lib/supabase';
import { cache, CACHE_KEYS, CACHE_TTL } from '../lib/cache';

const ProfileScreen: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<any>({});

  // Function to download and cache Google photo to Supabase Storage
  const cacheGooglePhotoToStorage = async (userId: string, googlePhotoUrl: string, profileData: any) => {
    try {
      // Fetch the Google photo with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(googlePhotoUrl, {
        signal: controller.signal,
        headers: { 'Cache-Control': 'max-age=86400' }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('Failed to fetch Google photo');
        setProfilePhoto(googlePhotoUrl); // Fallback to direct Google URL
        return;
      }

      const blob = await response.blob();
      const fileName = `${userId}-google-photo.jpg`;
      const filePath = `profile-photos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, blob, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setProfilePhoto(googlePhotoUrl); // Fallback to direct Google URL
        return;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // Update profile with the cached URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        console.error('Update error:', updateError);
        setProfilePhoto(googlePhotoUrl); // Fallback to direct Google URL
        return;
      }

      setProfilePhoto(publicUrl);
      // Update cache
      const updatedProfile = { ...profileData, avatar_url: publicUrl };
      cache.set(CACHE_KEYS.PROFILE_DATA, updatedProfile, CACHE_TTL.LONG);
      setProfile(updatedProfile);
    } catch (error) {
      console.error('Error caching Google photo:', error);
      // Fallback: show placeholder or Google URL with fallback styling
      setPhotoError(true);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Check cache first
        const cachedProfile = cache.get<Profile>(CACHE_KEYS.PROFILE_DATA);
        if (cachedProfile) {
          setProfile(cachedProfile);
          if (cachedProfile.avatar_url) {
            setProfilePhoto(cachedProfile.avatar_url);
          }
          // Check if phone number is missing
          if (!cachedProfile.phone_number) {
            setShowPhoneModal(true);
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
            setEditData(profileData);
            // Cache for 15 minutes
            cache.set(CACHE_KEYS.PROFILE_DATA, profileData, CACHE_TTL.LONG);

            if (profileData.avatar_url) {
              setProfilePhoto(profileData.avatar_url);
            } else if (user.user_metadata?.avatar_url) {
              // If user has Google photo but no stored avatar_url, cache it to Supabase Storage
              cacheGooglePhotoToStorage(user.id, user.user_metadata.avatar_url, profileData);
            }

            // Check if phone number is missing
            if (!profileData.phone_number) {
              setShowPhoneModal(true);
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

  const handlePhoneNumberSave = async (phoneNumber: string) => {
    try {
      if (!phoneNumber || phoneNumber.trim() === '') {
        alert('Please enter a valid phone number');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ phone_number: phoneNumber })
        .eq('id', user?.id);

      if (error) throw error;

      const updatedProfile = { ...profile, phone_number: phoneNumber };
      setProfile(updatedProfile);
      cache.set(CACHE_KEYS.PROFILE_DATA, updatedProfile, CACHE_TTL.LONG);
      setShowPhoneModal(false);
      alert('Phone number saved!');
    } catch (error) {
      console.error('Error saving phone number:', error);
      alert('Failed to save phone number');
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editData.full_name,
          phone_number: editData.phone_number,
          gender: editData.gender,
          height: editData.height,
          weight: editData.weight,
          target_weight: editData.target_weight,
        })
        .eq('id', user?.id);

      if (error) throw error;

      setProfile(editData);
      cache.set(CACHE_KEYS.PROFILE_DATA, editData, CACHE_TTL.LONG);
      setShowEditModal(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    }
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
              {profilePhoto && !photoError ? (
                <img
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover shadow-2xl bg-slate-800"
                  src={profilePhoto}
                  onError={() => setPhotoError(true)}
                  crossOrigin="anonymous"
                />
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
          <button
            onClick={() => {
              setEditData(profile);
              setShowEditModal(true);
            }}
            className="px-8 py-3 bg-[#151C2C] border border-[#1E293B] rounded-2xl text-sm font-black active:scale-95 transition-transform shadow-xl"
          >Edit Profile</button>
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

      {/* Phone Number Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-[#090E1A] w-full max-w-sm rounded-3xl overflow-hidden border border-[#1E293B] shadow-2xl p-6">
            <h2 className="text-xl font-black text-white mb-2">Add Phone Number</h2>
            <p className="text-sm text-slate-400 mb-6">We need your phone number to complete your profile</p>

            <input
              type="tel"
              placeholder="Enter your phone number"
              className="w-full bg-[#151C2C] border border-[#1E293B] rounded-2xl text-white px-4 py-3 mb-6 outline-none focus:ring-2 focus:ring-primary"
              defaultValue={profile?.phone_number || ''}
              id="phoneInput"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowPhoneModal(false)}
                className="flex-1 py-3 bg-[#151C2C] border border-[#1E293B] rounded-2xl text-white font-bold hover:bg-[#1E293B] transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  const phoneInput = document.getElementById('phoneInput') as HTMLInputElement;
                  handlePhoneNumberSave(phoneInput?.value);
                }}
                className="flex-1 py-3 bg-primary text-slate-900 rounded-2xl font-bold hover:bg-green-600 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-[#090E1A] w-full max-w-sm rounded-3xl overflow-hidden border border-[#1E293B] shadow-2xl p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white">Edit Profile</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={editData?.full_name || ''}
                  onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                  className="w-full bg-[#151C2C] border border-[#1E293B] rounded-xl text-white px-4 py-3 mt-2 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Phone Number</label>
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={editData?.phone_number || ''}
                  onChange={(e) => setEditData({ ...editData, phone_number: e.target.value })}
                  className="w-full bg-[#151C2C] border border-[#1E293B] rounded-xl text-white px-4 py-3 mt-2 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gender</label>
                <select
                  value={editData?.gender || ''}
                  onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                  className="w-full bg-[#151C2C] border border-[#1E293B] rounded-xl text-white px-4 py-3 mt-2 outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Height (cm)</label>
                <input
                  type="number"
                  placeholder="Height in cm"
                  value={editData?.height || ''}
                  onChange={(e) => setEditData({ ...editData, height: e.target.value })}
                  className="w-full bg-[#151C2C] border border-[#1E293B] rounded-xl text-white px-4 py-3 mt-2 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Weight (kg)</label>
                <input
                  type="number"
                  placeholder="Weight in kg"
                  value={editData?.weight || ''}
                  onChange={(e) => setEditData({ ...editData, weight: e.target.value })}
                  className="w-full bg-[#151C2C] border border-[#1E293B] rounded-xl text-white px-4 py-3 mt-2 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Target Weight (kg)</label>
                <input
                  type="number"
                  placeholder="Target weight in kg"
                  value={editData?.target_weight || ''}
                  onChange={(e) => setEditData({ ...editData, target_weight: e.target.value })}
                  className="w-full bg-[#151C2C] border border-[#1E293B] rounded-xl text-white px-4 py-3 mt-2 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-3 bg-[#151C2C] border border-[#1E293B] rounded-2xl text-white font-bold hover:bg-[#1E293B] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex-1 py-3 bg-primary text-slate-900 rounded-2xl font-bold hover:bg-green-600 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="STATS" onNavigate={onNavigate} />
    </div>
  );
};

export default ProfileScreen;
