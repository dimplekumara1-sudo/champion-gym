
import React, { useEffect, useState } from 'react';
import StatusBar from '../components/StatusBar';
import { supabase } from '../lib/supabase';

interface ApplicationStatusProps {
  onBack: () => void;
  onHome: () => void;
}

const ApplicationStatus: React.FC<ApplicationStatusProps> = ({ onBack, onHome }) => {
  const [status, setStatus] = useState<string>('pending');
  const [loading, setLoading] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let pollInterval: NodeJS.Timeout;

    const initializeStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !isMounted) return;

        // Check if user already approved - if so, skip this page entirely
        const sessionApproved = sessionStorage.getItem(`approved_${session.user.id}`);
        if (sessionApproved === 'true') {
          setHasRedirected(true);
          onHome();
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('approval_status')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;

        const userStatus = data?.approval_status || 'pending';
        if (isMounted) {
          setStatus(userStatus);

          // Auto-redirect only once if approved
          if (userStatus === 'approved' && !hasRedirected) {
            setHasRedirected(true);
            sessionStorage.setItem(`approved_${session.user.id}`, 'true');
            setTimeout(() => onHome(), 500);
          }
        }
      } catch (error) {
        console.error('Error fetching approval status:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeStatus();

    // Only poll if not yet approved and still mounted
    if (!hasRedirected) {
      pollInterval = setInterval(() => {
        if (isMounted) {
          initializeStatus();
        }
      }, 10000); // Poll every 10 seconds instead of 5
    }

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [hasRedirected, onHome]);

  const fetchStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('approval_status')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      const userStatus = data?.approval_status || 'pending';
      setStatus(userStatus);

      // Only redirect if not already done
      if (userStatus === 'approved' && !hasRedirected) {
        setHasRedirected(true);
        sessionStorage.setItem(`approved_${session.user.id}`, 'true');
        setTimeout(() => onHome(), 500);
      }
    } catch (error) {
      console.error('Error fetching approval status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#122017] overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2"></div>

      <StatusBar />

      {/* Header */}
      <div className="flex items-center p-4 pb-2 justify-between z-10">
        <button onClick={onBack} className="text-white flex size-12 shrink-0 items-center justify-start cursor-pointer hover:opacity-70 transition-opacity">
          <span className="material-symbols-rounded text-2xl font-bold">arrow_back_ios</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center">Application Status</h2>
        <button onClick={fetchStatus} className="text-white flex size-12 shrink-0 items-center justify-end cursor-pointer hover:opacity-70 transition-opacity">
          <span className={`material-symbols-rounded text-2xl ${loading ? 'animate-spin' : ''}`}>refresh</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-12 z-10">
        {/* Locker Illustration Card */}
        <div className="my-6">
          <div className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-center items-center overflow-hidden bg-primary/10 rounded-3xl min-h-64 relative border border-primary/20 shadow-2xl shadow-black/40"
            style={{ backgroundImage: 'linear-gradient(rgba(18, 32, 23, 0.6), rgba(18, 32, 23, 0.6)), url("https://lh3.googleusercontent.com/aida-public/AB6AXuCmUrrjjMh7LsXwOBpWLpUFIlkM_9tqDCA6BUdFMrpN_vZdbc5hSbh7tebmWwOslMrC1I5FaMMLQBrGzxw96DswqbciEj5UbbXSXTGTcZ_70cRgCCNNUPHFmFYuznFo-9JWAzwR_9tJh2JMjYxfeIx-JLrOxE5Zvi1B7svCQ9L6GFrvmGZ1vVru7nvlYJd8xM1zHFgmooyyLq4-a885Kp1ypYR4amttb1Jyx-9j6KeNZJNTzwAoX3o0meRot6sfs1uHQrHkqaQWCaZ7")' }}>
            <div className="bg-primary/20 p-6 rounded-full backdrop-blur-md border border-primary/30 animate-pulse">
              <span className="material-symbols-rounded text-primary text-6xl">
                {status === 'approved' ? 'verified_user' : 'schedule'}
              </span>
            </div>
          </div>
        </div>

        {/* Text Content */}
        <h1 className="text-white tracking-tight text-[32px] font-extrabold leading-tight px-4 text-center pb-3 pt-4">
          {status === 'approved' ? 'Account Activated!' : 'Thank you for joining our club!'}
        </h1>
        <p className="text-gray-400 text-base font-normal leading-relaxed pb-6 pt-1 px-8 text-center">
          {status === 'approved'
            ? 'Your account has been approved. You can now access all features of your plan.'
            : 'We have received your request. Please wait for admin approval to activate your account.'}
        </p>

        {/* Current Status Card */}
        <div className="flex flex-wrap gap-4 p-4">
          <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-3xl p-6 bg-[#0B150F] border border-primary/20 shadow-lg shadow-primary/5">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Current Status</p>
              <span className="material-symbols-rounded text-primary text-xl">
                {status === 'approved' ? 'check_circle' : 'pending_actions'}
              </span>
            </div>
            <p className="text-white tracking-tight text-2xl font-bold leading-tight mt-1 capitalize">
              {status === 'approved' ? 'Approved' : 'Pending Approval'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${status === 'approved' ? 'bg-primary' : 'bg-primary animate-pulse'}`}></div>
              <p className="text-primary text-sm font-semibold leading-normal">
                {status === 'approved' ? 'Account Active' : 'Processing Application'}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="px-6 py-4 flex flex-col gap-6">
          <div className="flex gap-4 items-start">
            <div className="flex flex-col items-center">
              <div className="size-6 rounded-full bg-primary flex items-center justify-center">
                <span className="material-symbols-rounded text-sm text-[#122017] font-black">check</span>
              </div>
              <div className="w-0.5 h-10 bg-primary/30"></div>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Plan Selected</p>
              <p className="text-gray-500 text-xs">Completed today</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="flex flex-col items-center">
              <div className={`size-6 rounded-full border-2 border-primary flex items-center justify-center ${status === 'approved' ? 'bg-primary' : ''}`}>
                {status === 'approved' ? (
                  <span className="material-symbols-rounded text-sm text-[#122017] font-black">check</span>
                ) : (
                  <div className="size-2 rounded-full bg-primary"></div>
                )}
              </div>
            </div>
            <div>
              <p className={`font-semibold text-sm ${status === 'approved' ? 'text-white' : 'text-primary'}`}>Admin Verification</p>
              <p className="text-gray-500 text-xs">{status === 'approved' ? 'Verified' : 'Expected within 24 hours'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-6 pb-12 bg-[#0B150F]/80 backdrop-blur-md border-t border-white/5 flex flex-col gap-3 z-20">
        {status === 'approved' ? (
          <button
            onClick={onHome}
            className="w-full bg-primary hover:bg-primary/90 text-[#122017] font-black py-4 rounded-full transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-rounded">dashboard</span>
            Go to Dashboard
          </button>
        ) : (
          <button
            disabled
            className="w-full bg-white/5 text-white/40 font-black py-4 rounded-full flex items-center justify-center gap-2 border border-white/5 cursor-not-allowed"
          >
            <div className="animate-spin size-4 border-2 border-white/20 border-t-white/80 rounded-full"></div>
            In Progress
          </button>
        )}
        <button className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-full transition-all border border-white/10 flex items-center justify-center gap-2">
          <span className="material-symbols-rounded">support_agent</span>
          Contact Support
        </button>
      </div>
    </div>
  );
};

export default ApplicationStatus;
