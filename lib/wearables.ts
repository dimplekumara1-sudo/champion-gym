
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_OPENWEARABLES_API_URL || 'http://localhost:8000/api/v1';
const API_KEY = import.meta.env.VITE_OPENWEARABLES_API_KEY || '';

export interface WearableProvider {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  logo_url?: string;
}

export interface WearableUser {
  id: string;
  external_user_id: string;
  email?: string;
}

export const wearableService = {
  async getProviders(): Promise<WearableProvider[]> {
    try {
      const response = await fetch(`${API_URL}/oauth/providers`, {
        headers: {
          'X-Open-Wearables-API-Key': API_KEY,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch providers');
      return await response.json();
    } catch (error) {
      console.error('Error fetching wearable providers:', error);
      return [];
    }
  },

  async getOrCreateUser(supabaseUserId: string, email?: string): Promise<WearableUser | null> {
    try {
      // First try to find if we already have this user in our local DB or cache
      // For now, let's just try to create/get from OpenWearables
      
      // We can try to list users and filter, but better to have a mapping in Supabase
      const { data: profile } = await supabase
        .from('profiles')
        .select('openwearables_user_id')
        .eq('id', supabaseUserId)
        .single();

      if (profile?.openwearables_user_id) {
        return { id: profile.openwearables_user_id, external_user_id: supabaseUserId };
      }

      // Create new user in OpenWearables
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'X-Open-Wearables-API-Key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          external_user_id: supabaseUserId,
          email: email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to create OpenWearables user:', errorData);
        return null;
      }

      const userData = await response.json();
      
      // Save the mapping back to Supabase
      await supabase
        .from('profiles')
        .update({ openwearables_user_id: userData.id })
        .eq('id', supabaseUserId);

      return userData;
    } catch (error) {
      console.error('Error in getOrCreateUser:', error);
      return null;
    }
  },

  getAuthorizeUrl(providerSlug: string, openWearablesUserId: string): string {
    return `${API_URL}/oauth/${providerSlug}/authorize?user_id=${openWearablesUserId}`;
  }
};
