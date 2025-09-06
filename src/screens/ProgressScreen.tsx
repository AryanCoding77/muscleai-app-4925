import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../config/constants';
import { Card } from '../components/ui/Card';
import { StatBadge } from '../components/dashboard/StatBadge';
import { storageService } from '../services/storage';
import type { AnalysisResult } from '../types';

const { width } = Dimensions.get('window');

export const ProgressScreen = ({ navigation }: any) => {
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalysisHistory();
  }, []);

  const loadAnalysisHistory = async () => {
    try {
      const history = await storageService.getAnalysisHistory();
      setAnalysisHistory(history);
    } catch (error) {
      console.error('Error loading analysis history:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Clear History',
      'This will remove all your analysis history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await storageService.clearAnalysisHistory();
              setAnalysisHistory([]);
              Alert.alert('Success', 'Analysis history cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear history');
            }
          }
        }
      ]
    );
  };

  const getProgressStats = () => {
    if (analysisHistory.length === 0) {
      return {
        totalAnalyses: 0,
        avgScore: 0,
        bestScore: 0,
        improvement: 0
      };
    }

    const totalAnalyses = analysisHistory.length;
    const scores = analysisHistory.map(a => a.overallScore || 0);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const bestScore = Math.max(...scores);
    
    // Calculate improvement (compare first vs last 3 analyses)
    let improvement = 0;
    if (totalAnalyses >= 2) {
      const firstScore = scores[0];
      const recentScores = scores.slice(-3);
      const recentAvg = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
      improvement = ((recentAvg - firstScore) / firstScore) * 100;
    }

    return {
      totalAnalyses,
      avgScore: Math.round(avgScore),
      bestScore: Math.round(bestScore),
      improvement: Math.round(improvement)
    };
  };

  const navigateToComparison = (analysis: AnalysisResult) => {
    navigation.navigate('Comparison', { analysis });
  };

  const stats = getProgressStats();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Progress Tracking</Text>
          <Text style={styles.subtitle}>
            Monitor your muscle development journey over time
          </Text>
        </View>

        {/* Progress Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <StatBadge 
              label="Total Analyses" 
              value={stats.totalAnalyses.toString()} 
              unit="scans" 
              icon="📊" 
              style={styles.statCard} 
            />
            <StatBadge 
              label="Average Score" 
              value={stats.avgScore.toString()} 
              unit="pts" 
              icon="📈" 
              style={styles.statCard} 
            />
          </View>
          <View style={styles.statsRow}>
            <StatBadge 
              label="Best Score" 
              value={stats.bestScore.toString()} 
              unit="pts" 
              icon="🏆" 
              style={styles.statCard} 
            />
            <StatBadge 
              label="Improvement" 
              value={stats.improvement > 0 ? `+${stats.improvement}` : stats.improvement.toString()} 
              unit="%" 
              icon={stats.improvement >= 0 ? "📈" : "📉"} 
              style={styles.statCard} 
            />
          </View>
        </View>

        {/* Analysis History */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Analysis History</Text>
            {analysisHistory.length > 0 && (
              <TouchableOpacity onPress={clearHistory}>
                <Text style={styles.clearButton}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {analysisHistory.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Analysis History</Text>
              <Text style={styles.emptyText}>
                Start analyzing your muscles to track progress over time
              </Text>
              <TouchableOpacity 
                style={styles.startButton}
                onPress={() => navigation.navigate('Analyze')}
              >
                <Text style={styles.startButtonText}>Start First Analysis</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <View style={styles.historyList}>
              {analysisHistory.slice(0, 10).map((analysis, index) => (
                <TouchableOpacity
                  key={analysis.id}
                  style={styles.historyItem}
                  onPress={() => navigateToComparison(analysis)}
                >
                  <View style={styles.historyContent}>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyDate}>
                        {new Date(analysis.timestamp).toLocaleDateString()}
                      </Text>
                      <Text style={styles.historyMuscle}>
                        {analysis.muscleGroup || 'General Analysis'}
                      </Text>
                    </View>
                    <View style={styles.historyScore}>
                      <Text style={styles.scoreValue}>
                        {analysis.overallScore || 0}
                      </Text>
                      <Text style={styles.scoreLabel}>pts</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              
              {analysisHistory.length > 10 && (
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => navigation.navigate('History')}
                >
                  <Text style={styles.viewAllText}>
                    View All {analysisHistory.length} Analyses
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Progress Tips */}
        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Progress Tips</Text>
          <View style={styles.tipsList}>
            <Text style={styles.tip}>• Take photos in consistent lighting</Text>
            <Text style={styles.tip}>• Use the same angles for better comparison</Text>
            <Text style={styles.tip}>• Analyze regularly to track improvements</Text>
            <Text style={styles.tip}>• Follow AI recommendations for better results</Text>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
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
  statsSection: {
    marginBottom: 30,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
  },
  historySection: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  clearButton: {
    fontSize: 16,
    color: COLORS.danger,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  historyContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  historyMuscle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  historyScore: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  scoreLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  viewAllButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  tipsCard: {
    padding: 20,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  tipsList: {
    gap: 8,
  },
  tip: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
