// Main App Component with Tab Navigation

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { AnalyzeScreen } from './src/screens/AnalyzeScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { ComparisonScreen } from './src/screens/ComparisonScreen';
import { COLORS } from './src/config/constants';
import { CustomTabBar } from './src/components/navigation/CustomTabBar';
import { SettingsScreen } from './src/screens/SettingsScreen';
import ExerciseDetailScreen from './src/screens/ExerciseDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack navigator for screens that need to be pushed on top of tabs
function StackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: COLORS.background,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="Results" component={ResultsScreen as unknown as React.ComponentType<any>} />
      <Stack.Screen name="History" component={HistoryScreen as unknown as React.ComponentType<any>} />
      <Stack.Screen name="Comparison" component={ComparisonScreen as unknown as React.ComponentType<any>} />
      <Stack.Screen name="Settings" component={SettingsScreen as unknown as React.ComponentType<any>} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen as unknown as React.ComponentType<any>} />
    </Stack.Navigator>
  );
}

// Tab navigator for main app screens
function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          paddingTop: 0,
          paddingBottom: 0,
          height: 70,
          elevation: 0,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Analyze" component={AnalyzeScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <StackNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
