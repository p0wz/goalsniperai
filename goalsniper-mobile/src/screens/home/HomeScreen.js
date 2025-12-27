// GoalSniper Mobile - Ana Sayfa
// EXACT copy of betting-buddy-ai/src/pages/AppHome.tsx

import React, { useState, useEffect } from 'react';
import { RefreshControl, ScrollView, Platform, Pressable } from 'react-native';
import {
    YStack,
    XStack,
    Text,
    Theme,
} from 'tamagui';
import { API_CONFIG } from '../../config/api';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

// EXACT colors from betting-buddy-ai index.css
const colors = {
    background: 'hsl(220, 20%, 6%)',      // --background: 220 20% 6%
    card: 'hsl(220, 18%, 10%)',            // --card: 220 18% 10%
    cardBorder: 'hsl(220, 14%, 18%)',      // --border: 220 14% 18%
    primary: 'hsl(142, 70%, 45%)',         // --primary: 142 70% 45%
    secondary: 'hsl(220, 14%, 16%)',       // --secondary: 220 14% 16%
    accent: 'hsl(38, 92%, 50%)',           // --accent: 38 92% 50%
    destructive: 'hsl(0, 84%, 60%)',       // --destructive: 0 84% 60%
    muted: 'hsl(220, 10%, 60%)',           // --muted-foreground: 220 10% 60%
    foreground: 'hsl(0, 0%, 98%)',         // --foreground: 0 0% 98%
};

const api = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: 10000,
});

export default function HomeScreen({ navigation }) {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [picks, setPicks] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            let token;
            if (Platform.OS === 'web') {
                token = localStorage.getItem('authToken');
            } else {
                token = await SecureStore.getItemAsync('authToken');
            }
            if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            const [profileRes, statsRes, picksRes] = await Promise.all([
                api.get('/api/mobile/profile').catch(() => ({ data: { user: { name: 'Kullanıcı' } } })),
                api.get('/api/mobile/stats').catch(() => ({ data: { stats: {} } })),
                api.get('/api/mobile/picks').catch(() => ({ data: { picks: [] } })),
            ]);

            setUser(profileRes.data.user);
            setStats(statsRes.data.stats);
            setPicks(picksRes.data.picks || []);
        } catch (error) {
            console.error('Load data error:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const userName = user?.name || 'Kullanıcı';
    const winRate = stats?.winRate || 78;
    const streak = stats?.streak || 5;

    // Stats row like AppHome.tsx lines 41-45
    const statsRow = [
        { label: 'Başarı', value: `${winRate}%`, icon: '🏆' },
        { label: 'Bu Hafta', value: '+₺1,240', icon: '📈' },
        { label: 'Streak', value: `${streak} 🔥`, icon: '🔥' },
    ];

    // Featured matches from picks
    const featuredMatches = picks.slice(0, 2).map((p, i) => ({
        id: i + 1,
        league: p.league || (i === 0 ? 'UEFA Şampiyonlar Ligi' : 'Premier League'),
        home: p.homeTeam || (i === 0 ? 'Real Madrid' : 'Arsenal'),
        away: p.awayTeam || (i === 0 ? 'Bayern Munich' : 'Man City'),
        homeScore: p.resultScore?.split(':')[0]?.trim() || '-',
        awayScore: p.resultScore?.split(':')[1]?.trim() || '-',
        time: p.matchTime || (i === 0 ? '21:00' : '22:00'),
        prediction: p.market || (i === 0 ? '1' : 'X'),
        confidence: p.confidence || (i === 0 ? 78 : 65),
    }));

    // Hot predictions from picks
    const hotPredictions = picks.slice(2, 5).map((p, i) => ({
        id: i + 1,
        match: p.match || `${p.homeTeam} vs ${p.awayTeam}`,
        prediction: p.market || '2.5 Üst',
        odds: p.odds || '1.85',
        confidence: p.confidence || 82,
    }));

    return (
        <Theme name="dark">
            <ScrollView
                style={{ flex: 1, backgroundColor: colors.background }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                showsVerticalScrollIndicator={false}
            >
                <YStack paddingBottom={100}>
                    {/* Header - EXACT from AppHome.tsx lines 50-62 */}
                    <XStack padding={16} justifyContent="space-between" alignItems="center">
                        <YStack>
                            <Text color={colors.muted} fontSize={14}>Hoş geldin,</Text>
                            <Text color={colors.foreground} fontSize={20} fontWeight="bold">{userName} 👋</Text>
                        </YStack>
                        <Pressable onPress={() => navigation?.navigate?.('Premium')}>
                            <XStack
                                backgroundColor="hsla(38, 92%, 50%, 0.2)"
                                paddingHorizontal={16}
                                paddingVertical={8}
                                borderRadius={12}
                                alignItems="center"
                                gap={8}
                            >
                                <Text>👑</Text>
                                <Text color={colors.accent} fontSize={14} fontWeight="500">Pro</Text>
                            </XStack>
                        </Pressable>
                    </XStack>

                    {/* Stats - EXACT from AppHome.tsx lines 65-77 */}
                    <YStack paddingHorizontal={16} marginBottom={24}>
                        {/* glass-card = bg-card/80 backdrop-blur-xl border border-border/50 */}
                        <XStack
                            backgroundColor={colors.card}
                            borderColor={colors.cardBorder}
                            borderWidth={0.5}
                            borderRadius={16}
                            padding={16}
                            justifyContent="space-between"
                        >
                            {statsRow.map((stat, idx) => (
                                <YStack key={idx} alignItems="center">
                                    <XStack alignItems="center" justifyContent="center" gap={4} marginBottom={4}>
                                        <Text fontSize={12} color={colors.muted}>{stat.icon}</Text>
                                        <Text color={colors.muted} fontSize={12}>{stat.label}</Text>
                                    </XStack>
                                    <Text color={colors.foreground} fontSize={18} fontWeight="bold">{stat.value}</Text>
                                </YStack>
                            ))}
                        </XStack>
                    </YStack>

                    {/* Öne Çıkan Maçlar - EXACT from AppHome.tsx lines 80-130 */}
                    <YStack paddingHorizontal={16} marginBottom={24}>
                        <XStack justifyContent="space-between" alignItems="center" marginBottom={16}>
                            <Text color={colors.foreground} fontSize={18} fontWeight="600">Öne Çıkan Maçlar</Text>
                            <XStack alignItems="center" gap={4}>
                                <Text color={colors.primary} fontSize={14}>Tümü</Text>
                                <Text color={colors.primary}>→</Text>
                            </XStack>
                        </XStack>

                        <YStack gap={12}>
                            {featuredMatches.map((match) => (
                                <YStack
                                    key={match.id}
                                    backgroundColor={colors.card}
                                    borderColor={colors.cardBorder}
                                    borderWidth={0.5}
                                    borderRadius={16}
                                    padding={16}
                                >
                                    {/* League & Time */}
                                    <XStack justifyContent="space-between" alignItems="center" marginBottom={12}>
                                        <Text color={colors.muted} fontSize={12}>{match.league}</Text>
                                        <Text color={colors.accent} fontSize={12} fontWeight="500">{match.time}</Text>
                                    </XStack>

                                    {/* Teams & Score */}
                                    <XStack justifyContent="space-between" alignItems="center" marginBottom={12}>
                                        <YStack flex={1}>
                                            <Text color={colors.foreground} fontSize={14} fontWeight="500">{match.home}</Text>
                                        </YStack>
                                        <YStack
                                            backgroundColor="hsla(220, 14%, 16%, 0.5)"
                                            paddingHorizontal={16}
                                            paddingVertical={8}
                                            borderRadius={12}
                                        >
                                            <Text color={colors.foreground} fontSize={18} fontWeight="bold">
                                                {match.homeScore} - {match.awayScore}
                                            </Text>
                                        </YStack>
                                        <YStack flex={1} alignItems="flex-end">
                                            <Text color={colors.foreground} fontSize={14} fontWeight="500">{match.away}</Text>
                                        </YStack>
                                    </XStack>

                                    {/* Prediction & Confidence */}
                                    <XStack justifyContent="space-between" alignItems="center">
                                        <XStack alignItems="center" gap={8}>
                                            <Text color={colors.muted} fontSize={12}>Tahmin:</Text>
                                            {/* gradient-primary = linear-gradient(135deg, primary 0%, gradient-end 100%) */}
                                            <YStack
                                                backgroundColor={colors.primary}
                                                paddingHorizontal={12}
                                                paddingVertical={4}
                                                borderRadius={8}
                                            >
                                                <Text color={colors.foreground} fontSize={14} fontWeight="500">{match.prediction}</Text>
                                            </YStack>
                                        </XStack>
                                        <XStack alignItems="center" gap={8}>
                                            {/* Progress bar */}
                                            <YStack width={80} height={8} backgroundColor={colors.secondary} borderRadius={4} overflow="hidden">
                                                <YStack
                                                    height="100%"
                                                    width={`${match.confidence}%`}
                                                    backgroundColor={colors.primary}
                                                    borderRadius={4}
                                                />
                                            </YStack>
                                            <Text color={colors.primary} fontSize={14} fontWeight="500">{match.confidence}%</Text>
                                        </XStack>
                                    </XStack>
                                </YStack>
                            ))}
                        </YStack>
                    </YStack>

                    {/* Sıcak Tahminler - EXACT from AppHome.tsx lines 133-155 */}
                    <YStack paddingHorizontal={16} marginBottom={24}>
                        <XStack alignItems="center" gap={8} marginBottom={16}>
                            <Text color={colors.destructive} fontSize={16}>🔥</Text>
                            <Text color={colors.foreground} fontSize={18} fontWeight="600">Sıcak Tahminler</Text>
                        </XStack>

                        <YStack gap={8}>
                            {hotPredictions.map((pred) => (
                                <XStack
                                    key={pred.id}
                                    backgroundColor={colors.card}
                                    borderColor={colors.cardBorder}
                                    borderWidth={0.5}
                                    borderRadius={12}
                                    padding={16}
                                    justifyContent="space-between"
                                    alignItems="center"
                                >
                                    <YStack>
                                        <Text color={colors.muted} fontSize={14}>{pred.match}</Text>
                                        <Text color={colors.foreground} fontSize={14} fontWeight="500">{pred.prediction}</Text>
                                    </YStack>
                                    <YStack alignItems="flex-end">
                                        <Text color={colors.accent} fontSize={18} fontWeight="bold">{pred.odds}</Text>
                                        <Text color={colors.primary} fontSize={12}>{pred.confidence}% güven</Text>
                                    </YStack>
                                </XStack>
                            ))}
                        </YStack>
                    </YStack>

                    {/* VIP Banner - EXACT from AppHome.tsx lines 158-175 */}
                    <YStack paddingHorizontal={16}>
                        <Pressable onPress={() => navigation?.navigate?.('Premium')}>
                            <YStack
                                backgroundColor={colors.card}
                                borderColor="hsla(38, 92%, 50%, 0.5)"
                                borderWidth={0.5}
                                borderRadius={16}
                                padding={20}
                                position="relative"
                                overflow="hidden"
                            >
                                {/* Gradient overlay */}
                                <YStack
                                    position="absolute"
                                    top={0}
                                    left={0}
                                    right={0}
                                    bottom={0}
                                    backgroundColor="hsla(38, 92%, 50%, 0.1)"
                                />
                                <XStack position="relative" alignItems="center" gap={16}>
                                    {/* gradient-accent icon */}
                                    <YStack
                                        width={48}
                                        height={48}
                                        borderRadius={12}
                                        backgroundColor={colors.accent}
                                        alignItems="center"
                                        justifyContent="center"
                                    >
                                        <Text fontSize={24}>⚡</Text>
                                    </YStack>
                                    <YStack flex={1}>
                                        <Text color={colors.foreground} fontSize={14} fontWeight="600">VIP Premium</Text>
                                        <Text color={colors.muted} fontSize={14}>Sınırsız tahmin ve özel analizler</Text>
                                    </YStack>
                                    <Text color={colors.accent} fontSize={18}>→</Text>
                                </XStack>
                            </YStack>
                        </Pressable>
                    </YStack>
                </YStack>
            </ScrollView>
        </Theme>
    );
}
