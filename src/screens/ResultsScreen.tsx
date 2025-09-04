// Results Screen - Displays comprehensive analysis results with charts

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { BarChart, PieChart, ProgressChart } from 'react-native-chart-kit';
import * as Haptics from 'expo-haptics';
import { MuscleAnalysisResponse } from '../types/api.types';
import { DataTransformer } from '../services/data/DataTransformer';
import { COLORS } from '../config/constants';

const { width: screenWidth } = Dimensions.get('window');

interface ResultsScreenProps {
  route: {
    params: {
      analysis: MuscleAnalysisResponse;
      imageUri: string;
    };
  };
  navigation: any;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ route, navigation }) => {
  const { analysis, imageUri } = route.params;
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'recommendations'>('overview');

  const barChartData = DataTransformer.toBarChartData(analysis.muscle_analysis);
  const pieChartData = DataTransformer.toPieChartData(analysis.muscle_analysis);
  const progressData = DataTransformer.toProgressData(analysis.muscle_analysis);
  const rankedMuscles = DataTransformer.toRankedList(analysis.muscle_analysis);
  const recommendations = DataTransformer.toActionableRecommendations(analysis.recommendations);
  const summaryStats = DataTransformer.toSummaryStats(analysis);

  const chartConfig = {
    backgroundColor: COLORS.surface,
    backgroundGradientFrom: COLORS.surface,
    backgroundGradientTo: COLORS.background,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: COLORS.primary,
    },
  };

  const switchTab = (tab: 'overview' | 'details' | 'recommendations') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const renderOverview = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Image Preview */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUri }} style={styles.previewImage} />
        <View style={styles.imageOverlay}>
          <Text style={styles.confidenceText}>
            {analysis.analysis_metadata.analysis_confidence}% Confidence
          </Text>
          <Text style={styles.qualityText}>
            {analysis.analysis_metadata.image_quality.toUpperCase()} Quality
          </Text>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summaryStats.averageScore.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Overall Score</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summaryStats.totalMusclesAnalyzed}</Text>
          <Text style={styles.statLabel}>Muscles Analyzed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{analysis.overall_assessment.body_symmetry_score.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Symmetry Score</Text>
        </View>
      </View>

      {/* Bar Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Muscle Development Scores</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={barChartData}
            width={Math.max(screenWidth - 40, barChartData.labels.length * 60)}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            yAxisLabel=""
            yAxisSuffix=""
            verticalLabelRotation={30}
            showValuesOnTopOfBars
            fromZero
          />
        </ScrollView>
      </View>

      {/* Pie Chart */}
      {pieChartData.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Muscle Group Distribution</Text>
          <PieChart
            data={pieChartData}
            width={screenWidth - 40}
            height={200}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
      )}

      {/* Strongest & Weakest */}
      <View style={styles.highlightContainer}>
        <View style={styles.highlightCard}>
          <Text style={styles.highlightTitle}>💪 Strongest</Text>
          {analysis.overall_assessment.strongest_muscles.map((muscle, index) => (
            <Text key={index} style={styles.highlightItem}>{muscle}</Text>
          ))}
        </View>
        <View style={styles.highlightCard}>
          <Text style={styles.highlightTitle}>🎯 Focus Areas</Text>
          {analysis.overall_assessment.weakest_muscles.map((muscle, index) => (
            <Text key={index} style={styles.highlightItem}>{muscle}</Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderDetails = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Progress Bars */}
      <View style={styles.progressContainer}>
        <Text style={styles.sectionTitle}>Individual Muscle Scores</Text>
        {progressData.map((muscle, index) => (
          <View key={index} style={styles.progressItem}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{muscle.muscle}</Text>
              <Text style={[styles.progressScore, { color: muscle.color }]}>
                {muscle.score.toFixed(1)}/10
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${muscle.percentage}%`,
                    backgroundColor: muscle.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressCategory}>{muscle.category}</Text>
          </View>
        ))}
      </View>

      {/* Detailed Analysis */}
      <View style={styles.detailsContainer}>
        <Text style={styles.sectionTitle}>Detailed Analysis</Text>
        {analysis.muscle_analysis.map((muscle, index) => (
          <View key={index} style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailName}>{muscle.common_name}</Text>
              <View style={[styles.scoreBadge, { backgroundColor: DataTransformer['getScoreColor'](muscle.development_score) }]}>
                <Text style={styles.scoreBadgeText}>{muscle.development_score.toFixed(1)}</Text>
              </View>
            </View>
            <Text style={styles.detailScientific}>{muscle.muscle_name}</Text>
            <Text style={styles.detailNotes}>{muscle.specific_notes}</Text>
            <Text style={styles.detailVisibility}>
              Visibility: {muscle.visibility_in_photo.replace('_', ' ')}
            </Text>
          </View>
        ))}
      </View>

      {/* Limitations */}
      {analysis.limitations.length > 0 && (
        <View style={styles.limitationsContainer}>
          <Text style={styles.sectionTitle}>Analysis Limitations</Text>
          {analysis.limitations.map((limitation, index) => (
            <View key={index} style={styles.limitationItem}>
              <Text style={styles.limitationText}>• {limitation}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderRecommendations = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Workout Plan */}
      <View style={styles.workoutContainer}>
        <Text style={styles.sectionTitle}>Personalized Workout Plan</Text>
        {recommendations.map((rec, index) => (
          <View
            key={index}
            style={[
              styles.recommendationCard,
              { borderLeftColor: rec.color, borderLeftWidth: 4 },
            ]}
          >
            <View style={styles.recHeader}>
              <Text style={styles.recIcon}>{rec.icon}</Text>
              <Text style={styles.recTitle}>{rec.title}</Text>
              <View style={[styles.priorityBadge, { backgroundColor: rec.color }]}>
                <Text style={styles.priorityText}>{rec.priority.toUpperCase()}</Text>
              </View>
            </View>
            
            <Text style={styles.recLabel}>Recommended Exercises:</Text>
            {rec.exercises.map((exercise, idx) => (
              <Text key={idx} style={styles.exerciseItem}>• {exercise}</Text>
            ))}
            
            <Text style={styles.frequencyText}>
              Frequency: {rec.frequency}
            </Text>
          </View>
        ))}
      </View>

      {/* Overall Assessment */}
      <View style={styles.assessmentContainer}>
        <Text style={styles.sectionTitle}>Overall Assessment</Text>
        <View style={styles.assessmentCard}>
          <View style={styles.assessmentRow}>
            <Text style={styles.assessmentLabel}>Physique Score:</Text>
            <Text style={styles.assessmentValue}>
              {analysis.overall_assessment.overall_physique_score.toFixed(1)}/10
            </Text>
          </View>
          <View style={styles.assessmentRow}>
            <Text style={styles.assessmentLabel}>Symmetry Score:</Text>
            <Text style={styles.assessmentValue}>
              {analysis.overall_assessment.body_symmetry_score.toFixed(1)}/10
            </Text>
          </View>
          <View style={styles.assessmentRow}>
            <Text style={styles.assessmentLabel}>Muscle Balance:</Text>
            <Text style={styles.assessmentValue}>
              {analysis.overall_assessment.muscle_proportion_balance.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Tips */}
      <View style={styles.tipsContainer}>
        <Text style={styles.sectionTitle}>Pro Tips</Text>
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>
            Focus on compound movements for overall muscle development
          </Text>
        </View>
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>🍽️</Text>
          <Text style={styles.tipText}>
            Ensure adequate protein intake (0.8-1g per lb of body weight)
          </Text>
        </View>
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>😴</Text>
          <Text style={styles.tipText}>
            Get 7-9 hours of quality sleep for optimal recovery
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysis Results</Text>
        <TouchableOpacity onPress={() => {}} style={styles.shareButton}>
          <Text style={styles.shareButtonText}>📤</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => switchTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'details' && styles.activeTab]}
          onPress={() => switchTab('details')}
        >
          <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
            Details
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recommendations' && styles.activeTab]}
          onPress={() => switchTab('recommendations')}
        >
          <Text style={[styles.tabText, activeTab === 'recommendations' && styles.activeTabText]}>
            Plan
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'details' && renderDetails()}
        {activeTab === 'recommendations' && renderRecommendations()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.text,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  shareButton: {
    padding: 10,
  },
  shareButtonText: {
    fontSize: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  imageContainer: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confidenceText: {
    color: COLORS.success,
    fontWeight: 'bold',
  },
  qualityText: {
    color: COLORS.info,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  chartContainer: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  chart: {
    borderRadius: 16,
  },
  highlightContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  highlightCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  highlightItem: {
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  progressContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  progressItem: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  progressLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  progressScore: {
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressCategory: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailCard: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreBadgeText: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
  detailScientific: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  detailNotes: {
    color: COLORS.text,
    marginBottom: 5,
  },
  detailVisibility: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  limitationsContainer: {
    marginBottom: 20,
  },
  limitationItem: {
    marginBottom: 5,
  },
  limitationText: {
    color: COLORS.warning,
  },
  workoutContainer: {
    marginBottom: 20,
  },
  recommendationCard: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  recIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  recTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  recLabel: {
    color: COLORS.textSecondary,
    marginBottom: 5,
    fontWeight: '600',
  },
  exerciseItem: {
    color: COLORS.text,
    marginLeft: 10,
    marginBottom: 3,
  },
  frequencyText: {
    color: COLORS.info,
    marginTop: 10,
    fontStyle: 'italic',
  },
  assessmentContainer: {
    marginBottom: 20,
  },
  assessmentCard: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 12,
  },
  assessmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  assessmentLabel: {
    color: COLORS.textSecondary,
  },
  assessmentValue: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
  tipsContainer: {
    marginBottom: 20,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  tipIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  tipText: {
    flex: 1,
    color: COLORS.text,
  },
});
