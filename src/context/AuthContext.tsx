import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, UserProfile, getUserProfile } from '../services/supabase';
import { Alert } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    checkUser();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (session) {
        setSession(session);
        setUser(session.user);
        
        // Fetch user profile
        const userProfile = await getUserProfile(session.user.id);
        if (userProfile) {
          setProfile(userProfile);
        } else {
          // Create profile if it doesn't exist
          await createProfile(session.user);
        }
        
        setLoading(false);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        setLoading(false);
        return;
      }

      if (session) {
        setSession(session);
        setUser(session.user);
        
        // Fetch user profile
        const userProfile = await getUserProfile(session.user.id);
        if (userProfile) {
          setProfile(userProfile);
        } else {
          // Create profile if it doesn't exist
          await createProfile(session.user);
        }
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async (user: User) => {
    try {
      const profileData = {
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
        username: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .insert([profileData]);

      if (error && error.code !== '23505') { // Ignore duplicate key error
        console.error('Error creating profile:', error);
      } else {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error in createProfile:', error);
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Use direct deep link approach to avoid SSL certificate issues
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'muscleai',
        path: 'auth/callback',
      });

      console.log('Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('Error signing in with Google:', error);
        Alert.alert('Authentication Error', 'Failed to sign in with Google. Please try again.');
        return;
      }

      if (data?.url) {
        console.log('Opening OAuth URL:', data.url);
        
        // Open the OAuth URL in browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        console.log('OAuth result:', result);

        if (result.type === 'success' && result.url) {
          // Handle the redirect URL
          const url = new URL(result.url);
          const fragment = url.hash.substring(1); // Remove the # symbol
          const params = new URLSearchParams(fragment);
          
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (sessionError) {
              console.error('Error setting session:', sessionError);
              Alert.alert('Authentication Error', 'Failed to complete sign in. Please try again.');
            }
          } else {
            console.error('No tokens found in redirect URL');
            Alert.alert('Authentication Error', 'Failed to get authentication tokens. Please try again.');
          }
        } else if (result.type === 'cancel') {
          console.log('User cancelled OAuth flow');
        } else {
          console.log('OAuth flow failed:', result);
        }
      }
    } catch (error) {
      console.error('Error in signInWithGoogle:', error);
      Alert.alert('Authentication Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
        Alert.alert('Sign Out Error', 'Failed to sign out. Please try again.');
      } else {
        setUser(null);
        setSession(null);
        setProfile(null);
      }
    } catch (error) {
      console.error('Error in signOut:', error);
      Alert.alert('Sign Out Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const userProfile = await getUserProfile(user.id);
      if (userProfile) {
        setProfile(userProfile);
      }
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signInWithGoogle,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
