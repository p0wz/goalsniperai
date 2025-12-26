// GoalSniper Mobile - Premium Live Signals Screen

import React, { useState, useEffect } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import {
    YStack,
    XStack,
    Text,
    Card,
    H2,
    Theme,
    Circle,
} from 'tamagui';
import { signalService } from '../../services/api';

// Premium Theme
const theme = {
    bg: '#000000',
    bgCard: 'rgba(20, 20, 25, 0.95)',
    primary: '#00FF88',
    secondary: '#00D4FF',
    accent: '#8B5CF6',
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
    text: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textMuted: 'rgba(255, 255, 255, 0.4)',
    border: 'rgba(255, 255, 255, 0.08)',
};

export default function SignalsScreen() {
    const [signals, setSignals] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadSignals();
        const interval = setInterval(loadSignals, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadSignals = async () => {
        try {
            const result = await signalService.getLiveSignals();
            setSignals(result || []);
        } catch (error) {
            console.error('Error loading signals:', error);
            // Demo data
            setSignals([
                {
                    homeTeam: 'Fenerbahçe',
                    awayTeam: 'Galatasaray',
                    score: '1-1',
                    time: 67,
                    league: 'Süper Lig',
                    strategyId: 'LG_GOAL_PUSH',
                    confidencePercent: 85,
                    reason: 'Yüksek baskı, 12 şut, 8 tehlikeli atak',
                    stats: {
                        dangerousAttacks: { home: 45, away: 38 },
                        shotsOnTarget: { home: 6, away: 4 },
                    },
                },
                {
                    homeTeam: 'Man United',
                    awayTeam: 'Chelsea',
                    score: '0-0',
                    time: 55,
                    league: 'Premier League',
                    strategyId: 'HT_PRESSURE',
                    confidencePercent: 72,
                    reason: 'Dominant sahiplik, gol bekleniyor',
                    stats: {
                        dangerousAttacks: { home: 52, away: 28 },
                        shotsOnTarget: { home: 8, away: 2 },
                    },
                },
            ]);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadSignals();
        setRefreshing(false);
    };

    return (
        <Theme name="dark">
            <YStack flex={1} backgroundColor={theme.bg}>

                {/* Header */}
                <XStack padding="$4" justifyContent="space-between" alignItems="center">
                    <H2 color={theme.text} fontSize={24} fontWeight="800" letterSpacing={-0.5}>
                        Live Signals
                    </H2>
                    <XStack
                        backgroundColor={theme.error + '20'}
                        paddingHorizontal="$3"
                        paddingVertical="$2"
                        borderRadius={12}
                        borderWidth={1}
                        borderColor={theme.error + '40'}
                        alignItems="center"
                        gap="$2"
                    >
                        <Circle size={8} backgroundColor={theme.error} />
                        <Text color={theme.error} fontSize={12} fontWeight="700">
                            LIVE
                        </Text>
                    </XStack>
                </XStack>

                <ScrollView
                    style={{ flex: 1 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    <YStack padding="$4" paddingTop={0} gap="$4">
                        {signals.length > 0 ? (
                            signals.map((signal, index) => (
                                <Card
                                    key={index}
                                    animation="bouncy"
                                    enterStyle={{ opacity: 0, x: -30 }}
                                    pressStyle={{ scale: 0.98 }}
                                    backgroundColor={theme.bgCard}
                                    borderColor={theme.secondary + '30'}
                                    borderWidth={1}
                                    borderRadius={24}
                                    overflow="hidden"
                                >
                                    {/* Glow effect */}
                                    <YStack
                                        position="absolute"
                                        top={-50}
                                        right={-50}
                                        width={150}
                                        height={150}
                                        backgroundColor={theme.secondary}
                                        opacity={0.08}
                                        borderRadius={75}
                                    />

                                    <YStack padding="$4" gap="$4">
                                        {/* Header */}
                                        <XStack justifyContent="space-between" alignItems="center">
                                            <XStack gap="$3" alignItems="center">
                                                <YStack
                                                    width={50}
                                                    height={50}
                                                    borderRadius={14}
                                                    backgroundColor={theme.primary + '20'}
                                                    alignItems="center"
                                                    justifyContent="center"
                                                >
                                                    <Text color={theme.primary} fontSize={16} fontWeight="800">
                                                        {signal.time}'
                                                    </Text>
                                                </YStack>
                                                <YStack>
                                                    <Text color={theme.textMuted} fontSize={11}>
                                                        {signal.league}
                                                    </Text>
                                                    <XStack
                                                        backgroundColor={theme.accent + '20'}
                                                        paddingHorizontal="$2"
                                                        paddingVertical={2}
                                                        borderRadius={4}
                                                        marginTop={4}
                                                    >
                                                        <Text color={theme.accent} fontSize={9} fontWeight="700">
                                                            {signal.strategyId}
                                                        </Text>
                                                    </XStack>
                                                </YStack>
                                            </XStack>

                                            <YStack
                                                backgroundColor={theme.text + '10'}
                                                paddingHorizontal="$4"
                                                paddingVertical="$2"
                                                borderRadius={12}
                                            >
                                                <Text color={theme.text} fontSize={24} fontWeight="900">
                                                    {signal.score}
                                                </Text>
                                            </YStack>
                                        </XStack>

                                        {/* Match */}
                                        <Text color={theme.text} fontSize={18} fontWeight="700" letterSpacing={-0.3}>
                                            {signal.homeTeam} vs {signal.awayTeam}
                                        </Text>

                                        {/* Confidence */}
                                        <YStack gap="$2">
                                            <XStack justifyContent="space-between" alignItems="center">
                                                <Text color={theme.textMuted} fontSize={12}>Confidence</Text>
                                                <Text color={theme.success} fontSize={14} fontWeight="800">
                                                    {signal.confidencePercent}%
                                                </Text>
                                            </XStack>
                                            <YStack height={6} backgroundColor={theme.border} borderRadius={3}>
                                                <YStack
                                                    width={`${signal.confidencePercent}%`}
                                                    height="100%"
                                                    backgroundColor={theme.success}
                                                    borderRadius={3}
                                                />
                                            </YStack>
                                        </YStack>

                                        {/* Reason */}
                                        <YStack
                                            backgroundColor={theme.text + '05'}
                                            padding="$3"
                                            borderRadius={12}
                                            borderWidth={1}
                                            borderColor={theme.border}
                                        >
                                            <Text color={theme.textSecondary} fontSize={12} fontStyle="italic">
                                                "{signal.reason}"
                                            </Text>
                                        </YStack>

                                        {/* Stats */}
                                        <XStack justifyContent="space-between">
                                            <YStack alignItems="center" flex={1}>
                                                <Text color={theme.textMuted} fontSize={10}>D. Attacks</Text>
                                                <Text color={theme.text} fontSize={16} fontWeight="700">
                                                    {signal.stats?.dangerousAttacks?.home || 0} - {signal.stats?.dangerousAttacks?.away || 0}
                                                </Text>
                                            </YStack>
                                            <YStack alignItems="center" flex={1}>
                                                <Text color={theme.textMuted} fontSize={10}>Shots OT</Text>
                                                <Text color={theme.text} fontSize={16} fontWeight="700">
                                                    {signal.stats?.shotsOnTarget?.home || 0} - {signal.stats?.shotsOnTarget?.away || 0}
                                                </Text>
                                            </YStack>
                                        </XStack>
                                    </YStack>
                                </Card>
                            ))
                        ) : (
                            <Card
                                backgroundColor={theme.bgCard}
                                borderColor={theme.border}
                                borderWidth={1}
                                borderRadius={24}
                                padding="$8"
                                alignItems="center"
                            >
                                <YStack
                                    width={80}
                                    height={80}
                                    borderRadius={24}
                                    backgroundColor={theme.secondary + '10'}
                                    alignItems="center"
                                    justifyContent="center"
                                    marginBottom="$4"
                                >
                                    <Text fontSize={36}>🔍</Text>
                                </YStack>
                                <Text color={theme.text} fontSize={18} fontWeight="700" marginBottom="$2">
                                    Aktif sinyal yok
                                </Text>
                                <Text color={theme.textMuted} fontSize={14} textAlign="center">
                                    Live bot aktif olduğunda sinyaller burada görünecek
                                </Text>
                            </Card>
                        )}

                        <YStack height={30} />
                    </YStack>
                </ScrollView>
            </YStack>
        </Theme>
    );
}
