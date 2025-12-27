// GoalSniper Mobile App - Main Entry
// Premium Dark Theme with Role-Based Navigation

import React, { useState, useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TamaguiProvider, Text, YStack, Spinner } from 'tamagui';
import config from './tamagui.config';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG } from './src/config/api';
import axios from 'axios';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import HomeScreen from './src/screens/home/HomeScreen';
import TahminlerimScreen from './src/screens/predictions/TahminlerimScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import AdminPanelScreen from './src/screens/admin/AdminPanelScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Premium Theme Colors
const theme = {
  bg: '#0A0A0A',
  cardBg: '#111111',
  primary: '#4ADE80',
  text: '#FFFFFF',
  textMuted: '#6B7280',
};

// Tab Icon Component
const TabIcon = ({ icon, focused }) => (
  <YStack alignItems="center" justifyContent="center">
    <Text fontSize={22} opacity={focused ? 1 : 0.5}>
      {icon}
    </Text>
  </YStack>
);

// User Tabs (3 tabs)
function UserTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.bg,
          borderTopColor: '#1A1A1A',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="AnaSayfa"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Ana Sayfa',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Tahminlerim"
        component={TahminlerimScreen}
        options={{
          tabBarLabel: 'Tahminler',
          tabBarIcon: ({ focused }) => <TabIcon icon="📋" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Admin Tabs (4 tabs - includes Admin Panel)
function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.bg,
          borderTopColor: '#1A1A1A',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="AnaSayfa"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Ana Sayfa',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Tahminlerim"
        component={TahminlerimScreen}
        options={{
          tabBarLabel: 'Tahminler',
          tabBarIcon: ({ focused }) => <TabIcon icon="📋" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Admin"
        component={AdminPanelScreen}
        options={{
          tabBarLabel: 'Admin',
          tabBarIcon: ({ focused }) => <TabIcon icon="⚡" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Loading Screen
function LoadingScreen() {
  return (
    <YStack flex={1} backgroundColor={theme.bg} alignItems="center" justifyContent="center">
      <Spinner size="large" color={theme.primary} />
      <Text color={theme.text} fontSize={16} marginTop="$4">
        Yükleniyor...
      </Text>
    </YStack>
  );
}

// Register Screen (Placeholder)
function RegisterScreen({ navigation }) {
  return (
    <YStack flex={1} backgroundColor={theme.bg} alignItems="center" justifyContent="center" padding="$4">
      <Text color={theme.text} fontSize={24} fontWeight="800">
        Kayıt Ol
      </Text>
      <Text color={theme.textMuted} fontSize={14} marginTop="$2" textAlign="center">
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
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // For web platform, SecureStore doesn't work
      if (Platform.OS === 'web') {
        // Check localStorage for web
        const token = localStorage.getItem('authToken');
        if (token) {
          // Verify token and get user role
          const api = axios.create({ baseURL: API_CONFIG.BASE_URL });
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          try {
            const response = await api.get('/api/mobile/profile');
            if (response.data.user) {
              setIsLoggedIn(true);
              setIsAdmin(response.data.user.role === 'admin');
            }
          } catch (error) {
            // Token invalid - stay logged out
            localStorage.removeItem('authToken');
          }
        }
      } else {
        // Native platforms
        const token = await SecureStore.getItemAsync('authToken');
        if (token) {
          const api = axios.create({ baseURL: API_CONFIG.BASE_URL });
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          try {
            const response = await api.get('/api/mobile/profile');
            if (response.data.user) {
              setIsLoggedIn(true);
              setIsAdmin(response.data.user.role === 'admin');
            }
          } catch (error) {
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
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isLoggedIn ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          ) : (
            <Stack.Screen
              name="Main"
              component={isAdmin ? AdminTabs : UserTabs}
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </TamaguiProvider>
  );
}
