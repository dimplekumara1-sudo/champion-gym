import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface CachedUser {
    uid: string;
    name: string;
    privilege: string;
    group_id: string;
    card?: string;
    password?: string;
    user_id?: string;
}

interface DeviceUserCacheRecord {
    id: string;
    essl_id: string;
    user_name: string;
    privilege: string;
    group_id: string;
    card: string | null;
    metadata: any;
    synced_at: string;
}

interface AdminDeviceUserCacheProps {
    onNavigate: (screen: any) => void;
}

const AdminDeviceUserCache: React.FC<AdminDeviceUserCacheProps> = ({ onNavigate }) => {
    const [cachedUsers, setCachedUsers] = useState<CachedUser[]>([]);
    const [dbCachedUsers, setDbCachedUsers] = useState<DeviceUserCacheRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
    const [activeTab, setActiveTab] = useState<'database' | 'sync' | 'test'>('database');

    // Load cached users from database
    const loadCachedUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('device_user_cache')
                .select('*')
                .order('synced_at', { ascending: false });

            if (error) throw error;
            setDbCachedUsers(data || []);
            setMessage(`Loaded ${data?.length || 0} cached users from database`);
            setMessageType('success');
        } catch (err) {
            setMessage(`Error loading cached users: ${err}`);
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    // Test function: Fetch users from device via Python bridge agent
    const testFetchFromDevice = async () => {
        setLoading(true);
        setMessage('Fetching users from device...');
        setMessageType('info');

        try {
            // Call the Python bridge agent endpoint to fetch and cache users
            const response = await fetch('http://localhost:5000/api/device/cache-users', {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch from device: ${response.statusText}`);
            }

            const result = await response.json();
            setCachedUsers(result.users || []);
            setMessage(`Successfully cached ${result.users?.length || 0} users from device`);
            setMessageType('success');
        } catch (err) {
            // Fallback: Show test data if device unavailable
            const testUsers: CachedUser[] = [
                { uid: '1', name: 'CGA5', privilege: 'User', group_id: '99', user_id: 'CGA5', card: 'ABC123' },
                { uid: '2', name: 'John Doe', privilege: 'User', group_id: '1', user_id: 'JD001', card: 'XYZ789' },
                { uid: '3', name: 'Admin User', privilege: 'Admin', group_id: '1', user_id: 'ADMIN', card: 'ADM001' },
            ];
            setCachedUsers(testUsers);
            setMessage(`Device unavailable - loaded test data. Error: ${err}`);
            setMessageType('info');
        } finally {
            setLoading(false);
        }
    };

    // Sync cached users to database
    const syncUsersToDB = async () => {
        if (cachedUsers.length === 0) {
            setMessage('No users to sync. Fetch from device first!');
            setMessageType('error');
            return;
        }

        setSyncing(true);
        try {
            // Prepare data for insertion
            const usersToSync = cachedUsers.map(user => ({
                essl_id: user.user_id || user.uid,
                user_name: user.name,
                privilege: user.privilege,
                group_id: user.group_id,
                card: user.card || null,
                metadata: {
                    uid: user.uid,
                    sync_timestamp: new Date().toISOString(),
                    source: 'device_fetch'
                },
                synced_at: new Date().toISOString()
            }));

            // Upsert into database
            const { data, error } = await supabase
                .from('device_user_cache')
                .upsert(usersToSync, { onConflict: 'essl_id' });

            if (error) throw error;

            setMessage(`Successfully synced ${usersToSync.length} users to database`);
            setMessageType('success');
            loadCachedUsers(); // Reload from DB
        } catch (err) {
            setMessage(`Sync failed: ${err}`);
            setMessageType('error');
        } finally {
            setSyncing(false);
        }
    };

    // Test user lookup functionality
    const testUserLookup = (userId: string) => {
        const user = cachedUsers.find(u => u.user_id === userId || u.uid === userId);
        if (user) {
            setMessage(`Found user: ${user.name} (UID: ${user.uid}, Group: ${user.group_id})`);
            setMessageType('success');
        } else {
            setMessage(`User ${userId} not found in cache`);
            setMessageType('error');
        }
    };

    useEffect(() => {
        loadCachedUsers();
    }, []);

    const filteredUsers = cachedUsers.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.uid.includes(searchTerm) ||
        user.user_id?.includes(searchTerm)
    );

    const filteredDbUsers = dbCachedUsers.filter(user =>
        user.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.essl_id.includes(searchTerm)
    );

    return (
        <div className="min-h-screen bg-[#090E1A] text-white flex flex-col">
            {/* Header */}
            <div className="border-b border-white/10 px-4 py-4 flex items-center justify-between sticky top-0 z-40">
                <div>
                    <h1 className="text-xl font-bold">Device User Cache Manager</h1>
                    <p className="text-xs text-slate-400 mt-1">Retrieve & cache biometric device user data</p>
                </div>
                <button
                    onClick={() => onNavigate('CONFIG')}
                    className="text-slate-400 hover:text-white transition-colors"
                >
                    <span className="material-symbols-rounded">close</span>
                </button>
            </div>

            {/* Message Alert */}
            {message && (
                <div className={`mx-4 mt-4 p-3 rounded-xl text-sm font-medium ${messageType === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        messageType === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                    {message}
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-2 px-4 py-3 border-b border-white/10 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('database')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'database' ? 'bg-primary text-slate-900' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                >
                    Database Cache
                </button>
                <button
                    onClick={() => setActiveTab('sync')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'sync' ? 'bg-primary text-slate-900' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                >
                    Fetch & Sync
                </button>
                <button
                    onClick={() => setActiveTab('test')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'test' ? 'bg-primary text-slate-900' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                >
                    Test Functions
                </button>
            </div>

            {/* Content */}
            <main className="flex-1 overflow-y-auto px-4 py-6 pb-32">
                {/* DATABASE CACHE TAB */}
                {activeTab === 'database' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold">Cached Users in Database</h2>
                                <p className="text-xs text-slate-400">{dbCachedUsers.length} users cached</p>
                            </div>
                            <button
                                onClick={loadCachedUsers}
                                disabled={loading}
                                className="px-4 py-2 bg-primary text-slate-900 rounded-xl text-sm font-bold hover:bg-green-600 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Loading...' : 'Refresh'}
                            </button>
                        </div>

                        <div className="relative">
                            <span className="material-symbols-rounded absolute left-3 top-3 text-slate-500 text-sm">search</span>
                            <input
                                type="text"
                                placeholder="Search by name or user ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-10 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
                            />
                        </div>

                        {dbCachedUsers.length === 0 ? (
                            <div className="text-center py-12">
                                <span className="material-symbols-rounded text-4xl text-slate-600 mb-3 block">folder_open</span>
                                <p className="text-slate-400">No users cached in database. Fetch from device first!</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {filteredDbUsers.map((user) => (
                                    <div key={user.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-white">{user.user_name}</h3>
                                                <p className="text-xs text-slate-400 mt-1">ID: {user.essl_id}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${user.privilege === 'Admin' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {user.privilege}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div>
                                                <p className="text-slate-500 font-medium">Group ID</p>
                                                <p className="text-white mt-1">{user.group_id}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 font-medium">Card</p>
                                                <p className="text-white mt-1 font-mono text-[11px]">{user.card || 'N/A'}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-slate-500 font-medium">Synced At</p>
                                                <p className="text-white mt-1 text-[11px] font-mono">
                                                    {new Date(user.synced_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* FETCH & SYNC TAB */}
                {activeTab === 'sync' && (
                    <div className="space-y-4">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                    <span className="material-symbols-rounded text-primary">cloud_sync</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold">Fetch Users from Device</h2>
                                    <p className="text-xs text-slate-400">Retrieves complete user roster from biometric device</p>
                                </div>
                            </div>

                            <button
                                onClick={testFetchFromDevice}
                                disabled={loading}
                                className="w-full px-4 py-3 bg-primary text-slate-900 font-bold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Fetching from Device...' : 'Fetch Users from Device'}
                            </button>

                            {cachedUsers.length > 0 && (
                                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                                    <p className="text-green-400 text-sm">
                                        ✓ Fetched {cachedUsers.length} users from device
                                    </p>
                                </div>
                            )}
                        </div>

                        {cachedUsers.length > 0 && (
                            <>
                                <div>
                                    <h3 className="font-bold mb-3">Preview ({cachedUsers.length} users)</h3>
                                    <div className="grid gap-2 max-h-80 overflow-y-auto">
                                        {cachedUsers.slice(0, 10).map((user) => (
                                            <div key={user.uid} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 flex items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-sm">{user.name}</p>
                                                    <p className="text-xs text-slate-400">UID: {user.uid}</p>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${user.group_id === '99' ? 'bg-red-500/20 text-red-400' : 'bg-slate-600 text-slate-300'
                                                    }`}>
                                                    G{user.group_id}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    {cachedUsers.length > 10 && (
                                        <p className="text-xs text-slate-500 mt-2">... and {cachedUsers.length - 10} more</p>
                                    )}
                                </div>

                                <button
                                    onClick={syncUsersToDB}
                                    disabled={syncing}
                                    className="w-full px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {syncing ? 'Syncing to Database...' : `Sync ${cachedUsers.length} Users to Database`}
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* TEST FUNCTIONS TAB */}
                {activeTab === 'test' && (
                    <div className="space-y-4">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                            <h2 className="text-lg font-bold mb-4">Test User Lookup Function</h2>
                            <p className="text-sm text-slate-400 mb-4">
                                This tests the user name resolution function. Enter a user ID (UID or ESSL ID) and it will look up the user in the cache.
                            </p>

                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Enter User ID (e.g., CGA5, 1, JD001)"
                                    id="test-user-input"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const input = (e.target as HTMLInputElement).value;
                                            testUserLookup(input);
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        const input = (document.getElementById('test-user-input') as HTMLInputElement)?.value;
                                        if (input) testUserLookup(input);
                                    }}
                                    className="w-full px-4 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors"
                                >
                                    Test Lookup
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                            <h2 className="text-lg font-bold mb-4">How This Works</h2>
                            <div className="space-y-3 text-sm text-slate-400">
                                <div>
                                    <p className="font-bold text-white mb-1">1. Fetch Users from Device</p>
                                    <p>Connects to X990 device at 192.168.0.215:4370 and retrieves all users using `conn.get_users()`</p>
                                </div>
                                <div>
                                    <p className="font-bold text-white mb-1">2. Cache in Database</p>
                                    <p>Stores user details (name, privilege, group_id) in `device_user_cache` table for quick lookup</p>
                                </div>
                                <div>
                                    <p className="font-bold text-white mb-1">3. Use for Attendance Logs</p>
                                    <p>When attendance is recorded, system looks up user name from cache instead of just showing UID</p>
                                </div>
                                <div>
                                    <p className="font-bold text-white mb-1">4. Fallback Lookup</p>
                                    <p>If user not in cache, falls back to UID. Bridge agent periodically refreshes cache.</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
                            <h3 className="font-bold text-blue-400 mb-2">💡 Quick Test Data</h3>
                            <p className="text-sm text-slate-400 mb-3">Try these test IDs (from demo data):</p>
                            <div className="flex flex-wrap gap-2">
                                {['CGA5', '1', 'JD001', 'ADMIN'].map(id => (
                                    <button
                                        key={id}
                                        onClick={() => testUserLookup(id)}
                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-bold transition-colors"
                                    >
                                        Test: {id}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminDeviceUserCache;
