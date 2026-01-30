import { supabase } from './supabase';

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

// Get all notifications for current user
export async function getUserNotifications(): Promise<PushNotification[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found for getUserNotifications');
      return [];
    }

    console.log('Fetching notifications for user:', user.id);
    
    // Simplified approach: Get notifications directly
    const { data, error } = await supabase
      .from('push_notifications')
      .select('*')
      .or(`target_user.eq.${user.id},target_user.is.null`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    console.log('Fetched notifications:', data);
    console.log('Number of notifications:', data?.length || 0);
    
    return data || [];
  } catch (error) {
    console.error('Unexpected error in getUserNotifications:', error);
    return [];
  }
}

// Get unread count for current user
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found for getUnreadNotificationCount');
      return 0;
    }

    const { data, error } = await supabase
      .from('push_notifications')
      .select('id', { count: 'exact' })
      .eq('is_read', false)
      .or(`target_user.eq.${user?.id},target_user.is.null`);

    if (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }

    const count = data?.length || 0;
    console.log('Unread count:', count);
    return count;
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