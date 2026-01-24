
import React, { useState } from 'react';
import StatusBar from '../components/StatusBar';
import { supabase } from '../lib/supabase';

const SignupScreen: React.FC<{ onSignup: () => void, onSignIn: () => void }> = ({ onSignup, onSignIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;
      
      if (data.user && !data.session) {
        setError('Please check your email to confirm your account.');
      } else {
        onSignup();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'An error occurred during Google login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <StatusBar />
      <header className="flex items-center p-4 justify-between">
        <button onClick={onSignIn} className="text-white flex size-12 items-center">
          <span className="material-symbols-rounded">arrow_back_ios</span>
        </button>
        <h2 className="text-white text-lg font-bold flex-1 text-center pr-12">Create Account</h2>
      </header>

      <div className="px-6 pt-6 pb-2">
        <h1 className="text-white text-[32px] font-bold">Join the Club</h1>
        <p className="text-slate-400 text-base mt-2">Start your fitness journey today.</p>
      </div>

      <div className="px-6 py-6 space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        <div>
          <p className="text-white text-sm font-medium pb-2">Full Name</p>
          <input 
            className="w-full rounded-lg bg-slate-800 border-slate-700 h-14 p-4 text-white" 
            placeholder="Enter full name" 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div>
          <p className="text-white text-sm font-medium pb-2">Email Address</p>
          <input 
            className="w-full rounded-lg bg-slate-800 border-slate-700 h-14 p-4 text-white" 
            placeholder="Enter email" 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <p className="text-white text-sm font-medium pb-2">Password</p>
          <div className="relative">
            <input 
              className="w-full rounded-lg bg-slate-800 border-slate-700 h-14 p-4 pr-12 text-white" 
              placeholder="Create password" 
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-rounded">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>
        
        <button 
          onClick={handleSignup}
          disabled={loading}
          className="w-full bg-primary text-slate-900 font-bold py-4 rounded-xl text-lg mt-4 active:scale-95 transition-transform disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

        <div className="flex items-center gap-4 my-6">
          <div className="h-[1px] flex-1 bg-slate-800"></div>
          <span className="text-slate-500 text-xs font-medium uppercase tracking-widest">Or</span>
          <div className="h-[1px] flex-1 bg-slate-800"></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-slate-800 border border-slate-700 text-white font-medium py-4 rounded-xl flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Continue with Google
        </button>
      </div>

      <div className="mt-auto pb-10 flex flex-col items-center">
        <div className="flex gap-1">
          <p className="text-slate-400">Already have an account?</p>
          <button onClick={onSignIn} className="text-primary font-bold">Sign In</button>
        </div>
      </div>
    </div>
  );
};

export default SignupScreen;
