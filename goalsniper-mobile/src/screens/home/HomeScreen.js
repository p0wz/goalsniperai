// GoalSniper Mobile - Premium Home Screen (Ana Sayfa)
// Based on reference design - Dark theme with green accents

import React, { useState, useEffect } from 'react';
import { RefreshControl, ScrollView, Dimensions } from 'react-native';
import {
    YStack,
    XStack,
    Text,
    Card,
    H1,
    Theme,
    Button,
    Circle,
    Avatar,
} from 'tamagui';
import { API_CONFIG } from '../../config/api';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const { width } = Dimensions.get('window');

// Premium Theme - Based on Reference Design
const theme = {
    bg: '#0A0A0A',
    cardBg: '#111111',
    cardBorder: '#1A1A1A',
    primary: '#4ADE80', // Green from reference
    primaryDark: '#22C55E',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    success: '#4ADE80',
    error: '#EF4444',
    warning: '#F59E0B',
};

// API Helper
const api = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: 10000,
});

export default function HomeScreen({ navigation }) {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [picks, setPicks] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        loadData();
        updateGreeting();
    }, []);

    const updateGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Günaydın');
        else if (hour < 18) setGreeting('İyi günler');
        else setGreeting('İyi akşamlar');
    };

    const loadData = async () => {
        try {
            const token = await SecureStore.getItemAsync('authToken');
            if (token) {
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }

            // Fetch profile, stats, and picks
            const [profileRes, statsRes, picksRes] = await Promise.all([
                api.get('/api/mobile/profile').catch(() => ({ data: { user: { name: 'User' } } })),
                api.get('/api/mobile/stats').catch(() => ({ data: { stats: {} } })),
                api.get('/api/mobile/picks').catch(() => ({ data: { picks: [] } })),
            ]);

            setUser(profileRes.data.user);
            setStats(statsRes.data.stats);
            setPicks(picksRes.data.picks?.slice(0, 3) || []);
        } catch (error) {
            console.error('Load data error:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const winRate = stats?.winRate || 0;
    const userName = user?.name || 'Kullanıcı';

    return (
        <Theme name="dark">
            <ScrollView
                style={{ flex: 1, backgroundColor: theme.bg }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
                }
                showsVerticalScrollIndicator={false}
            >
                <YStack padding="$4" gap="$4" paddingTop="$2">

                    {/* Header with Greeting */}
                    <XStack justifyContent="space-between" alignItems="center">
                        <YStack>
                            <Text color={theme.textMuted} fontSize={14}>
                                {greeting} 👋
                            </Text>
                            <Text color={theme.text} fontSize={24} fontWeight="800" letterSpacing={-0.5}>
                                {userName}
                            </Text>
                        </YStack>

                        <Avatar circular size="$5" backgroundColor={theme.primary}>
                            <Text color={theme.bg} fontSize={18} fontWeight="bold">
                                {userName.charAt(0).toUpperCase()}
                            </Text>
                        </Avatar>
                    </XStack>

                    {/* Win Rate Hero Card - Like reference design */}
                    <Card
                        backgroundColor={theme.cardBg}
                        borderColor={theme.cardBorder}
                        borderWidth={1}
                        borderRadius={20}
                        padding="$5"
                        overflow="hidden"
                    >
                        {/* Gradient overlay effect */}
                        <YStack
                            position="absolute"
                            top={-50}
                            right={-50}
                            width={180}
                            height={180}
                            backgroundColor={theme.primary}
                            opacity={0.1}
                            borderRadius={90}
                        />

                        <YStack gap="$2">
                            <XStack alignItems="center" gap="$2">
                                <Circle size={8} backgroundColor={theme.primary} />
                                <Text color={theme.textSecondary} fontSize={13} fontWeight="500">
                                    Başarı Oranı
                                </Text>
                                {winRate > 0 && (
                                    <XStack
                                        backgroundColor={theme.primary + '20'}
                                        paddingHorizontal="$2"
                                        paddingVertical={2}
                                        borderRadius={8}
                                        marginLeft="auto"
                                    >
                                        <Text color={theme.primary} fontSize={11} fontWeight="700">
                                            ↗ +5%
                                        </Text>
                                    </XStack>
                                )}
                            </XStack>

                            <XStack alignItems="flex-end" gap="$1">
                                <Text
                                    color={theme.text}
                                    fontSize={64}
                                    fontWeight="900"
                                    letterSpacing={-2}
                                    lineHeight={70}
                                >
                                    {winRate}%
                                </Text>
                            </XStack>

                            <Text color={theme.textMuted} fontSize={12}>
                                bu hafta
                            </Text>
                        </YStack>
                    </Card>

                    {/* Quick Action Buttons */}
                    <XStack gap="$3">
                        <Card
                            flex={1}
                            backgroundColor={theme.cardBg}
                            borderColor={theme.cardBorder}
                            borderWidth={1}
                            borderRadius={16}
                            padding="$4"
                            alignItems="center"
                            pressStyle={{ scale: 0.97, opacity: 0.9 }}
                            onPress={() => navigation.navigate('Signals')}
                        >
                            <YStack
                                width={44}
                                height={44}
                                borderRadius={12}
                                backgroundColor={theme.primary + '15'}
                                alignItems="center"
                                justifyContent="center"
                                marginBottom="$2"
                            >
                                <Text fontSize={22}>📈</Text>
                            </YStack>
                            <Text color={theme.text} fontSize={12} fontWeight="600">Canlı</Text>
                        </Card>

                        <Card
                            flex={1}
                            backgroundColor={theme.cardBg}
                            borderColor={theme.cardBorder}
                            borderWidth={1}
                            borderRadius={16}
                            padding="$4"
                            alignItems="center"
                            pressStyle={{ scale: 0.97, opacity: 0.9 }}
                            onPress={() => navigation.navigate('Tahminlerim')}
                        >
                            <YStack
                                width={44}
                                height={44}
                                borderRadius={12}
                                backgroundColor={theme.primary + '15'}
                                alignItems="center"
                                justifyContent="center"
                                marginBottom="$2"
                            >
                                <Text fontSize={22}>📋</Text>
                            </YStack>
                            <Text color={theme.text} fontSize={12} fontWeight="600">Tahminler</Text>
                        </Card>

                        <Card
                            flex={1}
                            backgroundColor={theme.primary}
                            borderRadius={16}
                            padding="$4"
                            alignItems="center"
                            pressStyle={{ scale: 0.97, opacity: 0.9 }}
                            onPress={() => navigation.navigate('Profil')}
                        >
                            <YStack
                                width={44}
                                height={44}
                                borderRadius={12}
                                backgroundColor="rgba(255,255,255,0.2)"
                                alignItems="center"
                                justifyContent="center"
                                marginBottom="$2"
                            >
                                <Text fontSize={22}>⭐</Text>
                            </YStack>
                            <Text color={theme.bg} fontSize={12} fontWeight="700">VIP</Text>
                        </Card>
                    </XStack>

                    {/* Today's Picks Section */}
                    <YStack gap="$3">
                        <XStack justifyContent="space-between" alignItems="center">
                            <Text color={theme.text} fontSize={16} fontWeight="700">
                                Canlı Maçlar
                            </Text>
                            <Button
                                size="$2"
                                chromeless
                                color={theme.primary}
                                onPress={() => navigation.navigate('Signals')}
                            >
                                Tümü →
                            </Button>
                        </XStack>

                        {picks.length > 0 ? (
                            picks.map((pick, index) => (
                                <Card
                                    key={index}
                                    backgroundColor={theme.cardBg}
                                    borderColor={theme.cardBorder}
                                    borderWidth={1}
                                    borderRadius={16}
                                    padding="$4"
                                    pressStyle={{ scale: 0.98 }}
                                >
                                    <XStack justifyContent="space-between" alignItems="center">
                                        <XStack alignItems="center" gap="$3" flex={1}>
                                            <YStack
                                                width={40}
                                                height={40}
                                                borderRadius={10}
                                                backgroundColor={theme.primary + '15'}
                                                alignItems="center"
                                                justifyContent="center"
                                            >
                                                <Text fontSize={16}>⚽</Text>
                                            </YStack>
                                            <YStack flex={1}>
                                                <Text color={theme.text} fontSize={14} fontWeight="600" numberOfLines={1}>
                                                    {pick.match}
                                                </Text>
                                                <Text color={theme.textMuted} fontSize={11}>
                                                    {pick.league}
                                                </Text>
                                            </YStack>
                                        </XStack>

                                        <YStack alignItems="flex-end">
                                            <XStack
                                                backgroundColor={
                                                    pick.status === 'WON' ? theme.success + '20' :
                                                        pick.status === 'LOST' ? theme.error + '20' :
                                                            theme.primary + '20'
                                                }
                                                paddingHorizontal="$2"
                                                paddingVertical={4}
                                                borderRadius={6}
                                            >
                                                <Text
                                                    color={
                                                        pick.status === 'WON' ? theme.success :
                                                            pick.status === 'LOST' ? theme.error :
                                                                theme.primary
                                                    }
                                                    fontSize={11}
                                                    fontWeight="700"
                                                >
                                                    {pick.market}
                                                </Text>
                                            </XStack>
                                            {pick.odds && (
                                                <Text color={theme.textSecondary} fontSize={13} fontWeight="700" marginTop={4}>
                                                    {pick.odds}x
                                                </Text>
                                            )}
                                        </YStack>
                                    </XStack>
                                </Card>
                            ))
                        ) : (
                            <Card
                                backgroundColor={theme.cardBg}
                                borderColor={theme.cardBorder}
                                borderWidth={1}
                                borderRadius={16}
                                padding="$6"
                                alignItems="center"
                            >
                                <Text color={theme.textMuted} fontSize={14}>
                                    Henüz tahmin yok
                                </Text>
                            </Card>
                        )}
                    </YStack>

                    <YStack height={30} />
                </YStack>
            </ScrollView>
        </Theme>
    );
}
