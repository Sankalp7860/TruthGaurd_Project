import { supabase } from './supabase';

interface DeepfakeScanData {
  userEmail: string;
  scanResult: 'REAL' | 'FAKE' | 'SUSPECT';
  fileType: 'image' | 'video' | 'audio';
  riskScore: number;
}

/**
 * Track a deepfake scan in the database
 * This will automatically update the user's scan count via database trigger
 */
export async function trackDeepfakeScan(data: DeepfakeScanData): Promise<void> {
  try {
    const { error } = await supabase
      .from('deepfake_scans')
      .insert([{
        user_email: data.userEmail,
        scan_result: data.scanResult,
        file_type: data.fileType,
        risk_score: data.riskScore,
        created_at: new Date().toISOString(),
      }]);

    if (error) {
      console.error('Error tracking deepfake scan:', error);
      throw error;
    }

    console.log('Deepfake scan tracked successfully');
  } catch (error) {
    console.error('Failed to track deepfake scan:', error);
    // Don't throw - we don't want tracking to break the main flow
  }
}

/**
 * Get user's scan history
 */
export async function getUserScanHistory(userEmail: string, limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('deepfake_scans')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching scan history:', error);
    return [];
  }
}

/**
 * Get user statistics
 */
export async function getUserStatistics(userEmail: string) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('deepfake_scans_count, posts_count, total_likes_received')
      .eq('email', userEmail)
      .single();

    if (error) throw error;

    return {
      deepfakeScans: data?.deepfake_scans_count || 0,
      postsCount: data?.posts_count || 0,
      totalLikes: data?.total_likes_received || 0,
    };
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    return {
      deepfakeScans: 0,
      postsCount: 0,
      totalLikes: 0,
    };
  }
}
