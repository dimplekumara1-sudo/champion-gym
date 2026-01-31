import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { cache, CACHE_KEYS, CACHE_TTL } from '../lib/cache';
import { PlanNotification } from '../lib/notifications';
import { PushNotification } from '../lib/push-notifications';

interface HeaderProps {
    onProfileClick?: () => void;
    notifications?: PlanNotification[];
    pushNotifications?: PushNotification[];
    unreadCount?: number;
    onNotificationsClick?: () => void;
    onPushNotificationsClick?: () => void;
    onBMIInfoClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    onProfileClick, 
    notifications = [], 
    pushNotifications = [], 
    unreadCount = 0, 
    onNotificationsClick,
    onPushNotificationsClick,
    onBMIInfoClick
}) => {
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const [photoError, setPhotoError] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Function to validate Google photo URL without direct fetching
    const validateGooglePhotoUrl = (url: string): boolean => {
        if (!url || typeof url !== 'string') return false;
        
        // Check if it's a Google photos URL
        const googlePhotoPatterns = [
            /lh3\.googleusercontent\.com/,
            /photos\.google\.com/,
            /googleusercontent\.com/
        ];
        
        return googlePhotoPatterns.some(pattern => pattern.test(url));
    };

    // Function to handle photo errors with retry logic
    const handlePhotoError = () => {
        setPhotoError(true);
        // Retry after 3 seconds
        setTimeout(() => {
            setPhotoError(false);
            // Try to reload the photo
            if (profilePhoto) {
                const img = new Image();
                img.src = profilePhoto;
                img.onload = () => {
                    setPhotoError(false);
                };
                img.onerror = () => {
                    setPhotoError(true);
                };
            }
        }, 3000);
    };

    useEffect(() => {
        const initializeProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                const googlePhoto = user.user_metadata?.avatar_url;
                const cachedProfile = cache.get(CACHE_KEYS.PROFILE_DATA) as any;

                // Use Google photo directly if valid
                if (googlePhoto && validateGooglePhotoUrl(googlePhoto)) {
                    setProfilePhoto(googlePhoto);
                    setPhotoError(false);
                    console.log('Using Google photo URL directly:', googlePhoto);
                } 
                // Use cached photo if available and not Google photo
                else if (cachedProfile?.avatar_url && cachedProfile.avatar_url.includes('supabase')) {
                    setProfilePhoto(cachedProfile.avatar_url);
                    setPhotoError(false);
                    console.log('Using cached profile photo:', cachedProfile.avatar_url);
                }
                // Fetch from profiles table if no cached photo and not Google photo
                else {
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('avatar_url')
                        .eq('id', user.id)
                        .single();

                    if (profileData?.avatar_url && profileData.avatar_url.includes('supabase')) {
                        setProfilePhoto(profileData.avatar_url);
                        setPhotoError(false);
                        console.log('Fetched profile photo from database:', profileData.avatar_url);

                        // Update cache with new photo
                        const updatedProfile = { ...cachedProfile, avatar_url: profileData.avatar_url };
                        cache.set(CACHE_KEYS.PROFILE_DATA, updatedProfile, CACHE_TTL.LONG);
                    } else {
                        setProfilePhoto(null);
                        setPhotoError(false);
                        console.log('No profile photo found');
                    }
                }
            }
        };

        initializeProfile();

        const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser(session.user);
                initializeProfile();
            }
        });

        return () => {
            if (subscription?.subscription) {
                subscription.subscription.unsubscribe();
            }
        };
    });

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            const file = event.target.files?.[0];
            if (!file || !user) return;

            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                setUploading(false);
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB');
                setUploading(false);
                return;
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
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
                .eq('id', user.id);

            if (updateError) throw updateError;

            // Update cache
            const cachedProfile = cache.get(CACHE_KEYS.PROFILE_DATA) as any;
            const updatedProfile = { ...cachedProfile, avatar_url: publicUrl };
            cache.set(CACHE_KEYS.PROFILE_DATA, updatedProfile, CACHE_TTL.LONG);

            setProfilePhoto(publicUrl);
            console.log('Photo uploaded successfully:', publicUrl);
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

    const handlePhotoClick = () => {
        // If user has Google photo, show profile. Otherwise, allow upload.
        if (user?.user_metadata?.avatar_url) {
            onProfileClick?.();
        } else {
            fileInputRef.current?.click();
        }
    };

    return (
        <header className="px-6 py-4 flex items-center justify-between bg-gradient-to-b from-[#090E1A] to-[#0a0f1a]/80 backdrop-blur-sm border-b border-white/5">
            <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                    <span className="material-symbols-rounded text-slate-900 font-bold text-lg">fitness_center</span>
                </div>
                <div>
                    <h1 className="text-sm font-black tracking-tight leading-none">Challenge Gym</h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Elite Coach</p>
                </div>
            </div>

            <div className="flex items-center gap-6">
                {/* Plan Notifications Bell */}
                {notifications && notifications.length > 0 && (
                    <button
                        onClick={onNotificationsClick}
                        className="relative transition-transform active:scale-95"
                        title="View plan notifications"
                    >
                        <span className="material-symbols-rounded text-slate-400 hover:text-primary transition-colors">campaign</span>
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black h-5 w-5 rounded-full flex items-center justify-center">
                            {notifications.length > 9 ? '9+' : notifications.length}
                        </span>
                    </button>
                )}

                {/* Push Notifications Bell */}
                <button
                    onClick={onPushNotificationsClick}
                    className="relative transition-transform active:scale-95"
                    title="View notifications"
                >
                    <span className="material-symbols-rounded text-slate-400 hover:text-purple-400 transition-colors">notifications</span>
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-[9px] font-black h-5 w-5 rounded-full flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            </div>

            <div className="w-4"></div>

            {/* Profile Photo Button */}
            <button
                onClick={handlePhotoClick}
                disabled={uploading}
                className="relative group cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
                title={user?.user_metadata?.avatar_url ? 'View Profile' : 'Upload Photo'}
            >
                <div className="w-12 h-12 rounded-full border-2 border-primary/30 group-hover:border-primary/60 transition-colors overflow-hidden bg-slate-800 flex items-center justify-center">
                    {profilePhoto && !photoError ? (
                        <img
                            src={profilePhoto}
                            alt="Profile"
                            className="w-full h-full object-cover"
                            onError={handlePhotoError}
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            loading="lazy"
                        />
                    ) : (
                        <span className="material-symbols-rounded text-slate-600 text-xl">account_circle</span>
                    )}
                </div>

                {/* Upload indicator for non-Google photos */}
                {!user?.user_metadata?.avatar_url && !profilePhoto && (
                    <div className="absolute -bottom-1 -right-1 bg-primary text-slate-900 p-1.5 rounded-full shadow-lg border-2 border-[#090E1A]">
                        <span className="material-symbols-rounded text-sm font-bold block" style={{ fontSize: '14px' }}>
                            {uploading ? 'cloud_upload' : 'add'}
                        </span>
                    </div>
                )}
            </button>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploading}
                className="hidden"
            />
        </header>
    );
};

export default Header;