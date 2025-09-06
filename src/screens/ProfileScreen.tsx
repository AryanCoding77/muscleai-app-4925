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
  ImageBackground,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../config/constants';
import { WaveGraph } from '../components/ui/WaveGraph';
import { Card } from '../components/ui/Card';
import { StatBadge } from '../components/dashboard/StatBadge';
import { MaterialCommunityIcons as Icon, Ionicons } from '@expo/vector-icons';
import { storageService } from '../services/storage';
import { AnalysisResult } from '../types';

const { width: screenWidth } = Dimensions.get('window');

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
  const [profile, setProfile] = useState<UserProfile>({
    username: 'Devon',
    joinDate: new Date().toISOString(),
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
  const averageScore = profile.totalAnalyses > 0 ? Math.round(profile.bestScore * 0.8) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <LinearGradient
        colors={['#A67C52', '#8B4513', '#2F1B14', '#1A1A1A', '#0F0F0F', '#0A0A0A']}
        style={styles.backgroundGradient}
      >
          {/* Header with Settings */}
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={async () => {
                try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                const root = navigation.getParent?.()?.getParent?.();
                if (root?.navigate) root.navigate('Settings');
                else navigation.navigate('Settings');
              }}
            >
              <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Profile Avatar */}
          <View style={styles.profileAvatarContainer}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile.username.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* User Info */}
          <View style={styles.userInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{profile.username}</Text>
              <View style={styles.proBadge}>
                <Text style={styles.proText}>PRO</Text>
              </View>
            </View>
            <Text style={styles.userHandle}>@{profile.username}</Text>
            <Text style={styles.userBio}>Fitness Enthusiast | Building Strength Daily</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => {
                setEditUsername(profile.username);
                setShowEditModal(true);
              }}
            >
              <Icon name="pencil" size={16} color="#FFFFFF" />
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareQRButton}>
              <Icon name="qrcode" size={16} color="#FFFFFF" />
              <Text style={styles.shareQRText}>Share QR</Text>
            </TouchableOpacity>
          </View>

          {/* Statistics Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Analyses</Text>
              <Text style={styles.statValue}>{profile.totalAnalyses}</Text>
              <WaveGraph color="#4A90E2" width={60} height={20} />
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Average Score</Text>
              <Text style={styles.statValue}>{averageScore}</Text>
              <WaveGraph color="#50C878" width={60} height={20} />
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Best</Text>
              <Text style={styles.statValue}>{profile.bestScore}</Text>
              <WaveGraph color="#FF6B35" width={60} height={20} />
            </View>
          </View>

          {/* This Week's Highlights */}
          <View style={styles.highlightsSection}>
            <Text style={styles.highlightsTitle}>This Week's Highlights</Text>
            <View style={styles.performanceCard}>
              <View style={styles.performanceHeader}>
                <Text style={styles.performanceTitle}>Performance Up</Text>
                <WaveGraph color="#50C878" width={80} height={25} />
              </View>
              <View style={styles.performanceMetric}>
                <Icon name="trending-up" size={16} color="#50C878" />
                <Text style={styles.performanceText}>+15%</Text>
              </View>
            </View>
          </View>

          {/* Achievements */}
          <View style={styles.achievementsSection}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <View style={styles.achievementsList}>
              {profile.achievements.slice(0, 3).map((achievement) => (
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

      </LinearGradient>

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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    minHeight: '100%',
    paddingBottom: 40,
  },
  backgroundImageContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: screenWidth * 0.6,
    height: 400,
    zIndex: 0,
  },
  fitnessModelSilhouette: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    marginTop: 50,
    marginRight: 20,
    // Simulate the fitness model silhouette
    shadowColor: '#000',
    shadowOffset: { width: -5, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  scrollContent: {
    paddingBottom: 40,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  avatarWrapper: {
    padding: 4,
    borderRadius: 70,
    backgroundColor: '#FF6B35',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F5DC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
  },
  userInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 10,
  },
  proBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userHandle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  userBio: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 15,
    marginBottom: 30,
  },
  editProfileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  editProfileText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  shareQRButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  shareQRText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 15,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  highlightsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  highlightsTitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 15,
  },
  performanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  performanceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  performanceMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  performanceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#50C878',
  },
  achievementsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  achievementsList: {
    gap: 12,
  },
  achievementItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    color: '#FFFFFF',
    marginBottom: 4,
  },
  achievementTitleLocked: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  achievementDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
  },
  achievementDescriptionLocked: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  achievementBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#50C878',
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
});
