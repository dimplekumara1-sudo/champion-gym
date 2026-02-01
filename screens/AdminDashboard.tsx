
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';
import { planService } from '../lib/planService';

const AdminDashboard: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    activeUsers: 0,
    pendingApprovals: 0,
    totalOrders: 0,
    totalShopRevenue: 0,
    shopOrders: 0,
    dueRevenue: 0,
    upcomingRenewals: 0,
    todayAttendance: 0,
  });
  const [trendPeriod, setTrendPeriod] = useState<'7' | '30'>('30');
  const [trendData, setTrendData] = useState<number[]>([]);

  useEffect(() => {
    fetchStats();
    fetchTrendData();
    // Refresh stats every 30 seconds for realtime updates
    const interval = setInterval(() => {
      fetchStats();
      fetchTrendData();
    }, 30000);
    return () => clearInterval(interval);
  }, [trendPeriod]);

  const fetchStats = async () => {
    try {
      // Fetch profiles
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*');

      if (pError) throw pError;

      // Fetch payment history for membership revenue
      const { data: payments, error: payError } = await supabase
        .from('payment_history')
        .select('*');

      if (payError) throw payError;

      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from('gym_orders')
        .select('*');

      if (ordersError) throw ordersError;

      // Fetch products for shop revenue
      const { data: orderItems, error: itemsError } = await supabase
        .from('gym_order_items')
        .select('line_total');

      if (itemsError) throw itemsError;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let totalRev = 0;
      let monthlyRev = 0;
      let yearlyRev = 0;
      let pendingCount = 0;
      let totalShopRev = 0;
      let deliveredOrders = 0;
      let totalDue = 0;

      // Calculate membership revenue from payment history
      payments?.forEach(payment => {
        const amount = parseFloat(payment.amount.toString());
        totalRev += amount;

        if (payment.payment_date) {
          const payDate = new Date(payment.payment_date);
          if (payDate.getFullYear() === currentYear) {
            yearlyRev += amount;
            if (payDate.getMonth() === currentMonth) {
              monthlyRev += amount;
            }
          }
        }
      });

      profiles?.forEach(user => {
        if (user.approval_status === 'pending') pendingCount++;
        if (user.due_amount) totalDue += parseFloat(user.due_amount.toString());
      });

      // Calculate shop revenue
      orderItems?.forEach(item => {
        totalShopRev += item.line_total || 0;
      });

      // Count delivered orders
      deliveredOrders = orders?.filter(o => o.order_status === 'delivered').length || 0;

      // Get upcoming renewals
      const upcoming = await planService.getUsersWithUpcomingRenewals();

      // Fetch today's attendance
      const today = new Date().toISOString().split('T')[0];
      const { count: attendanceCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      setStats({
        totalRevenue: totalRev,
        monthlyRevenue: monthlyRev,
        yearlyRevenue: yearlyRev,
        activeUsers: profiles?.length || 0,
        pendingApprovals: pendingCount,
        totalOrders: orders?.length || 0,
        totalShopRevenue: totalShopRev,
        shopOrders: deliveredOrders,
        dueRevenue: totalDue,
        upcomingRenewals: upcoming.length,
        todayAttendance: attendanceCount || 0,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  };

  const fetchTrendData = async () => {
    try {
      const days = parseInt(trendPeriod);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch orders and payment history in the date range
      const { data: ordersData, error: ordersError } = await supabase
        .from('gym_orders')
        .select('created_at, total_amount')
        .gte('created_at', startDate.toISOString());

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payment_history')
        .select('payment_date, amount')
        .gte('payment_date', startDate.toISOString());

      if (ordersError || paymentsError) throw ordersError || paymentsError;

      // Initialize daily revenue array
      const dailyRevenue: { [key: string]: number } = {};
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyRevenue[dateStr] = 0;
      }

      // Add order revenue
      ordersData?.forEach(order => {
        if (order.created_at) {
          const dateStr = order.created_at.split('T')[0];
          dailyRevenue[dateStr] = (dailyRevenue[dateStr] || 0) + (order.total_amount || 0);
        }
      });

      // Add membership revenue
      paymentsData?.forEach(payment => {
        if (payment.payment_date) {
          const dateStr = payment.payment_date.split('T')[0];
          dailyRevenue[dateStr] = (dailyRevenue[dateStr] || 0) + parseFloat(payment.amount.toString());
        }
      });

      // Convert to array and sort by date
      const sortedDates = Object.keys(dailyRevenue).sort();
      const revenues = sortedDates.map(date => dailyRevenue[date]);

      setTrendData(revenues);
    } catch (error) {
      console.error('Error fetching trend data:', error);
    }
  };

  const generateSVGPath = () => {
    if (trendData.length === 0) return { path: '', fill: '' };

    const maxRevenue = Math.max(...trendData, 1);
    const width = 400;
    const height = 200;
    const pointWidth = width / (trendData.length - 1 || 1);

    let pathData = '';
    let fillPath = '';

    trendData.forEach((revenue, index) => {
      const x = index * pointWidth;
      const y = height - (revenue / maxRevenue) * (height - 20) - 10;

      if (index === 0) {
        pathData += `M${x},${y}`;
        fillPath += `M${x},${y}`;
      } else {
        pathData += ` L${x},${y}`;
        fillPath += ` L${x},${y}`;
      }
    });

    fillPath += ` L${width},${height} L0,${height} Z`;

    return { path: pathData, fill: fillPath };
  };

  const svgPaths = generateSVGPath();

  return (
    <div className="min-h-screen bg-background-light dark:bg-[#0F172A] text-slate-900 dark:text-white pb-32">
      <header className="px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Admin Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Welcome back, Manager</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchStats}
            className="w-10 h-10 rounded-full bg-slate-200 dark:bg-[#1E293B] flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-rounded text-slate-600 dark:text-slate-300">refresh</span>
          </button>
          <button className="w-10 h-10 rounded-full bg-slate-200 dark:bg-[#1E293B] flex items-center justify-center relative">
            <span className="material-symbols-rounded text-slate-600 dark:text-slate-300">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-background-light dark:border-[#0F172A]"></span>
          </button>
        </div>
      </header>

      <main className="px-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 p-5 bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">Overall Revenue</p>
                <h2 className="text-3xl font-bold mt-1">₹{stats.totalRevenue.toLocaleString()}</h2>
              </div>
              <div className="bg-primary/10 p-2 rounded-lg">
                <span className="material-symbols-rounded text-primary">payments</span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">This Month</p>
                <p className="text-lg font-bold text-primary">₹{stats.monthlyRevenue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">This Year</p>
                <p className="text-lg font-bold text-white">₹{stats.yearlyRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">Active Users</p>
            <h2 className="text-2xl font-bold mt-1">{stats.activeUsers}</h2>
            <div className="mt-3 flex items-center text-primary text-xs font-semibold">
              <span className="material-symbols-rounded text-xs mr-0.5">trending_up</span>
              <span>4.2%</span>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">Pending</p>
            <h2 className="text-2xl font-bold mt-1 text-orange-500">{stats.pendingApprovals}</h2>
            <div className="mt-3 flex items-center text-orange-500 text-xs font-semibold">
              <span className="material-symbols-rounded text-xs mr-0.5">notification_important</span>
              <span>Needs Review</span>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">Total Orders</p>
            <h2 className="text-2xl font-bold mt-1">{stats.totalOrders}</h2>
            <div className="mt-3 flex items-center text-primary text-xs font-semibold">
              <span className="material-symbols-rounded text-xs mr-0.5">trending_up</span>
              <span>{stats.shopOrders} delivered</span>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">Shop Revenue</p>
            <h2 className="text-2xl font-bold mt-1">₹{stats.totalShopRevenue.toLocaleString()}</h2>
            <div className="mt-3 flex items-center text-primary text-xs font-semibold">
              <span className="material-symbols-rounded text-xs mr-0.5">trending_up</span>
              <span>{((stats.totalShopRevenue / (stats.totalRevenue + stats.totalShopRevenue)) * 100 || 0).toFixed(1)}% of total</span>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">Due Amount</p>
            <h2 className="text-2xl font-bold mt-1 text-red-500">₹{stats.dueRevenue.toLocaleString()}</h2>
            <div className="mt-3 flex items-center text-red-500 text-xs font-semibold">
              <span className="material-symbols-rounded text-xs mr-0.5">account_balance_wallet</span>
              <span>To be collected</span>
            </div>
          </div>

          <div 
            onClick={() => onNavigate('ADMIN_SUBSCRIPTION_TRACKER')}
            className="p-5 bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer active:scale-95 transition-transform"
          >
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">Renewals</p>
            <h2 className="text-2xl font-bold mt-1 text-blue-500">{stats.upcomingRenewals}</h2>
            <div className="mt-3 flex items-center text-blue-500 text-xs font-semibold">
              <span className="material-symbols-rounded text-xs mr-0.5">event_repeat</span>
              <span>Next 7 Days</span>
            </div>
          </div>

          <div 
            onClick={() => onNavigate('ADMIN_ATTENDANCE')}
            className="p-5 bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer active:scale-95 transition-transform"
          >
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">Gym Attendance</p>
            <h2 className="text-2xl font-bold mt-1 text-purple-500">{stats.todayAttendance}</h2>
            <div className="mt-3 flex items-center text-purple-500 text-xs font-semibold">
              <span className="material-symbols-rounded text-xs mr-0.5">fingerprint</span>
              <span>Today's Logins</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-dark">Revenue Trend</h3>
            <select
              value={trendPeriod}
              onChange={(e) => setTrendPeriod(e.target.value as '7' | '30')}
              className="bg-slate-100 dark:bg-[#0F172A] border-none text-xs rounded-lg py-1 pl-2 pr-8 focus:ring-primary text-slate-600 dark:text-slate-300 outline-none"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
            </select>
          </div>
          <div className="relative h-48 w-full">
            <div className="absolute inset-0 flex flex-col justify-between">
              <div className="border-b border-slate-100 dark:border-slate-800 w-full h-0"></div>
              <div className="border-b border-slate-100 dark:border-slate-800 w-full h-0"></div>
              <div className="border-b border-slate-100 dark:border-slate-800 w-full h-0"></div>
              <div className="border-b border-slate-100 dark:border-slate-800 w-full h-0"></div>
            </div>
            <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 200">
              <defs>
                <linearGradient id="gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity="0.3"></stop>
                  <stop offset="100%" stopColor="#22C55E" stopOpacity="0"></stop>
                </linearGradient>
              </defs>
              {svgPaths.fill && <path d={svgPaths.fill} fill="url(#gradient)"></path>}
              {svgPaths.path && <path d={svgPaths.path} fill="none" stroke="#22C55E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"></path>}
              {trendData.length > 0 && (
                <>
                  <circle cx={400 * (trendData.length - 1) / Math.max(trendData.length - 1, 1)} cy={200 - (trendData[trendData.length - 1] / Math.max(...trendData, 1)) * 180 - 10} fill="#22C55E" r="4" stroke="white" strokeWidth="2"></circle>
                </>
              )}
            </svg>
          </div>
          <div className="flex justify-between mt-4 text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
            {trendPeriod === '7' ? (
              <>
                <span>7d</span>
                <span>5d</span>
                <span>3d</span>
                <span>1d</span>
                <span>Today</span>
              </>
            ) : (
              <>
                <span>30d</span>
                <span>20d</span>
                <span>10d</span>
                <span>5d</span>
                <span>Today</span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg text-white">Quick Management</h3>
            <button className="text-primary text-sm font-semibold">See All</button>
          </div>
          <div className="space-y-3">
            <div
              onClick={() => onNavigate('ADMIN_PLANS')}
              className="flex items-center p-4 bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mr-4">
                <span className="material-symbols-rounded text-blue-500 text-xl">event_available</span>
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-semibold text-dark">Manage Plans</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Update membership offerings</p>
              </div>
              <span className="material-symbols-rounded text-slate-400">chevron_right</span>
            </div>

            <div
              onClick={() => onNavigate('ADMIN_USERS')}
              className="flex items-center p-4 bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mr-4 relative">
                <span className="material-symbols-rounded text-primary text-xl">group</span>
                {stats.pendingApprovals > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center border-2 border-white dark:border-[#1E293B]">
                    {stats.pendingApprovals}
                  </span>
                )}
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-semibold text-dark">User Management</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {stats.activeUsers} total members • {stats.pendingApprovals} pending
                </p>
              </div>
              <span className="material-symbols-rounded text-slate-400">chevron_right</span>
            </div>

            <div
              onClick={() => onNavigate('ADMIN_WORKOUTS')}
              className="flex items-center p-4 bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mr-4">
                <span className="material-symbols-rounded text-purple-500 text-xl">list_alt</span>
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-semibold text-dark">Workout Programs</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Create and assign programs</p>
              </div>
              <span className="material-symbols-rounded text-slate-400">chevron_right</span>
            </div>



            <div
              onClick={() => onNavigate('ADMIN_EXPLORE')}
              className="flex items-center p-4 bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center mr-4">
                <span className="material-symbols-rounded text-indigo-500 text-xl">explore</span>
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-semibold text-dark">Explore Content</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Manage video lessons & featured content</p>
              </div>
              <span className="material-symbols-rounded text-slate-400">chevron_right</span>
            </div>

            <div
              onClick={() => onNavigate('ADMIN_SHOP')}
              className="flex items-center p-4 bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mr-4">
                <span className="material-symbols-rounded text-emerald-500 text-xl">storefront</span>
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-semibold text-dark">Shop Management</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Products & inventory</p>
              </div>
              <span className="material-symbols-rounded text-slate-400">chevron_right</span>
            </div>

            <div
              onClick={() => onNavigate('ADMIN_ORDERS')}
              className="flex items-center p-4 bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mr-4">
                <span className="material-symbols-rounded text-purple-500 text-xl">shopping_cart_checkout</span>
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-semibold text-dark">Orders Management</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">View & manage all orders</p>
              </div>
              <span className="material-symbols-rounded text-slate-400">chevron_right</span>
            </div>



            <div
              onClick={() => onNavigate('ADMIN_PT')}
              className="flex items-center p-4 bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mr-4">
                <span className="material-symbols-rounded text-green-500 text-xl">groups</span>
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-semibold text-dark">PT Management</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Trainers & Sessions</p>
              </div>
              <span className="material-symbols-rounded text-slate-400">chevron_right</span>
            </div>
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-4 py-3 pb-8 flex justify-between items-center z-50 max-w-[430px] mx-auto gap-2">
        <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="flex flex-col items-center space-y-1 text-primary text-xs">
          <span className="material-symbols-rounded text-lg">dashboard</span>
          <span className="font-bold">Home</span>
        </button>

        <button onClick={() => onNavigate('ADMIN_ORDERS')} className="flex flex-col items-center space-y-1 text-slate-400 dark:text-slate-500 hover:text-primary transition-colors text-xs">
          <span className="material-symbols-rounded text-lg">shopping_cart_checkout</span>
          <span className="font-medium">Orders</span>
        </button>
        <button onClick={() => onNavigate('DASHBOARD')} className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 -mt-10 border-4 border-background-light dark:border-[#0F172A]">
          <span className="material-symbols-rounded text-3xl">home</span>
        </button>
        <button onClick={() => onNavigate('ADMIN_USERS')} className="flex flex-col items-center space-y-1 text-slate-400 dark:text-slate-500 hover:text-primary transition-colors">
          <span className="material-symbols-rounded">people</span>
          <span className="text-[10px] font-medium">Users</span>
        </button>
        <button onClick={() => onNavigate('CONFIG')} className="flex flex-col items-center space-y-1 text-slate-400 dark:text-slate-500 hover:text-primary transition-colors">
          <span className="material-symbols-rounded">settings</span>
          <span className="text-[10px] font-medium">Config</span>
        </button>
      </nav>
    </div>
  );
};

export default AdminDashboard;
