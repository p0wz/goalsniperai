// GoalSniper Mobile - App.js
// Navigation with 4 tabs (betting-buddy-ai design)
// Admin panel removed - managed via web dashboard

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TamaguiProvider, YStack, Text, Theme, Spinner } from 'tamagui';
import { Platform } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import config from './tamagui.config';
import { API_CONFIG } from './src/config/api';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import HomeScreen from './src/screens/home/HomeScreen';
import LiveMatchesScreen from './src/screens/live/LiveMatchesScreen';
import TahminlerimScreen from './src/screens/predictions/TahminlerimScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Design System from betting-buddy-ai
const theme = {
  bg: 'hsl(220, 20%, 6%)',
  cardBg: 'hsl(220, 18%, 10%)',
  primary: 'hsl(142, 70%, 45%)',
  accent: 'hsl(38, 92%, 50%)',
  text: 'hsl(0, 0%, 98%)',
  textMuted: 'hsl(220, 10%, 60%)',
};

// Custom Tab Bar Icon
const TabIcon = ({ focused, icon, label }) => (
  <YStack alignItems="center" paddingTop={8}>
    <YStack
      width={focused ? 44 : 36}
      height={focused ? 44 : 36}
      borderRadius={focused ? 14 : 10}
      backgroundColor={focused ? theme.primary : 'transparent'}
      alignItems="center"
      justifyContent="center"
    >
      <Text fontSize={focused ? 18 : 16}>{icon}</Text>
    </YStack>
    <Text
      color={focused ? theme.primary : theme.textMuted}
      fontSize={10}
      fontWeight={focused ? '700' : '500'}
      marginTop={4}
    >
      {label}
    </Text>
  </YStack>
);

// Main Tabs - 4 tabs only (Home, Live, Predictions, Profile)
// No Admin tab - admin panel is managed via web dashboard
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.cardBg,
          borderTopWidth: 0,
          height: 80,
          paddingBottom: 10,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Ana Sayfa"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="🏠" label="Ana Sayfa" />
          ),
        }}
      />
      <Tab.Screen
        name="Canlı"
        component={LiveMatchesScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="⚡" label="Canlı" />
          ),
        }}
      />
      <Tab.Screen
        name="Tahminler"
        component={TahminlerimScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="📊" label="Tahminler" />
          ),
        }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="👤" label="Profil" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Loading Screen
function LoadingScreen() {
  return (
    <Theme name="dark">
      <YStack flex={1} backgroundColor={theme.bg} alignItems="center" justifyContent="center">
        <YStack
          width={80}
          height={80}
          borderRadius={20}
          backgroundColor={theme.primary}
          alignItems="center"
          justifyContent="center"
          marginBottom="$4"
        >
          <Text fontSize={36}>🎯</Text>
        </YStack>
        <Text color={theme.text} fontSize={22} fontWeight="800" marginBottom="$2">
          GoalSniper
        </Text>
        <Spinner size="large" color={theme.primary} />
      </YStack>
    </Theme>
  );
}

// Simple Register Placeholder
function RegisterScreen({ navigation }) {
  return (
    <Theme name="dark">
      <YStack flex={1} backgroundColor={theme.bg} alignItems="center" justifyContent="center" padding="$4">
        <Text color={theme.text} fontSize={24} fontWeight="800" marginBottom="$4">
          Kayıt Ol
        </Text>
        <Text color={theme.textMuted} fontSize={14} textAlign="center">
          Kayıt sayfası yakında eklenecek
        </Text>
        <Text
          color={theme.primary}
          fontSize={14}
          fontWeight="600"
          marginTop="$4"
          onPress={() => navigation.navigate('Login')}
        >
          ← Giriş Yap
        </Text>
      </YStack>
    </Theme>
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
      let token;
      if (Platform.OS === 'web') {
        token = localStorage.getItem('authToken');
      } else {
        token = await SecureStore.getItemAsync('authToken');
      }

      if (token) {
        const api = axios.create({ baseURL: API_CONFIG.BASE_URL });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        try {
          const response = await api.get('/api/mobile/profile');
          if (response.data.user) {
            setIsLoggedIn(true);
          }
        } catch (error) {
          console.log('Token invalid, clearing...');
          if (Platform.OS === 'web') {
            localStorage.removeItem('authToken');
          } else {
            await SecureStore.deleteItemAsync('authToken');
          }
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <TamaguiProvider config={config}>
        <LoadingScreen />
      </TamaguiProvider>
    );
  }

  return (
    <TamaguiProvider config={config}>
      <NavigationContainer>
        {isLoggedIn ? (
          <MainTabs />
        ) : (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </TamaguiProvider>
  );
}
