import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../config/constants';
import { Card } from '../components/ui/Card';
import { StatBadge } from '../components/dashboard/StatBadge';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { storageService } from '../services/storage';
import { AnalysisResult } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface UserProfile {
  username: string;
  joinDate: string;
  totalAnalyses: number;
  bestScore: number;
  currentStreak: number;
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  isUnlocked: boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_analysis',
    title: 'First Steps',
    description: 'Complete your first muscle analysis',
    icon: '🎯',
    isUnlocked: false,
  },
  {
    id: 'five_analyses',
    title: 'Getting Started',
    description: 'Complete 5 muscle analyses',
    icon: '📈',
    isUnlocked: false,
  },
  {
    id: 'ten_analyses',
    title: 'Dedicated Tracker',
    description: 'Complete 10 muscle analyses',
    icon: '🏃‍♂️',
    isUnlocked: false,
  },
  {
    id: 'high_score',
    title: 'Excellence',
    description: 'Achieve a score of 80 or higher',
    icon: '🏆',
    isUnlocked: false,
  },
  {
    id: 'perfect_score',
    title: 'Perfection',
    description: 'Achieve a perfect score of 100',
    icon: '💎',
    isUnlocked: false,
  },
  {
    id: 'weekly_streak',
    title: 'Consistency',
    description: 'Analyze for 7 consecutive days',
    icon: '🔥',
    isUnlocked: false,
  },
];

export const ProfileScreen = ({ navigation }: any) => {
  const { user, signOut, loading } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    username: user?.email?.split('@')[0] || 'User',
    joinDate: user?.created_at || new Date().toISOString(),
    totalAnalyses: 0,
    bestScore: 0,
    currentStreak: 0,
    achievements: ACHIEVEMENTS,
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Load analysis history to calculate stats
      const history = await storageService.getAnalysisHistory();
      const savedProfile = await storageService.getItem('userProfile');
      
      const totalAnalyses = history.length;
      const scores = history.map((a: AnalysisResult) => a.overallScore || 0);
      const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
      
      // Calculate achievements
      const updatedAchievements = ACHIEVEMENTS.map(achievement => {
        let isUnlocked = false;
        let unlockedAt = undefined;

        switch (achievement.id) {
          case 'first_analysis':
            isUnlocked = totalAnalyses >= 1;
            break;
          case 'five_analyses':
            isUnlocked = totalAnalyses >= 5;
            break;
          case 'ten_analyses':
            isUnlocked = totalAnalyses >= 10;
            break;
          case 'high_score':
            isUnlocked = bestScore >= 80;
            break;
          case 'perfect_score':
            isUnlocked = bestScore >= 100;
            break;
          case 'weekly_streak':
            // Simplified streak calculation
            isUnlocked = totalAnalyses >= 7;
            break;
        }

        if (isUnlocked && !achievement.isUnlocked) {
          unlockedAt = new Date().toISOString();
        }

        return {
          ...achievement,
          isUnlocked,
          unlockedAt: unlockedAt || achievement.unlockedAt,
        };
      });

      const updatedProfile = {
        ...profile,
        ...(savedProfile || {}),
        totalAnalyses,
        bestScore,
        achievements: updatedAchievements,
      };

      setProfile(updatedProfile);
      
      // Save updated profile
      await storageService.setItem('userProfile', updatedProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleEditUsername = async () => {
    if (!editUsername.trim()) {
      Alert.alert('Error', 'Please enter a valid username');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const updatedProfile = {
      ...profile,
      username: editUsername.trim(),
    };

    setProfile(updatedProfile);
    await storageService.setItem('userProfile', updatedProfile);
    setShowEditModal(false);
    setEditUsername('');
    
    Alert.alert('Success', 'Username updated successfully');
  };

  const resetProfile = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Reset Profile',
      'This will reset your profile data but keep your analysis history. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await storageService.removeItem('userProfile');
              const resetProfile = {
                ...profile,
                username: 'Devon',
                joinDate: new Date().toISOString(),
                achievements: ACHIEVEMENTS,
              };
              setProfile(resetProfile);
              Alert.alert('Success', 'Profile reset successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset profile');
            }
          }
        }
      ]
    );
  };

  const unlockedAchievements = profile.achievements.filter(a => a.isUnlocked);
  const totalAchievements = profile.achievements.length;

  // Show login screen if user is not authenticated
  if (!loading && !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginContainer}>
          <View style={styles.loginContent}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Text style={styles.logoEmoji}>💪</Text>
              </View>
              <Text style={styles.appName}>Muscle AI</Text>
              <Text style={styles.tagline}>Your Personal Fitness Analyzer</Text>
            </View>

            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Welcome Back</Text>
              <Text style={styles.welcomeSubtitle}>
                Sign in to access your fitness journey
              </Text>
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.googleButtonIcon}>G</Text>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.featuresSection}>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>📸</Text>
                <Text style={styles.featureText}>Analyze Photos</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>📊</Text>
                <Text style={styles.featureText}>Track Progress</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>🎯</Text>
                <Text style={styles.featureText}>Get Insights</Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Profile</Text>
              <Text style={styles.subtitle}>
                Track your achievements and progress
              </Text>
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={async () => {
                try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                const root = navigation.getParent?.()?.getParent?.();
                if (root?.navigate) root.navigate('Settings');
                else navigation.navigate('Settings');
              }}
            >
              <Icon name="cog-outline" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* User Info Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile.username.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.username}>{profile.username}</Text>
              <Text style={styles.joinDate}>
                Joined {new Date(profile.joinDate).toLocaleDateString()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {
                setEditUsername(profile.username);
                setShowEditModal(true);
              }}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsRow}>
            <StatBadge 
              label="Total Analyses" 
              value={profile.totalAnalyses.toString()} 
              unit="scans" 
              icon="📊" 
              style={styles.statCard} 
            />
            <StatBadge 
              label="Best Score" 
              value={profile.bestScore.toString()} 
              unit="pts" 
              icon="🏆" 
              style={styles.statCard} 
            />
          </View>
          <View style={styles.statsRow}>
            <StatBadge 
              label="Achievements" 
              value={`${unlockedAchievements.length}/${totalAchievements}`} 
              unit="unlocked" 
              icon="🎖️" 
              style={styles.statCard} 
            />
            <StatBadge 
              label="Current Streak" 
              value={profile.currentStreak.toString()} 
              unit="days" 
              icon="🔥" 
              style={styles.statCard} 
            />
          </View>
        </View>

        {/* Achievements Section */}
        <View style={styles.achievementsSection}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementsList}>
            {profile.achievements.map((achievement) => (
              <View
                key={achievement.id}
                style={[
                  styles.achievementItem,
                  !achievement.isUnlocked && styles.achievementLocked
                ]}
              >
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                <View style={styles.achievementInfo}>
                  <Text style={[
                    styles.achievementTitle,
                    !achievement.isUnlocked && styles.achievementTitleLocked
                  ]}>
                    {achievement.title}
                  </Text>
                  <Text style={[
                    styles.achievementDescription,
                    !achievement.isUnlocked && styles.achievementDescriptionLocked
                  ]}>
                    {achievement.description}
                  </Text>
                  {achievement.isUnlocked && achievement.unlockedAt && (
                    <Text style={styles.achievementDate}>
                      Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                {achievement.isUnlocked && (
                  <View style={styles.achievementBadge}>
                    <Text style={styles.achievementBadgeText}>✓</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('History')}
          >
            <Text style={styles.actionButtonText}>📚 View Full History</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await signOut();
            }}
          >
            <Text style={styles.actionButtonText}>🚪 Sign Out</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={resetProfile}
          >
            <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
              🔄 Reset Profile
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Username Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Username</Text>
            <TextInput
              style={styles.modalInput}
              value={editUsername}
              onChangeText={setEditUsername}
              placeholder="Enter new username"
              placeholderTextColor={COLORS.textSecondary}
              maxLength={20}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleEditUsername}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  settingsButton: {
    padding: 8,
    marginTop: -8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  profileCard: {
    padding: 20,
    marginBottom: 30,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  joinDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  editButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  statsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
  },
  achievementsSection: {
    marginBottom: 30,
  },
  achievementsList: {
    gap: 12,
  },
  achievementItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  achievementTitleLocked: {
    color: COLORS.textSecondary,
  },
  achievementDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  achievementDescriptionLocked: {
    color: COLORS.textSecondary,
  },
  achievementDate: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
  },
  achievementBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  actionsSection: {
    gap: 12,
  },
  actionButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  dangerButtonText: {
    color: COLORS.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.background,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Login screen styles
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginContent: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 40,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButtonIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  featuresSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
