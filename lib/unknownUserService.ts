/**
 * Unknown User Service
 * Manages temporary user allocation and conversion to actual user accounts
 */

import { supabase } from './supabase';
import { UnknownUser } from '../types';

export const unknownUserService = {
    /**
     * Generate a unique temporary name for an unknown user
     * Format: GYM_USER_XXXXX where X is a sequential number
     */
    async generateTemporaryName(prefix: string = 'GYM_USER'): Promise<string> {
        try {
            // Get current config
            const { data: config } = await supabase
                .from('app_settings')
                .select('value')
                .eq('id', 'unknown_users_config')
                .single();

            const currentPrefix = config?.value?.prefix || prefix;

            // Find the highest number currently used across ALL records
            const { data: allNames } = await supabase
                .from('unknown_users')
                .select('temporary_name');

            let nextNumber = 1;
            if (allNames && allNames.length > 0) {
                const numbers = allNames
                    .map(u => {
                        const match = u.temporary_name.match(/(\d+)$/);
                        return match ? parseInt(match[1], 10) : 0;
                    })
                    .filter(n => !isNaN(n));
                
                if (numbers.length > 0) {
                    nextNumber = Math.max(...numbers) + 1;
                }
            }

            // Pad with zeros (e.g., GYM_USER_00001)
            return `${currentPrefix}_${String(nextNumber).padStart(5, '0')}`;
        } catch (error) {
            console.error('Error generating temporary name:', error);
            throw error;
        }
    },

    /**
     * Create a new unknown user with temporary name
     */
    async createUnknownUser(
        data: {
            essl_id?: string;
            phone_number?: string;
            full_name?: string;
            email?: string;
            notes?: string;
            metadata?: any;
        },
        assignedById: string
    ): Promise<UnknownUser> {
        try {
            const temporaryName = await this.generateTemporaryName();

            const { data: newUser, error } = await supabase
                .from('unknown_users')
                .insert({
                    temporary_name: temporaryName,
                    essl_id: data.essl_id || null,
                    phone_number: data.phone_number || null,
                    full_name: data.full_name || null,
                    email: data.email || null,
                    notes: data.notes || null,
                    metadata: data.metadata || {},
                    assigned_by: assignedById,
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;
            return newUser;
        } catch (error) {
            console.error('Error creating unknown user:', error);
            throw error;
        }
    },

    /**
     * Get all unknown users with optional filters
     */
    async getAllUnknownUsers(
        status?: 'pending' | 'verified' | 'converted' | 'rejected'
    ): Promise<UnknownUser[]> {
        try {
            let query = supabase
                .from('unknown_users')
                .select('*')
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching unknown users:', error);
            throw error;
        }
    },

    /**
     * Get a specific unknown user by ID
     */
    async getUnknownUserById(id: string): Promise<UnknownUser | null> {
        try {
            const { data, error } = await supabase
                .from('unknown_users')
                .select('*')
                .eq('id', id)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
            return data || null;
        } catch (error) {
            console.error('Error fetching unknown user:', error);
            throw error;
        }
    },

    /**
     * Get a specific unknown user by ESSL ID
     */
    async getUnknownUserByEsslId(esslId: string): Promise<UnknownUser | null> {
        try {
            const { data, error } = await supabase
                .from('unknown_users')
                .select('*')
                .eq('essl_id', esslId)
                .maybeSingle();

            if (error) throw error;
            return data || null;
        } catch (error) {
            console.error('Error fetching unknown user by ESSL ID:', error);
            throw error;
        }
    },

    /**
     * Search unknown users by temporary name, phone, or essl_id
     */
    async searchUnknownUsers(searchTerm: string): Promise<UnknownUser[]> {
        try {
            const { data, error } = await supabase
                .from('unknown_users')
                .select('*')
                .or(
                    `temporary_name.ilike.%${searchTerm}%,` +
                    `phone_number.ilike.%${searchTerm}%,` +
                    `essl_id.ilike.%${searchTerm}%,` +
                    `full_name.ilike.%${searchTerm}%,` +
                    `email.ilike.%${searchTerm}%`
                )
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error searching unknown users:', error);
            throw error;
        }
    },

    /**
     * Update unknown user information
     */
    async updateUnknownUser(
        id: string,
        updates: Partial<UnknownUser>
    ): Promise<UnknownUser> {
        try {
            const { data, error } = await supabase
                .from('unknown_users')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating unknown user:', error);
            throw error;
        }
    },

    /**
     * Bulk update unknown users
     */
    async bulkUpdateUnknownUsers(
        ids: string[],
        updates: Partial<UnknownUser>
    ): Promise<void> {
        try {
            const { error } = await supabase
                .from('unknown_users')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .in('id', ids);

            if (error) throw error;
        } catch (error) {
            console.error('Error bulk updating unknown users:', error);
            throw error;
        }
    },

    /**
     * Convert unknown user to verified status and link to actual profile
     */
    async verifyUnknownUser(
        unknownUserId: string,
        profileData: {
            full_name: string;
            email?: string;
            phone_number?: string;
            essl_id?: string;
        },
        verifiedById: string
    ): Promise<UnknownUser> {
        try {
            return await this.updateUnknownUser(unknownUserId, {
                status: 'verified',
                verified_at: new Date().toISOString(),
                full_name: profileData.full_name,
                email: profileData.email || undefined,
                phone_number: profileData.phone_number || undefined,
                essl_id: profileData.essl_id || undefined,
                assigned_by: verifiedById
            });
        } catch (error) {
            console.error('Error verifying unknown user:', error);
            throw error;
        }
    },

    /**
     * Record a check-in for an unknown user
     */
    async recordCheckIn(unknownUserId: string): Promise<UnknownUser> {
        try {
            const user = await this.getUnknownUserById(unknownUserId);
            if (!user) throw new Error('Unknown user not found');

            return await this.updateUnknownUser(unknownUserId, {
                check_in_count: (user.check_in_count || 0) + 1,
                last_check_in: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error recording check-in:', error);
            throw error;
        }
    },

    /**
     * Convert unknown user to actual profile (when admin creates account)
     */
    async convertToProfile(
        unknownUserId: string,
        newUserId: string
    ): Promise<void> {
        try {
            await this.updateUnknownUser(unknownUserId, {
                status: 'converted',
                verified_at: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error converting unknown user to profile:', error);
            throw error;
        }
    },

    /**
     * Reject an unknown user
     */
    async rejectUnknownUser(unknownUserId: string, notes: string = ''): Promise<UnknownUser> {
        try {
            return await this.updateUnknownUser(unknownUserId, {
                status: 'rejected',
                notes: notes || 'Rejected by admin'
            });
        } catch (error) {
            console.error('Error rejecting unknown user:', error);
            throw error;
        }
    },

    /**
     * Get pending unknown users count
     */
    async getPendingCount(): Promise<number> {
        try {
            const { count, error } = await supabase
                .from('unknown_users')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Error getting pending count:', error);
            return 0;
        }
    },

    /**
     * Get dashboard statistics
     */
    async getStatistics(): Promise<{
        total: number;
        pending: number;
        verified: number;
        converted: number;
        rejected: number;
        totalCheckIns: number;
    }> {
        try {
            const { data, error } = await supabase
                .from('unknown_users')
                .select('status, check_in_count');

            if (error) throw error;

            const stats = {
                total: data?.length || 0,
                pending: data?.filter(u => u.status === 'pending').length || 0,
                verified: data?.filter(u => u.status === 'verified').length || 0,
                converted: data?.filter(u => u.status === 'converted').length || 0,
                rejected: data?.filter(u => u.status === 'rejected').length || 0,
                totalCheckIns: data?.reduce((sum, u) => sum + (u.check_in_count || 0), 0) || 0
            };

            return stats;
        } catch (error) {
            console.error('Error getting statistics:', error);
            return {
                total: 0,
                pending: 0,
                verified: 0,
                converted: 0,
                rejected: 0,
                totalCheckIns: 0
            };
        }
    },

    /**
     * Scan attendance table for ESSL IDs that don't belong to any profile
     * and aren't already in unknown_users
     */
    async discoverUnknownUsers(adminId: string): Promise<number> {
        try {
            // 1. Get all unique ESSL IDs from attendance where user_id is NULL
            // We use pagination to ensure we get the "entire" database
            let allUnknownAttendances: any[] = [];
            let lastId = null;
            let hasMore = true;
            const PAGE_SIZE = 1000;

            while (hasMore) {
                let query = supabase
                    .from('attendance')
                    .select('id, essl_id, raw_data')
                    .is('user_id', null)
                    .order('id', { ascending: true })
                    .limit(PAGE_SIZE);
                
                if (lastId) {
                    query = query.gt('id', lastId);
                }

                const { data, error: attError } = await query;

                if (attError) throw attError;
                if (!data || data.length === 0) {
                    hasMore = false;
                } else {
                    allUnknownAttendances = [...allUnknownAttendances, ...data];
                    lastId = data[data.length - 1].id;
                    if (data.length < PAGE_SIZE) hasMore = false;
                }
            }

            if (allUnknownAttendances.length === 0) return 0;

            // Filter out common "empty" IDs and get unique ones
            // Use robust ID extraction logic
            const uniqueEsslIds = [...new Set(allUnknownAttendances.map(a => {
                return a.essl_id || 
                       a.raw_data?.essl_id || 
                       a.raw_data?.UserId || 
                       a.raw_data?.EmployeeCode || 
                       a.raw_data?.PIN;
            }).filter(id => id && id !== '0' && id !== '0000'))];

            if (uniqueEsslIds.length === 0) return 0;

            // 2. Get existing profiles with ESSL IDs
            const { data: profiles, error: profError } = await supabase
                .from('profiles')
                .select('essl_id')
                .not('essl_id', 'is', null);

            if (profError) throw profError;
            const existingProfileEsslIds = new Set(profiles?.map(p => p.essl_id) || []);

            // 3. Get existing unknown users with ESSL IDs
            const { data: existingUnknowns, error: unkError } = await supabase
                .from('unknown_users')
                .select('essl_id')
                .not('essl_id', 'is', null);

            if (unkError) throw unkError;
            const existingUnknownEsslIds = new Set(existingUnknowns?.map(u => u.essl_id) || []);

            // 4. Filter IDs that are truly new and unknown
            const newEsslIds = uniqueEsslIds.filter(id => 
                !existingProfileEsslIds.has(id) && 
                !existingUnknownEsslIds.has(id)
            );

            if (newEsslIds.length === 0) return 0;

            // 5. Prepare batch insertion
            // Get starting number for temporary names - Find the TRUE maximum number currently in use
            const { data: allNames } = await supabase
                .from('unknown_users')
                .select('temporary_name');

            let nextNumber = 1;
            if (allNames && allNames.length > 0) {
                const numbers = allNames
                    .map(u => {
                        const match = u.temporary_name.match(/(\d+)$/);
                        return match ? parseInt(match[1], 10) : 0;
                    })
                    .filter(n => !isNaN(n));
                
                if (numbers.length > 0) {
                    nextNumber = Math.max(...numbers) + 1;
                }
            }

            const { data: config } = await supabase
                .from('app_settings')
                .select('value')
                .eq('id', 'unknown_users_config')
                .single();

            const prefix = config?.value?.prefix || 'GYM_USER';

            const usersToInsert = [];
            
            // Pre-process attendances to include the extracted ID for matching
            const processedAttendances = allUnknownAttendances.map(a => ({
                ...a,
                extractedId: a.essl_id || 
                           a.raw_data?.essl_id || 
                           a.raw_data?.UserId || 
                           a.raw_data?.EmployeeCode || 
                           a.raw_data?.PIN
            }));
            
            for (const esslId of newEsslIds) {
                // Get check-in count for this specific ID
                const checkInCount = processedAttendances.filter(a => a.extractedId === esslId).length;

                const temporaryName = `${prefix}_${String(nextNumber).padStart(5, '0')}`;
                nextNumber++;

                usersToInsert.push({
                    temporary_name: temporaryName,
                    essl_id: esslId,
                    status: 'pending',
                    assigned_by: adminId,
                    check_in_count: checkInCount,
                    // We don't have the check_in date in the first select, let's just use current time or re-query if needed
                    // For efficiency, let's just insert basic info and counts
                    last_check_in: new Date().toISOString() 
                });
            }

            // Perform batch insertion
            const { data: inserted, error: insertError } = await supabase
                .from('unknown_users')
                .insert(usersToInsert)
                .select();

            if (insertError) {
                console.error('Error batch inserting unknown users:', insertError);
                throw insertError;
            }

            return inserted?.length || 0;
        } catch (error) {
            console.error('Error discovering unknown users:', error);
            throw error;
        }
    },

    /**
     * Export unknown users as CSV
     */
    exportAsCSV(users: UnknownUser[]): string {
        const headers = [
            'Temporary Name',
            'ESSL ID',
            'Phone',
            'Full Name',
            'Email',
            'Status',
            'Check-ins',
            'Assigned At',
            'Notes'
        ];

        const rows = users.map(user => [
            user.temporary_name,
            user.essl_id || '',
            user.phone_number || '',
            user.full_name || '',
            user.email || '',
            user.status,
            user.check_in_count || 0,
            new Date(user.assigned_at).toLocaleDateString(),
            user.notes || ''
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return csv;
    }
};
