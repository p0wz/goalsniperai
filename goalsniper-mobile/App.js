// GoalSniper Mobile - Main App with Tamagui + All Screens

import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { TamaguiProvider } from 'tamagui';
import config from './tamagui.config';

// Auth Screens
import LoginScreen from './src/screens/auth/LoginScreen';

// Pro User Screens
import HomeScreen from './src/screens/home/HomeScreen';
import PicksScreen from './src/screens/picks/PicksScreen';
import SignalsScreen from './src/screens/signals/SignalsScreen';
import StatsScreen from './src/screens/stats/StatsScreen';
import SettingsScreen from './src/screens/settings/SettingsScreen';

// Admin Screens
import AdminPanelScreen from './src/screens/admin/AdminPanelScreen';

// Theme colors
const colors = {
  background: '#0D0D0D',
  surface: '#1A1A1A',
  lime: '#84CC16',
  electricBlue: '#3B82F6',
  textPrimary: '#FFFFFF',
  textMuted: '#71717A',
  border: '#27272A',
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Check if user is admin (in production, this would come from user data)
const isAdmin = true; // Set to true for testing admin features

// Pro User Tab Navigator
function ProTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 65,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.textPrimary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Ana Sayfa',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text>,
          headerTitle: 'GoalSniper Pro',
        }}
      />
      <Tab.Screen
        name="Picks"
        component={PicksScreen}
        options={{
          tabBarLabel: 'Picks',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📋</Text>,
          headerTitle: 'Daily Picks',
        }}
      />
      <Tab.Screen
        name="Signals"
        component={SignalsScreen}
        options={{
          tabBarLabel: 'Signals',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🔔</Text>,
          headerTitle: 'Live Signals',
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: 'Stats',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📈</Text>,
          headerTitle: 'Statistics',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Ayarlar',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>⚙️</Text>,
          headerTitle: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
}

// Admin Tab Navigator (includes all Pro tabs + Admin Panel)
function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 65,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.textPrimary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text>,
          headerTitle: 'GoalSniper Pro',
        }}
      />
      <Tab.Screen
        name="Picks"
        component={PicksScreen}
        options={{
          tabBarLabel: 'Picks',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📋</Text>,
          headerTitle: 'Daily Picks',
        }}
      />
      <Tab.Screen
        name="Signals"
        component={SignalsScreen}
        options={{
          tabBarLabel: 'Live',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🔔</Text>,
          headerTitle: 'Live Signals',
        }}
      />
      <Tab.Screen
        name="Admin"
        component={AdminPanelScreen}
        options={{
          tabBarLabel: 'Admin',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>⚡</Text>,
          headerTitle: 'Admin Panel',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>⚙️</Text>,
          headerTitle: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
}

// Register Placeholder
function RegisterScreen({ navigation }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderIcon}>📝</Text>
      <Text style={styles.placeholderText}>Register</Text>
      <Text style={styles.placeholderSubtext}>Coming soon...</Text>
    </View>
  );
}

// Loading Screen
function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>🎯</Text>
      <ActivityIndicator size="large" color={colors.lime} />
      <Text style={styles.loadingText}>GoalSniper Pro</Text>
    </View>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // For web testing, always set as logged in
      // In production, use SecureStore on native
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Auth check error:', error);
      setIsLoggedIn(true); // Fallback for testing
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <TamaguiProvider config={config} defaultTheme="dark">
        <LoadingScreen />
      </TamaguiProvider>
    );
  }

  return (
    <TamaguiProvider config={config} defaultTheme="dark">
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          {isLoggedIn ? (
            <Stack.Screen
              name="Main"
              component={isAdmin ? AdminTabs : ProTabs}
            />
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </TamaguiProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
  },
});
