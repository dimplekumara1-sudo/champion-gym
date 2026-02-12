import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen, UnknownUser } from '../types';
import { unknownUserService } from '../lib/unknownUserService';

const AdminUnknownUsers: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
    const [unknownUsers, setUnknownUsers] = useState<UnknownUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'verified' | 'converted' | 'rejected'>('all');
    const [selectedUser, setSelectedUser] = useState<UnknownUser | null>(null);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBulkEditModal, setShowBulkEditModal] = useState(false);
    const [bulkEditData, setBulkEditData] = useState({
        full_name: '',
        status: 'pending' as 'pending' | 'verified' | 'rejected',
        notes: ''
    });
    const [editingNames, setEditingNames] = useState<{ [key: string]: string }>({});
    const [savingNames, setSavingNames] = useState<{ [key: string]: boolean }>({});
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('asc');
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [statistics, setStatistics] = useState({
        total: 0,
        pending: 0,
        verified: 0,
        converted: 0,
        rejected: 0,
        totalCheckIns: 0
    });

    // Form fields for creating new unknown user
    const [formData, setFormData] = useState({
        essl_id: '',
        phone_number: '',
        full_name: '',
        email: '',
        notes: ''
    });

    // Form fields for verifying/updating unknown user
    const [verifyData, setVerifyData] = useState({
        full_name: '',
        email: '',
        phone_number: '',
        essl_id: '',
        notes: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedUser) {
            setVerifyData({
                full_name: selectedUser.full_name || '',
                email: selectedUser.email || '',
                phone_number: selectedUser.phone_number || '',
                essl_id: selectedUser.essl_id || '',
                notes: selectedUser.notes || ''
            });
        }
    }, [selectedUser]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch all unknown users
            const users = filterStatus === 'all'
                ? await unknownUserService.getAllUnknownUsers()
                : await unknownUserService.getAllUnknownUsers(filterStatus);

            setUnknownUsers(users);

            // Fetch statistics
            const stats = await unknownUserService.getStatistics();
            setStatistics(stats);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Error loading unknown users');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        try {
            if (!searchTerm.trim()) {
                fetchData();
                return;
            }

            const results = await unknownUserService.searchUnknownUsers(searchTerm);
            setUnknownUsers(results);
        } catch (error) {
            console.error('Error searching:', error);
            alert('Error searching users');
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const newUser = await unknownUserService.createUnknownUser(formData, user.id);

            setUnknownUsers([newUser, ...unknownUsers]);
            setFormData({
                essl_id: '',
                phone_number: '',
                full_name: '',
                email: '',
                notes: ''
            });
            setShowCreateModal(false);

            const stats = await unknownUserService.getStatistics();
            setStatistics(stats);

            alert(`Unknown user created: ${newUser.temporary_name}`);
        } catch (error) {
            console.error('Error creating user:', error);
            alert('Error creating unknown user');
        }
    };

    const handleVerifyUser = async () => {
        if (!selectedUser) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const updated = await unknownUserService.verifyUnknownUser(
                selectedUser.id,
                verifyData,
                user.id
            );

            setUnknownUsers(unknownUsers.map(u => u.id === updated.id ? updated : u));
            setSelectedUser(updated);

            const stats = await unknownUserService.getStatistics();
            setStatistics(stats);

            alert('User verified successfully');
        } catch (error) {
            console.error('Error verifying user:', error);
            alert('Error verifying user');
        }
    };

    const handleRejectUser = async () => {
        if (!selectedUser) return;

        if (!confirm('Are you sure you want to reject this user?')) return;

        try {
            const updated = await unknownUserService.rejectUnknownUser(
                selectedUser.id,
                verifyData.notes
            );

            setUnknownUsers(unknownUsers.map(u => u.id === updated.id ? updated : u));
            setSelectedUser(updated);

            const stats = await unknownUserService.getStatistics();
            setStatistics(stats);

            alert('User rejected');
            setShowDetailModal(false);
        } catch (error) {
            console.error('Error rejecting user:', error);
            alert('Error rejecting user');
        }
    };

    const handleRecordCheckIn = async (user: UnknownUser) => {
        try {
            const updated = await unknownUserService.recordCheckIn(user.id);
            setUnknownUsers(unknownUsers.map(u => u.id === updated.id ? updated : u));
            if (selectedUser?.id === user.id) {
                setSelectedUser(updated);
            }

            const stats = await unknownUserService.getStatistics();
            setStatistics(stats);
        } catch (error) {
            console.error('Error recording check-in:', error);
            alert('Error recording check-in');
        }
    };

    const handleDiscoverUsers = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const discoveredCount = await unknownUserService.discoverUnknownUsers(user.id);
            if (discoveredCount > 0) {
                alert(`${discoveredCount} new unknown users discovered from attendance logs.`);
                fetchData();
            } else {
                alert('No new unknown users found in attendance logs.');
            }
        } catch (error) {
            console.error('Error discovering users:', error);
            alert('Error discovering unknown users');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        try {
            const csv = unknownUserService.exportAsCSV(unknownUsers);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `unknown_users_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting:', error);
            alert('Error exporting data');
        }
    };

    const handleBulkUpdate = async () => {
        if (selectedUserIds.size === 0) return;

        try {
            setLoading(true);
            const updates: Partial<UnknownUser> = {};
            if (bulkEditData.full_name) updates.full_name = bulkEditData.full_name;
            if (bulkEditData.status !== 'pending') updates.status = bulkEditData.status;
            if (bulkEditData.notes) updates.notes = bulkEditData.notes;
            if (updates.status === 'verified') updates.verified_at = new Date().toISOString();

            await unknownUserService.bulkUpdateUnknownUsers(Array.from(selectedUserIds), updates);
            
            alert(`${selectedUserIds.size} users updated successfully`);
            setSelectedUserIds(new Set());
            setShowBulkEditModal(false);
            fetchData();
        } catch (error) {
            console.error('Error bulk updating:', error);
            alert('Error performing bulk update');
        } finally {
            setLoading(false);
        }
    };

    const toggleUserSelection = (id: string) => {
        const newSelection = new Set(selectedUserIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedUserIds(newSelection);
    };

    const toggleAllSelection = () => {
        if (selectedUserIds.size === filteredUsers.length) {
            setSelectedUserIds(new Set());
        } else {
            setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
        }
    };

    const handleInlineNameUpdate = async (userId: string) => {
        const newName = editingNames[userId];
        if (newName === undefined) return;

        try {
            setSavingNames(prev => ({ ...prev, [userId]: true }));
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const updated = await unknownUserService.verifyUnknownUser(
                userId,
                { full_name: newName },
                user.id
            );

            setUnknownUsers(unknownUsers.map(u => u.id === updated.id ? updated : u));
            
            // Clear editing state for this user
            const newEditingNames = { ...editingNames };
            delete newEditingNames[userId];
            setEditingNames(newEditingNames);

            const stats = await unknownUserService.getStatistics();
            setStatistics(stats);
        } catch (error) {
            console.error('Error updating name inline:', error);
            alert('Error updating name');
        } finally {
            setSavingNames(prev => ({ ...prev, [userId]: false }));
        }
    };

    const handleSaveAllNames = async () => {
        const userIdsToSave = Object.keys(editingNames);
        if (userIdsToSave.length === 0) return;

        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Save all names
            for (const userId of userIdsToSave) {
                const newName = editingNames[userId];
                if (newName !== undefined) {
                    await unknownUserService.verifyUnknownUser(
                        userId,
                        { full_name: newName },
                        user.id
                    );
                }
            }

            // Refresh data
            await fetchData();
            setEditingNames({});
            alert('All names updated successfully');
        } catch (error) {
            console.error('Error saving all names:', error);
            alert('Error saving some names');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: '#FFA500',
            verified: '#4CAF50',
            converted: '#2196F3',
            rejected: '#F44336'
        };
        return colors[status] || '#999';
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            pending: 'Pending',
            verified: 'Verified',
            converted: 'Converted',
            rejected: 'Rejected'
        };
        return labels[status] || status;
    };

    const filteredUsers = unknownUsers.filter(user => {
        if (filterStatus !== 'all' && user.status !== filterStatus) return false;
        return true;
    }).sort((a, b) => {
        if (sortOrder === 'none') return 0;
        
        // Robust numerical extraction for essl_id
        const getNum = (id: string | null) => {
            if (!id) return Infinity; // Put empty IDs at the end
            const match = id.match(/\d+/);
            return match ? parseInt(match[0], 10) : Infinity;
        };

        const numA = getNum(a.essl_id);
        const numB = getNum(b.essl_id);
        
        if (numA !== numB) {
            return sortOrder === 'asc' ? numA - numB : numB - numA;
        }

        // Fallback to alphabetical for temporary_name if essl_id is same or missing
        const nameA = a.temporary_name || '';
        const nameB = b.temporary_name || '';
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#090E1A] p-6 pb-32">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Unknown Users Management</h1>
                    <button
                        onClick={() => onNavigate('ADMIN_DASHBOARD')}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-200 font-medium transition-colors"
                    >
                        ← Back
                    </button>
                </div>
                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{statistics.total}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Total Users</div>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="text-2xl font-bold text-amber-500">{statistics.pending}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Pending</div>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="text-2xl font-bold text-green-500">{statistics.verified}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Verified</div>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="text-2xl font-bold text-blue-500">{statistics.converted}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Converted</div>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="text-2xl font-bold text-red-500">{statistics.rejected}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Rejected</div>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="text-2xl font-bold text-purple-500">{statistics.totalCheckIns}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Check-ins</div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mb-6 flex-wrap">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                        + Create Unknown User
                    </button>
                    <button
                        onClick={handleDiscoverUsers}
                        disabled={loading}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        🔍 Discover from Logs
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                    >
                        📥 Export as CSV
                    </button>
                    {selectedUserIds.size > 0 && (
                        <button
                            onClick={() => setShowBulkEditModal(true)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors animate-pulse"
                        >
                            ✏️ Bulk Edit ({selectedUserIds.size})
                        </button>
                    )}
                    {Object.keys(editingNames).length > 0 && (
                        <button
                            onClick={handleSaveAllNames}
                            disabled={loading}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            💾 Save All Changes ({Object.keys(editingNames).length})
                        </button>
                    )}
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        ⟳ Refresh
                    </button>
                </div>

                {/* Search and Filter */}
                <div className="mb-6 flex gap-3">
                    <input
                        type="text"
                        placeholder="Search by name, phone, email, ESSL ID, or temp name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        🔍 Search
                    </button>
                </div>

                {/* Status Filter */}
                <div className="flex gap-2 mb-6 flex-wrap border-b border-slate-200 dark:border-slate-700">
                    {(['all', 'pending', 'verified', 'converted', 'rejected'] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => {
                                setFilterStatus(status);
                                setSearchTerm('');
                            }}
                            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${filterStatus === status
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
                                }`}
                        >
                            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                            {status === 'pending' && ` (${statistics.pending})`}
                            {status === 'verified' && ` (${statistics.verified})`}
                            {status === 'converted' && ` (${statistics.converted})`}
                            {status === 'rejected' && ` (${statistics.rejected})`}
                        </button>
                    ))}
                </div>

                {/* Users List */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="hidden md:grid grid-cols-[50px_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 p-4 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white text-sm items-center">
                        <div className="flex justify-center">
                            <input 
                                type="checkbox" 
                                checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0}
                                onChange={toggleAllSelection}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                        </div>
                        <div>Temp Name</div>
                        <div>Full Name</div>
                        <div>Contact</div>
                        <div 
                            className="flex items-center gap-1 cursor-pointer hover:text-blue-500 transition-colors"
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        >
                            ESSL ID
                            <span className="text-xs">
                                {sortOrder === 'asc' ? '↑' : sortOrder === 'desc' ? '↓' : '↕'}
                            </span>
                        </div>
                        <div>Status</div>
                        <div>Actions</div>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading...</div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400">No unknown users found</div>
                    ) : (
                        filteredUsers.map(user => (
                            <div key={user.id} className="md:grid grid-cols-[50px_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 p-4 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors items-center">
                                <div className="flex justify-center">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedUserIds.has(user.id)}
                                        onChange={() => toggleUserSelection(user.id)}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="font-medium text-slate-900 dark:text-white mb-2 md:mb-0">
                                    <span className="md:hidden font-semibold text-slate-600 dark:text-slate-400">Temp: </span>{user.temporary_name}
                                </div>
                                <div className="text-slate-600 dark:text-slate-400 mb-2 md:mb-0">
                                    <span className="md:hidden font-semibold text-slate-600 dark:text-slate-400">Name: </span>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={editingNames[user.id] !== undefined ? editingNames[user.id] : (user.full_name || '')}
                                            onChange={(e) => setEditingNames({ ...editingNames, [user.id]: e.target.value })}
                                            placeholder="Assign name..."
                                            className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                        {editingNames[user.id] !== undefined && editingNames[user.id] !== user.full_name && (
                                            <button
                                                onClick={() => handleInlineNameUpdate(user.id)}
                                                disabled={savingNames[user.id]}
                                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors disabled:opacity-50"
                                            >
                                                {savingNames[user.id] ? '...' : 'Save'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="text-sm text-slate-600 dark:text-slate-400 mb-2 md:mb-0">
                                    <span className="md:hidden font-semibold text-slate-600 dark:text-slate-400">Contact: </span>
                                    {user.phone_number && <div>{user.phone_number}</div>}
                                    {user.email && <div className="text-xs">{user.email}</div>}
                                </div>
                                <div className="text-slate-600 dark:text-slate-400 mb-2 md:mb-0">
                                    <span className="md:hidden font-semibold text-slate-600 dark:text-slate-400">ESSL: </span>{user.essl_id || '—'}
                                </div>
                                <div className="mb-2 md:mb-0">
                                    <span
                                        className="px-2 py-1 rounded text-xs font-semibold text-white"
                                        style={{ backgroundColor: getStatusColor(user.status) }}
                                    >
                                        {getStatusLabel(user.status)}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedUser(user);
                                            setShowDetailModal(true);
                                        }}
                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                                    >
                                        View
                                    </button>
                                    {user.status === 'pending' && (
                                        <button
                                            onClick={() => handleRecordCheckIn(user)}
                                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                                        >
                                            Check-in
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Create Modal */}
                {showCreateModal && (
                    <div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <div
                            className="bg-white dark:bg-slate-800 rounded-2xl w-full md:max-w-md md:mx-auto max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 flex justify-between items-center p-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Unknown User</h2>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="text-2xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">ESSL ID (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.essl_id}
                                        onChange={(e) => setFormData({ ...formData, essl_id: e.target.value })}
                                        placeholder="e.g., CGA8"
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Phone Number (Optional)</label>
                                    <input
                                        type="tel"
                                        value={formData.phone_number}
                                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                        placeholder="e.g., +91-98765-43210"
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Full Name (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        placeholder="User's full name"
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Email (Optional)</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="user@example.com"
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Notes (Optional)</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Any additional notes..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                                    >
                                        Create User
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-medium rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Detail Modal */}
                {showDetailModal && selectedUser && (
                    <div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowDetailModal(false)}
                    >
                        <div
                            className="bg-white dark:bg-slate-800 rounded-2xl w-full md:max-w-2xl md:mx-auto max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 flex justify-between items-center p-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">User Details: {selectedUser.temporary_name}</h2>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="text-2xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                                        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Temporary Name</div>
                                        <div className="font-semibold text-slate-900 dark:text-white">{selectedUser.temporary_name}</div>
                                    </div>

                                    <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                                        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Status</div>
                                        <span
                                            className="px-3 py-1 rounded text-sm font-semibold text-white"
                                            style={{ backgroundColor: getStatusColor(selectedUser.status) }}
                                        >
                                            {getStatusLabel(selectedUser.status)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                                        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Check-ins</div>
                                        <div className="font-semibold text-slate-900 dark:text-white">{selectedUser.check_in_count || 0}</div>
                                    </div>

                                    <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                                        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Last Check-in</div>
                                        <div className="font-semibold text-slate-900 dark:text-white">
                                            {selectedUser.last_check_in
                                                ? new Date(selectedUser.last_check_in).toLocaleString()
                                                : 'Never'}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                                        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Created At</div>
                                        <div className="font-semibold text-slate-900 dark:text-white">
                                            {new Date(selectedUser.created_at).toLocaleString()}
                                        </div>
                                    </div>

                                    {selectedUser.verified_at && (
                                        <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                                            <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Verified At</div>
                                            <div className="font-semibold text-slate-900 dark:text-white">
                                                {new Date(selectedUser.verified_at).toLocaleString()}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {selectedUser.status === 'pending' && (
                                    <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-700">
                                        <h3 className="font-semibold text-slate-900 dark:text-white">Verify & Update Information</h3>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Full Name</label>
                                            <input
                                                type="text"
                                                value={verifyData.full_name}
                                                onChange={(e) => setVerifyData({ ...verifyData, full_name: e.target.value })}
                                                placeholder="User's full name"
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Email</label>
                                            <input
                                                type="email"
                                                value={verifyData.email}
                                                onChange={(e) => setVerifyData({ ...verifyData, email: e.target.value })}
                                                placeholder="user@example.com"
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Phone Number</label>
                                            <input
                                                type="tel"
                                                value={verifyData.phone_number}
                                                onChange={(e) =>
                                                    setVerifyData({ ...verifyData, phone_number: e.target.value })
                                                }
                                                placeholder="Phone number"
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">ESSL ID</label>
                                            <input
                                                type="text"
                                                value={verifyData.essl_id}
                                                onChange={(e) => setVerifyData({ ...verifyData, essl_id: e.target.value })}
                                                placeholder="ESSL ID"
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Notes</label>
                                            <textarea
                                                value={verifyData.notes}
                                                onChange={(e) => setVerifyData({ ...verifyData, notes: e.target.value })}
                                                placeholder="Additional notes..."
                                                rows={3}
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <button
                                                onClick={handleVerifyUser}
                                                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                                            >
                                                ✓ Verify & Save
                                            </button>
                                            <button
                                                onClick={handleRejectUser}
                                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                                            >
                                                ✗ Reject User
                                            </button>
                                            <button
                                                onClick={() => setShowDetailModal(false)}
                                                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-medium rounded-lg transition-colors"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {selectedUser.status !== 'pending' && (
                                    <div className="flex gap-3 pt-4">
                                        <button
                                            onClick={() => setShowDetailModal(false)}
                                            className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-medium rounded-lg transition-colors"
                                        >
                                            Close
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Bulk Edit Modal */}
                {showBulkEditModal && (
                    <div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowBulkEditModal(false)}
                    >
                        <div
                            className="bg-white dark:bg-slate-800 rounded-2xl w-full md:max-w-md md:mx-auto max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 flex justify-between items-center p-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Bulk Edit ({selectedUserIds.size} Users)</h2>
                                <button
                                    onClick={() => setShowBulkEditModal(false)}
                                    className="text-2xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Update Full Name (Optional)</label>
                                    <input
                                        type="text"
                                        value={bulkEditData.full_name}
                                        onChange={(e) => setBulkEditData({ ...bulkEditData, full_name: e.target.value })}
                                        placeholder="Assign name to all selected..."
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Update Status</label>
                                    <select
                                        value={bulkEditData.status}
                                        onChange={(e) => setBulkEditData({ ...bulkEditData, status: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="pending">Keep as Pending</option>
                                        <option value="verified">Mark as Verified</option>
                                        <option value="rejected">Mark as Rejected</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Notes (Appends to all)</label>
                                    <textarea
                                        value={bulkEditData.notes}
                                        onChange={(e) => setBulkEditData({ ...bulkEditData, notes: e.target.value })}
                                        placeholder="Bulk update notes..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={handleBulkUpdate}
                                        className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                                    >
                                        Update All
                                    </button>
                                    <button
                                        onClick={() => setShowBulkEditModal(false)}
                                        className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-medium rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

            export default AdminUnknownUsers;
