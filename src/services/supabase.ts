import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Type definitions for user profile
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  username?: string;
  created_at: string;
  updated_at?: string;
}

// Type definitions for analysis history
export interface AnalysisHistoryRecord {
  id: string;
  user_id: string;
  analysis_data: any;
  overall_score?: number;
  image_url?: string;
  created_at: string;
}

// Helper function to get user profile
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data as UserProfile;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
};

// Helper function to update user profile
export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('Error updating user profile:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    return false;
  }
};

// Analysis History Database Functions
export const saveAnalysisToDatabase = async (
  userId: string,
  analysisData: any,
  overallScore?: number,
  imageUrl?: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('analysis_history')
      .insert({
        user_id: userId,
        analysis_data: analysisData,
        overall_score: overallScore,
        image_url: imageUrl,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving analysis to database:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Error in saveAnalysisToDatabase:', error);
    return null;
  }
};

export const getAnalysisHistory = async (userId: string): Promise<AnalysisHistoryRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('analysis_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching analysis history:', error);
      return [];
    }

    return data as AnalysisHistoryRecord[];
  } catch (error) {
    console.error('Error in getAnalysisHistory:', error);
    return [];
  }
};

export const deleteAnalysisFromDatabase = async (
  userId: string,
  analysisId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('analysis_history')
      .delete()
      .eq('id', analysisId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting analysis from database:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteAnalysisFromDatabase:', error);
    return false;
  }
};
