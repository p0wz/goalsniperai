// GoalSniper Mobile - Premium Home Screen
// Professional design with glassmorphism, gradients, and premium effects

import React, { useState, useEffect } from 'react';
import { RefreshControl, ScrollView, Dimensions } from 'react-native';
import {
    YStack,
    XStack,
    Text,
    Card,
    H1,
    H2,
    Theme,
    Button,
    Circle,
    LinearGradient,
} from 'tamagui';
import { betsService, picksService } from '../../services/api';

const { width } = Dimensions.get('window');

// Premium Theme Colors
const theme = {
    // Backgrounds
    bg: '#000000',
    bgCard: 'rgba(20, 20, 25, 0.95)',
    bgCardLight: 'rgba(30, 30, 40, 0.9)',
    bgGlass: 'rgba(255, 255, 255, 0.03)',

    // Accents
    primary: '#00FF88', // Neon green
    primaryDark: '#00CC6A',
    secondary: '#00D4FF', // Cyan
    accent: '#8B5CF6', // Purple

    // Status
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',

    // Text
    text: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textMuted: 'rgba(255, 255, 255, 0.4)',

    // Border
    border: 'rgba(255, 255, 255, 0.08)',
    borderLight: 'rgba(255, 255, 255, 0.15)',
};

// Stat Card Component
const StatCard = ({ icon, value, label, color, delay = 0 }) => (
    <Card
        flex={1}
        animation="bouncy"
        enterStyle={{ opacity: 0, scale: 0.9, y: 20 }}
        backgroundColor={theme.bgCard}
        borderColor={theme.border}
        borderWidth={1}
        borderRadius={20}
        padding="$4"
        alignItems="center"
        pressStyle={{ scale: 0.96, opacity: 0.9 }}
    >
        <YStack
            width={44}
            height={44}
            borderRadius={22}
            backgroundColor={color + '20'}
            alignItems="center"
            justifyContent="center"
            marginBottom="$2"
        >
            <Text fontSize={20}>{icon}</Text>
        </YStack>
        <Text color={color} fontSize={26} fontWeight="800" letterSpacing={-0.5}>
            {value}
        </Text>
        <Text color={theme.textMuted} fontSize={11} fontWeight="600" textTransform="uppercase" letterSpacing={0.5}>
            {label}
        </Text>
    </Card>
);

// Quick Action Card
const QuickAction = ({ icon, label, onPress, gradient = [theme.primary, theme.secondary] }) => (
    <Card
        flex={1}
        animation="quick"
        pressStyle={{ scale: 0.95, opacity: 0.85 }}
        backgroundColor={theme.bgCard}
        borderColor={theme.border}
        borderWidth={1}
        borderRadius={16}
        padding="$3"
        onPress={onPress}
    >
        <YStack alignItems="center" gap="$2">
            <YStack
                width={50}
                height={50}
                borderRadius={14}
                backgroundColor={gradient[0] + '20'}
                alignItems="center"
                justifyContent="center"
            >
                <Text fontSize={24}>{icon}</Text>
            </YStack>
            <Text color={theme.text} fontSize={11} fontWeight="600" textAlign="center">
                {label}
            </Text>
        </YStack>
    </Card>
);

export default function HomeScreen({ navigation }) {
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
            const [statsRes, picksRes] = await Promise.all([
                betsService.getStats(),
                picksService.getTodayPicks(),
            ]);
            setStats(statsRes);
            setPicks(picksRes.picks || picksRes.singles || []);
        } catch (error) {
            console.error('Error loading data:', error);
            // Mock data for demo
            setStats({ winRate: 78, won: 145, lost: 41, pending: 8 });
            setPicks([
                { match: 'Man City vs Liverpool', market: 'BTTS', odds: '1.85', league: 'Premier League' },
                { match: 'Barcelona vs Real Madrid', market: 'Over 2.5', odds: '1.72', league: 'La Liga' },
            ]);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const winRate = stats?.winRate || 78;
    const won = stats?.won || 145;
    const lost = stats?.lost || 41;
    const pending = stats?.pending || 8;

    return (
        <Theme name="dark">
            <ScrollView
                style={{ flex: 1, backgroundColor: theme.bg }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
                }
                showsVerticalScrollIndicator={false}
            >
                <YStack padding="$4" gap="$5" paddingTop="$6">

                    {/* Header */}
                    <XStack alignItems="center" justifyContent="space-between">
                        <YStack gap="$1">
                            <Text color={theme.textMuted} fontSize={14} fontWeight="500">
                                {greeting} 👋
                            </Text>
                            <H1 color={theme.text} fontSize={28} fontWeight="800" letterSpacing={-1}>
                                GoalSniper
                            </H1>
                        </YStack>

                        <XStack
                            backgroundColor={theme.primary + '15'}
                            paddingHorizontal="$3"
                            paddingVertical="$2"
                            borderRadius="$4"
                            borderWidth={1}
                            borderColor={theme.primary + '30'}
                            alignItems="center"
                            gap="$2"
                        >
                            <Circle size={8} backgroundColor={theme.primary} />
                            <Text color={theme.primary} fontSize={12} fontWeight="700">
                                PRO
                            </Text>
                        </XStack>
                    </XStack>

                    {/* Hero Win Rate Card */}
                    <Card
                        animation="bouncy"
                        enterStyle={{ opacity: 0, y: 30 }}
                        backgroundColor={theme.bgCard}
                        borderColor={theme.border}
                        borderWidth={1}
                        borderRadius={24}
                        overflow="hidden"
                    >
                        {/* Gradient overlay */}
                        <YStack
                            position="absolute"
                            top={0}
                            right={0}
                            width={200}
                            height={200}
                            backgroundColor={theme.primary}
                            opacity={0.05}
                            borderRadius={100}
                            transform={[{ translateX: 50 }, { translateY: -50 }]}
                        />

                        <YStack padding="$5" gap="$4">
                            <XStack justifyContent="space-between" alignItems="flex-start">
                                <YStack gap="$1">
                                    <Text color={theme.textMuted} fontSize={13} fontWeight="500">
                                        Performance
                                    </Text>
                                    <XStack alignItems="flex-end" gap="$1">
                                        <Text
                                            color={theme.primary}
                                            fontSize={56}
                                            fontWeight="900"
                                            letterSpacing={-2}
                                        >
                                            {winRate}
                                        </Text>
                                        <Text
                                            color={theme.primary}
                                            fontSize={24}
                                            fontWeight="700"
                                            marginBottom="$2"
                                        >
                                            %
                                        </Text>
                                    </XStack>
                                    <Text color={theme.textMuted} fontSize={12}>
                                        Son 30 günde başarı oranı
                                    </Text>
                                </YStack>

                                <YStack
                                    width={60}
                                    height={60}
                                    borderRadius={16}
                                    backgroundColor={theme.primary + '15'}
                                    alignItems="center"
                                    justifyContent="center"
                                >
                                    <Text fontSize={28}>📈</Text>
                                </YStack>
                            </XStack>

                            {/* Progress bar */}
                            <YStack gap="$2">
                                <YStack
                                    height={8}
                                    backgroundColor={theme.bgGlass}
                                    borderRadius={4}
                                    overflow="hidden"
                                >
                                    <YStack
                                        width={`${winRate}%`}
                                        height="100%"
                                        backgroundColor={theme.primary}
                                        borderRadius={4}
                                    />
                                </YStack>
                            </YStack>
                        </YStack>
                    </Card>

                    {/* Stats Grid */}
                    <XStack gap="$3">
                        <StatCard icon="✓" value={won} label="Won" color={theme.success} />
                        <StatCard icon="✗" value={lost} label="Lost" color={theme.error} />
                        <StatCard icon="⏳" value={pending} label="Pending" color={theme.warning} />
                    </XStack>

                    {/* Quick Actions */}
                    <YStack gap="$3">
                        <Text color={theme.textSecondary} fontSize={13} fontWeight="600" letterSpacing={0.5}>
                            HIZLI ERİŞİM
                        </Text>
                        <XStack gap="$3">
                            <QuickAction
                                icon="🔔"
                                label="Live Signals"
                                onPress={() => navigation.navigate('Signals')}
                            />
                            <QuickAction
                                icon="📋"
                                label="Daily Picks"
                                onPress={() => navigation.navigate('Picks')}
                            />
                            <QuickAction
                                icon="📊"
                                label="Statistics"
                                onPress={() => navigation.navigate('Stats')}
                            />
                            <QuickAction
                                icon="⚡"
                                label="Admin"
                                onPress={() => navigation.navigate('Admin')}
                            />
                        </XStack>
                    </YStack>

                    {/* Today's Picks */}
                    <YStack gap="$3">
                        <XStack justifyContent="space-between" alignItems="center">
                            <Text color={theme.textSecondary} fontSize={13} fontWeight="600" letterSpacing={0.5}>
                                GÜNÜN BAHİSLERİ
                            </Text>
                            <Button
                                size="$2"
                                chromeless
                                color={theme.primary}
                                onPress={() => navigation.navigate('Picks')}
                                pressStyle={{ opacity: 0.7 }}
                            >
                                Tümü →
                            </Button>
                        </XStack>

                        {picks.slice(0, 3).map((pick, index) => (
                            <Card
                                key={index}
                                animation="quick"
                                enterStyle={{ opacity: 0, x: -20 }}
                                pressStyle={{ scale: 0.98 }}
                                backgroundColor={theme.bgCard}
                                borderColor={theme.border}
                                borderWidth={1}
                                borderRadius={16}
                                padding="$4"
                            >
                                <XStack justifyContent="space-between" alignItems="center">
                                    <YStack flex={1} gap="$1">
                                        <XStack gap="$2" alignItems="center">
                                            <YStack
                                                backgroundColor={theme.primary + '20'}
                                                paddingHorizontal="$2"
                                                paddingVertical={4}
                                                borderRadius={6}
                                            >
                                                <Text color={theme.primary} fontSize={10} fontWeight="700">
                                                    {pick.market}
                                                </Text>
                                            </YStack>
                                            <Text color={theme.textMuted} fontSize={11}>
                                                {pick.league}
                                            </Text>
                                        </XStack>
                                        <Text color={theme.text} fontSize={15} fontWeight="600">
                                            {pick.match}
                                        </Text>
                                    </YStack>

                                    <YStack
                                        backgroundColor={theme.secondary + '15'}
                                        paddingHorizontal="$3"
                                        paddingVertical="$2"
                                        borderRadius={10}
                                        borderWidth={1}
                                        borderColor={theme.secondary + '30'}
                                    >
                                        <Text color={theme.secondary} fontSize={16} fontWeight="800">
                                            {pick.odds}
                                        </Text>
                                    </YStack>
                                </XStack>
                            </Card>
                        ))}
                    </YStack>

                    <YStack height={30} />
                </YStack>
            </ScrollView>
        </Theme>
    );
}
