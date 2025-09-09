import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../config/constants';
import { Card } from '../components/ui/Card';
import { StatBadge } from '../components/dashboard/StatBadge';
import { RingStat } from '../components/dashboard/RingStat';
import { Chip } from '../components/ui/Chip';
import { ResponsiveHeader } from '../components/ui/ResponsiveHeader';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const DAYS = ['S','M','T','W','T','F','S'] as const;
const DATES = [4,5,6,7,8,9,10] as const;

export const HomeScreen = ({ navigation }: any) => {
  const isSmall = width < 380;
  const ringSize = isSmall ? 90 : 110;
  const { user, profile } = useAuth();

  // Get display name from user data - only first word
  const fullName = profile?.username || profile?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const displayName = fullName.split(' ')[0];

  const navigateToAnalyze = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Analyze');
  }, [navigation]);

  const onSettingsPress = useCallback(() => {
    const root = navigation.getParent?.()?.getParent?.();
    if (root?.navigate) root.navigate('Settings');
    else if (navigation.navigate) navigation.navigate('Settings');
  }, [navigation]);

  const onNotificationPress = useCallback(() => {
    // Handle notification press - could navigate to notifications screen
    console.log('Notification pressed');
  }, []);

  const colStyle = useMemo(() => [styles.col, isSmall ? styles.fullWidth : undefined], [isSmall]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ResponsiveHeader
          userName={displayName}
          userAvatar={profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture}
          subtitle="Get ready"
          onSettingsPress={onSettingsPress}
          onNotificationPress={onNotificationPress}
        />

        {/* Dashboard (decorative stats to enhance design) */}
        <View style={styles.dashboardSection}>
          {/* Calendar */}
          <Card style={styles.fullCard}>
            <View style={styles.calendarHeader}>
              <Text style={styles.cardTitle}>August 2025</Text>
              <View style={styles.calendarArrows}>
                <Text style={styles.arrow}>←</Text>
                <Text style={styles.arrow}>→</Text>
              </View>
            </View>
            <View style={styles.calendarDaysRow}>
              {DAYS.map((d, index) => (
                <Text key={`day-${index}`} style={styles.calendarDayLabel}>{d}</Text>
              ))}
            </View>
            <View style={styles.calendarDatesRow}>
              {DATES.map((d) => (
                <View key={d} style={[styles.calendarDateWrap, d === 7 && styles.calendarSelected]}>
                  <Text style={[styles.calendarDateText, d === 7 && styles.calendarSelectedText]}>{d}</Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Quick stats row */}
          <View style={[styles.row, isSmall && styles.wrap]}>
            <StatBadge label="Calories Burnt" value="1.4k" unit="kCal" icon="🔥" style={colStyle} />
            <StatBadge label="Distance Covered" value="3.8" unit="km" icon="🏃‍♂️" style={colStyle} />
          </View>


          {/* Sleep/heart mini cards */}
          <View style={[styles.row, isSmall && styles.wrap]}>
            <StatBadge label="Total Hours" value="7.5" unit="hours" icon="🛌" style={colStyle} />
            <StatBadge label="Time in Bed" value="5.5" unit="hours" icon="🛏️" style={colStyle} />
          </View>
          <View style={[styles.row, isSmall && styles.wrap]}>
            <StatBadge label="Restfulness" value="82" unit="%" icon="🌙" style={colStyle} />
            <StatBadge label="Resting HR" value="60" unit="bpm" icon="❤️" style={colStyle} />
          </View>

        </View>

        {/* Quick Action */}
        <Card style={styles.quickActionCard}>
          <Text style={styles.quickActionTitle}>Ready to Analyze?</Text>
          <Text style={styles.quickActionSubtitle}>
            Take a photo and get AI-powered muscle analysis
          </Text>
          <TouchableOpacity
            style={styles.analyzeButton}
            onPress={navigateToAnalyze}
          >
            <Text style={styles.analyzeButtonText}>🔍 Start Analysis</Text>
          </TouchableOpacity>
        </Card>


      </ScrollView>

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
    alignItems: 'center',
    marginBottom: 30,
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
  actionSection: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 30,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cameraButton: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  galleryButton: {
    borderColor: COLORS.secondary,
    borderWidth: 2,
  },
  actionButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  imagePreview: {
    alignItems: 'center',
    marginBottom: 30,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  previewImage: {
    width: width * 0.6,
    height: width * 0.8,
    borderRadius: 12,
    marginBottom: 16,
  },
  analyzeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  dashboardSection: {
    gap: 14,
    marginBottom: 30,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  col: {
    flex: 1,
  },
  fullCard: {
    padding: 16,
  },
  ringsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 8,
    paddingVertical: 8,
  },
  ringItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    minWidth: 100,
    marginBottom: 8,
  },
  cardTitle: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 12,
  },
  calendarCard: {
    padding: 16,
  },
  wrap: {
    flexWrap: 'wrap',
  },
  half: {
    flex: 1,
  },
  fullWidth: {
    width: '100%',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarArrows: {
    flexDirection: 'row',
    gap: 8,
  },
  arrow: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  calendarDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  calendarDayLabel: {
    color: COLORS.textSecondary,
    width: 24,
    textAlign: 'center',
    fontSize: 12,
  },
  calendarDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  calendarDateWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calendarSelected: {
    backgroundColor: '#5E5CE6',
    borderColor: '#5E5CE6',
  },
  calendarDateText: {
    color: COLORS.text,
    fontSize: 12,
  },
  calendarSelectedText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  coachRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  coachName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  coachSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  coachBio: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  stepContainer: {
    gap: 12,
  },
  step: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  utilitySection: {
    gap: 12,
  },
  utilityButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  utilityButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  progressOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressModal: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    minWidth: width * 0.8,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  progressMessage: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.background,
    borderRadius: 3,
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  retryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  cancelButton: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActionCard: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  quickActionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  quickActionSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 28,
  },
  coachInfo: {
    flex: 1,
  },
});

