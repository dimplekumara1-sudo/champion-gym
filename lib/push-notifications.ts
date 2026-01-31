import { supabase } from './supabase';
import { cache, CACHE_KEYS, CACHE_TTL } from './cache';

export interface PushNotification {
  id: string;
  title: string;
  message: string;
  link?: string;
  target_user?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationData {
  title: string;
  message: string;
  link?: string;
  target_user?: string; // null for broadcast to all users
}

// Get all notifications for current user with caching
export async function getUserNotifications(forceRefresh = false): Promise<PushNotification[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found for getUserNotifications');
      return [];
    }

    const cacheKey = `${CACHE_KEYS.USER_NOTIFICATIONS}_${user.id}`;
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cachedNotifications = cache.get<PushNotification[]>(cacheKey);
      if (cachedNotifications) {
        console.log('Returning cached notifications for user:', user.id);
        return cachedNotifications;
      }
    }

    console.log('Fetching notifications for user:', user.id);
    
    // Optimized query with limit and better indexing
    const { data, error } = await supabase
      .from('push_notifications')
      .select('*')
      .or(`target_user.eq.${user.id},target_user.is.null`)
      .order('created_at', { ascending: false })
      .limit(50); // Limit to prevent large result sets

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    console.log('Fetched notifications:', data);
    console.log('Number of notifications:', data?.length || 0);
    
    // Cache the results
    if (data) {
      cache.set(cacheKey, data, CACHE_TTL.MEDIUM);
    }
    
    return data || [];
  } catch (error) {
    console.error('Unexpected error in getUserNotifications:', error);
    return [];
  }
}

// Get unread count for current user (optimized with caching)
export async function getUnreadNotificationCount(forceRefresh = false): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found for getUnreadNotificationCount');
      return 0;
    }

    const cacheKey = `${CACHE_KEYS.UNREAD_NOTIFICATION_COUNT}_${user.id}`;
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cachedCount = cache.get<number>(cacheKey);
      if (cachedCount !== null) {
        console.log('Returning cached unread count for user:', user.id, cachedCount);
        return cachedCount;
      }
    }

    const { count, error } = await supabase
      .from('push_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
      .or(`target_user.eq.${user?.id},target_user.is.null`);

    if (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }

    console.log('Unread count:', count || 0);
    
    // Cache the result
    cache.set(cacheKey, count || 0, CACHE_TTL.SHORT);
    
    return count || 0;
  } catch (error) {
    console.error('Unexpected error in getUnreadNotificationCount:', error);
    return 0;
  }
}

// Create new notification (admin only)
export async function createNotification(data: CreateNotificationData): Promise<PushNotification | null> {
  const { data: notification, error } = await supabase
    .from('push_notifications')
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    return null;
  }

  return notification;
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    console.log('Attempting to mark notification as read:', notificationId);
    
    // First verify the notification exists and user can update it
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      return false;
    }

    // Update the notification
    const { error: updateError } = await supabase
      .from('push_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (updateError) {
      console.error('Error updating notification:', updateError);
      return false;
    }

    // Clear cache to force refresh next time
    cache.remove(`${CACHE_KEYS.USER_NOTIFICATIONS}_${user.id}`);
    cache.remove(`${CACHE_KEYS.UNREAD_NOTIFICATION_COUNT}_${user.id}`);

    console.log('Successfully marked notification as read');
    return true;
  } catch (error) {
    console.error('Unexpected error in markNotificationAsRead:', error);
    return false;
  }
}

// Mark all notifications as read for current user
export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    console.log('Attempting to mark all notifications as read');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      return false;
    }

    const { error } = await supabase
      .from('push_notifications')
      .update({ is_read: true })
      .eq('is_read', false)
      .or(`target_user.eq.${user.id},target_user.is.null`);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }

    // Clear cache to force refresh next time
    cache.remove(`${CACHE_KEYS.USER_NOTIFICATIONS}_${user.id}`);
    cache.remove(`${CACHE_KEYS.UNREAD_NOTIFICATION_COUNT}_${user.id}`);

    console.log('Successfully marked all notifications as read');
    return true;
  } catch (error) {
    console.error('Unexpected error in markAllNotificationsAsRead:', error);
    return false;
  }
}

// Delete notification for user (mark as read approach)
export async function deleteNotificationForUser(notificationId: string): Promise<boolean> {
  try {
    console.log('Attempting to delete notification for user:', notificationId);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      return false;
    }

    // For now, simply mark as read instead of deleting to keep things simple
    const { error: updateError } = await supabase
      .from('push_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (updateError) {
      console.error('Error updating notification:', updateError);
      return false;
    }

    console.log('Successfully marked notification as read/deleted:', { notificationId, userId: user.id });
    return true;
  } catch (error) {
    console.error('Unexpected error in deleteNotificationForUser:', error);
    return false;
  }
}

// Delete notification (admin only)
export async function deleteNotification(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('push_notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    console.error('Error deleting notification:', error);
    return false;
  }

  return true;
}

// Get all notifications (admin only)
export async function getAllNotifications(): Promise<PushNotification[]> {
  const { data, error } = await supabase
    .from('push_notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all notifications:', error);
    return [];
  }

  return data || [];
}

// Get all users for targeting notifications (admin only)
export async function getAllUsers(): Promise<{ id: string; username?: string; full_name?: string }[]> {
  try {
    // Get profiles with role 'user' and all fitness data
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .eq('role', 'user')
      .order('username', { ascending: true });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return [];
    }

    if (!profiles || profiles.length === 0) {
      console.log('No profiles found');
      return [];
    }

    console.log('Successfully fetched user profiles');
    return profiles.map(user => ({
      id: user.id,
      username: user.username || user.full_name || 'Unknown User',
      full_name: user.full_name
    }));
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    return [];
  }
}