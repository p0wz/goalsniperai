// GoalSniper Mobile - Canlı Maçlar
// EXACT copy of betting-buddy-ai/src/pages/Live.tsx

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

// EXACT colors from betting-buddy-ai
const colors = {
    background: 'hsl(220, 20%, 6%)',
    card: 'hsl(220, 18%, 10%)',
    cardBorder: 'hsl(220, 14%, 18%)',
    primary: 'hsl(142, 70%, 45%)',
    secondary: 'hsl(220, 14%, 16%)',
    accent: 'hsl(38, 92%, 50%)',
    destructive: 'hsl(0, 84%, 60%)',
    muted: 'hsl(220, 10%, 60%)',
    foreground: 'hsl(0, 0%, 98%)',
};

const api = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: 10000,
});

export default function LiveMatchesScreen({ navigation }) {
    const [matches, setMatches] = useState([]);
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

            const picksRes = await api.get('/api/mobile/picks').catch(() => ({ data: { picks: [] } }));
            setMatches(picksRes.data.picks || []);
        } catch (error) {
            console.error('Load data error:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // Live matches from picks or mock data like Live.tsx lines 8-49
    const liveMatches = matches.length > 0 ? matches.map((p, i) => ({
        id: i + 1,
        league: p.league || 'Premier League',
        home: p.homeTeam || 'Home Team',
        away: p.awayTeam || 'Away Team',
        homeScore: parseInt(p.resultScore?.split(':')[0]?.trim()) || 0,
        awayScore: parseInt(p.resultScore?.split(':')[1]?.trim()) || 0,
        minute: p.minute || (67 - i * 15),
        events: [`⚽ ${23 + i * 10}' Gol`, `⚽ ${45 + i * 5}' Gol`],
    })) : [
        { id: 1, league: 'Premier League', home: 'Manchester United', away: 'Liverpool', homeScore: 2, awayScore: 1, minute: 67, events: ["⚽ 23' Rashford", "⚽ 52' Bruno"] },
        { id: 2, league: 'La Liga', home: 'Barcelona', away: 'Atletico Madrid', homeScore: 1, awayScore: 1, minute: 34, events: ["⚽ 12' Lewandowski", "⚽ 28' Griezmann"] },
        { id: 3, league: 'Serie A', home: 'AC Milan', away: 'Napoli', homeScore: 0, awayScore: 2, minute: 78, events: ["⚽ 15' Osimhen", "⚽ 61' Kvaratskhelia"] },
        { id: 4, league: 'Bundesliga', home: 'Dortmund', away: 'Leipzig', homeScore: 3, awayScore: 2, minute: 89, events: ["⚽ 44' Bellingham", "⚽ 82' Reus"] },
    ];

    return (
        <Theme name="dark">
            <ScrollView
                style={{ flex: 1, backgroundColor: colors.background }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                showsVerticalScrollIndicator={false}
            >
                <YStack paddingBottom={100}>
                    {/* Header - EXACT from Live.tsx lines 54-60 */}
                    <YStack padding={16}>
                        <XStack alignItems="center" gap={8} marginBottom={8}>
                            {/* Live pulse dot */}
                            <YStack width={12} height={12} borderRadius={6} backgroundColor={colors.destructive} />
                            <Text color={colors.foreground} fontSize={20} fontWeight="bold">Canlı Maçlar</Text>
                        </XStack>
                        <Text color={colors.muted} fontSize={14}>
                            {liveMatches.length} maç şu anda oynanıyor
                        </Text>
                    </YStack>

                    {/* Live Matches - EXACT from Live.tsx lines 63-101 */}
                    <YStack paddingHorizontal={16} gap={12}>
                        {liveMatches.map((match) => (
                            <YStack
                                key={match.id}
                                backgroundColor={colors.card}
                                borderColor={colors.cardBorder}
                                borderWidth={0.5}
                                borderRadius={16}
                                padding={16}
                            >
                                {/* League & Minute */}
                                <XStack justifyContent="space-between" alignItems="center" marginBottom={12}>
                                    <Text color={colors.muted} fontSize={12}>{match.league}</Text>
                                    <XStack alignItems="center" gap={8}>
                                        {/* Live pulse dot */}
                                        <YStack width={8} height={8} borderRadius={4} backgroundColor={colors.destructive} />
                                        <Text color={colors.destructive} fontSize={12} fontWeight="500">{match.minute}'</Text>
                                    </XStack>
                                </XStack>

                                {/* Teams & Score */}
                                <XStack justifyContent="space-between" alignItems="center" marginBottom={16}>
                                    <YStack flex={1}>
                                        <Text color={colors.foreground} fontSize={14} fontWeight="600">{match.home}</Text>
                                    </YStack>
                                    <YStack
                                        backgroundColor="hsla(220, 14%, 16%, 0.8)"
                                        paddingHorizontal={20}
                                        paddingVertical={12}
                                        borderRadius={12}
                                    >
                                        <Text color={colors.foreground} fontSize={24} fontWeight="bold">
                                            {match.homeScore} - {match.awayScore}
                                        </Text>
                                    </YStack>
                                    <YStack flex={1} alignItems="flex-end">
                                        <Text color={colors.foreground} fontSize={14} fontWeight="600">{match.away}</Text>
                                    </YStack>
                                </XStack>

                                {/* Events & Detail button */}
                                <XStack justifyContent="space-between" alignItems="center">
                                    <XStack flexWrap="wrap" gap={8}>
                                        {match.events.slice(-2).map((event, idx) => (
                                            <YStack
                                                key={idx}
                                                backgroundColor="hsla(220, 14%, 16%, 0.5)"
                                                paddingHorizontal={8}
                                                paddingVertical={4}
                                                borderRadius={8}
                                            >
                                                <Text color={colors.muted} fontSize={12}>{event}</Text>
                                            </YStack>
                                        ))}
                                    </XStack>
                                    <Pressable>
                                        <XStack alignItems="center" gap={4}>
                                            <Text color={colors.primary} fontSize={14}>Detay</Text>
                                            <Text color={colors.primary}>→</Text>
                                        </XStack>
                                    </Pressable>
                                </XStack>
                            </YStack>
                        ))}
                    </YStack>
                </YStack>
            </ScrollView>
        </Theme>
    );
}
