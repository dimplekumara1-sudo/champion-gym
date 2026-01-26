
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const LoginScreen: React.FC<{ onLogin: () => void, onSignUp: () => void }> = ({ onLogin, onSignUp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      onLogin();
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
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
    <div className="min-h-screen flex flex-col">
      <div className="relative w-full h-[320px] shrink-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `linear-gradient(180deg, rgba(16, 34, 22, 0.2) 0%, rgba(16, 34, 22, 1) 100%), url("https://picsum.photos/seed/gym/800/600")` }}
        ></div>
        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="material-symbols-rounded text-slate-900 font-bold">fitness_center</span>
            </div>
            <span className="text-xl font-bold tracking-tight">Challenge GYM</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight">Welcome <br />Back</h1>
        </div>
      </div>

      <div className="flex-1 px-6 pt-2 pb-8 flex flex-col bg-background-dark">
        <h2 className="text-slate-400 text-sm font-medium mb-6">Log in to track your progress</h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-8">
          <div>
            <p className="text-white text-sm font-medium pb-2">Email</p>
            <input
              className="w-full rounded-lg text-white border border-slate-700 bg-slate-800/50 focus:border-primary focus:ring-1 focus:ring-primary h-14 p-4 placeholder:text-slate-500"
              placeholder="Enter your email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <p className="text-white text-sm font-medium pb-2">Password</p>
            <div className="relative">
              <input
                className="w-full rounded-lg text-white border border-slate-700 bg-slate-800/50 focus:border-primary focus:ring-1 focus:ring-primary h-14 p-4 pr-12 placeholder:text-slate-500"
                placeholder="Enter your password"
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
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-primary text-slate-900 font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all mb-6 disabled:opacity-50"
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-[1px] flex-1 bg-slate-800"></div>
          <span className="text-slate-500 text-xs font-medium uppercase tracking-widest">Or</span>
          <div className="h-[1px] flex-1 bg-slate-800"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-slate-800 border border-slate-700 text-white font-medium py-4 rounded-xl flex items-center justify-center gap-3 active:scale-[0.98] mb-12 disabled:opacity-50"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Continue with Google
        </button>

        <div className="mt-auto text-center">
          <p className="text-slate-400 text-sm">
            New here?
            <button onClick={onSignUp} className="text-primary font-semibold ml-1 hover:underline">Create an Account</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
