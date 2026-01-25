import React, { useState, useEffect } from 'react';
import StatusBar from '../components/StatusBar';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';

const GooglePasswordSetup: React.FC<{ onComplete: () => void, onSkip: () => void }> = ({ onComplete, onSkip }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, []);

    const validatePassword = () => {
        if (!password || !confirmPassword) {
            setError('Please fill in all fields');
            return false;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return false;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return false;
        }

        // Check password strength
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*]/.test(password);

        if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
            setError('Password must contain uppercase, lowercase, and numbers');
            return false;
        }

        return true;
    };

    const handleSetPassword = async () => {
        try {
            if (!validatePassword()) return;

            setLoading(true);
            setError(null);

            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) throw updateError;

            setSuccess(true);
            setTimeout(() => {
                onComplete();
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'Failed to set password');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[#090E1A] flex flex-col">
            <StatusBar />

            <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800">
                <h1 className="text-lg font-bold text-white">Secure Your Account</h1>
                <button
                    onClick={onSkip}
                    className="text-slate-400 hover:text-white transition-colors text-sm font-semibold"
                >
                    Skip for Now
                </button>
            </header>

            <main className="flex-1 px-6 py-8 flex flex-col">
                {/* Illustration */}
                <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                    <span className="material-symbols-rounded text-4xl text-primary">lock</span>
                </div>

                {/* Content */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-white mb-3 leading-tight">Create a Password</h2>
                    <p className="text-slate-400 text-sm">
                        You're currently logged in with Google. Create a password to unify your login and access your account securely with email.
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl text-sm mb-6 font-medium">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-rounded text-lg">error</span>
                            {error}
                        </div>
                    </div>
                )}

                {/* Success Message */}
                {success && (
                    <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-2xl text-sm mb-6 font-medium">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-rounded text-lg">check_circle</span>
                            Password set successfully!
                        </div>
                    </div>
                )}

                {/* Form */}
                <form className="space-y-5 mb-8" onSubmit={(e) => { e.preventDefault(); handleSetPassword(); }}>
                    {/* Password Field */}
                    <div>
                        <label className="text-white text-sm font-semibold block mb-2">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                                placeholder="Min 8 chars, uppercase, lowercase, numbers"
                                className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl h-12 px-4 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-500 text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                            >
                                <span className="material-symbols-rounded text-lg">
                                    {showPassword ? 'visibility' : 'visibility_off'}
                                </span>
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2 font-medium">
                            ✓ At least 8 characters
                            <br />✓ Contains uppercase & lowercase
                            <br />✓ Contains numbers
                        </p>
                    </div>

                    {/* Confirm Password Field */}
                    <div>
                        <label className="text-white text-sm font-semibold block mb-2">Confirm Password</label>
                        <div className="relative">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                                placeholder="Re-enter your password"
                                className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl h-12 px-4 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-500 text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                            >
                                <span className="material-symbols-rounded text-lg">
                                    {showConfirm ? 'visibility' : 'visibility_off'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Password Match Indicator */}
                    {password && confirmPassword && (
                        <div className={`text-xs font-semibold p-3 rounded-lg flex items-center gap-2 ${password === confirmPassword
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}>
                            <span className="material-symbols-rounded text-sm">
                                {password === confirmPassword ? 'check_circle' : 'cancel'}
                            </span>
                            {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                        </div>
                    )}
                </form>

                {/* Benefits */}
                <div className="bg-slate-800/30 rounded-2xl p-5 mb-8 border border-slate-700">
                    <h3 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
                        <span className="material-symbols-rounded text-lg text-primary">check_circle</span>
                        Why create a password?
                    </h3>
                    <ul className="space-y-2 text-xs text-slate-300">
                        <li className="flex items-center gap-2">
                            <span className="w-1 h-1 bg-primary rounded-full"></span>
                            Login with email and password
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1 h-1 bg-primary rounded-full"></span>
                            Secure account access anytime
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1 h-1 bg-primary rounded-full"></span>
                            Easy account recovery
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1 h-1 bg-primary rounded-full"></span>
                            Better security control
                        </li>
                    </ul>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 mt-auto">
                    <button
                        onClick={handleSetPassword}
                        disabled={loading || !password || !confirmPassword || success}
                        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black py-3 rounded-xl transition-all active:scale-95"
                    >
                        {loading ? 'Setting Password...' : success ? 'Password Set!' : 'Create Password'}
                    </button>
                    <button
                        onClick={onSkip}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-all"
                    >
                        Skip for Now
                    </button>
                </div>

                {/* Info Message */}
                <p className="text-[11px] text-slate-500 text-center mt-6 font-medium">
                    You can set up a password anytime from your profile settings.
                </p>
            </main>
        </div>
    );
};

export default GooglePasswordSetup;
