// GoalSniper Mobile - Premium Stats Screen with Tamagui

import React, { useState, useEffect } from 'react';
import { RefreshControl, ScrollView, Dimensions } from 'react-native';
import {
    YStack,
    XStack,
    Text,
    Card,
    H2,
    Theme,
    Circle,
    Separator,
    Progress,
} from 'tamagui';
import { betsService } from '../../services/api';

const colors = {
    background: '#0D0D0D',
    surface: '#1A1A1A',
    lime: '#84CC16',
    electricBlue: '#3B82F6',
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
};

const screenWidth = Dimensions.get('window').width;

export default function StatsScreen() {
    const [stats, setStats] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const result = await betsService.getStats();
            setStats(result);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadStats();
        setRefreshing(false);
    };

    const winRate = stats?.winRate || 0;
    const total = stats?.total || 0;
    const won = stats?.won || 0;
    const lost = stats?.lost || 0;
    const pending = stats?.pending || 0;

    // Mock market stats for display
    const marketStats = [
        { name: 'BTTS', winRate: 78, total: 45, won: 35 },
        { name: 'Over 2.5', winRate: 72, total: 38, won: 27 },
        { name: '1X DC', winRate: 85, total: 22, won: 19 },
        { name: 'Ev 1.5+', winRate: 80, total: 30, won: 24 },
        { name: 'Alt 2.5', winRate: 68, total: 25, won: 17 },
    ];

    return (
        <Theme name="dark">
            <ScrollView
                style={{ flex: 1, backgroundColor: colors.background }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.lime} />
                }
            >
                <YStack padding="$4" gap="$4">
                    {/* Header */}
                    <H2 color="white" fontSize={24} paddingTop="$2">📈 İstatistikler</H2>

                    {/* Main Win Rate Card */}
                    <Card
                        animation="bouncy"
                        pressStyle={{ scale: 0.98 }}
                        backgroundColor={colors.lime + '10'}
                        borderColor={colors.lime + '40'}
                        borderWidth={1}
                        padding="$5"
                        borderRadius="$6"
                    >
                        <YStack alignItems="center" gap="$3">
                            <Text color="#A1A1AA" fontSize={14}>Toplam Win Rate</Text>
                            <XStack alignItems="flex-end" gap="$1">
                                <Text color={colors.lime} fontSize={72} fontWeight="bold">
                                    {winRate}
                                </Text>
                                <Text color={colors.lime} fontSize={28} marginBottom="$3">%</Text>
                            </XStack>
                            <Progress
                                value={winRate}
                                backgroundColor="#27272A"
                                height={12}
                                borderRadius="$4"
                                width="100%"
                            >
                                <Progress.Indicator
                                    animation="bouncy"
                                    backgroundColor={colors.lime}
                                    borderRadius="$4"
                                />
                            </Progress>
                        </YStack>
                    </Card>

                    {/* Stats Grid */}
                    <XStack gap="$3">
                        <Card
                            flex={1}
                            animation="quick"
                            backgroundColor={colors.surface}
                            borderColor="#27272A"
                            bordered
                            padding="$4"
                            borderRadius="$5"
                            alignItems="center"
                        >
                            <Circle size={50} backgroundColor={colors.success + '20'} marginBottom="$2">
                                <Text fontSize={20}>✓</Text>
                            </Circle>
                            <Text color={colors.success} fontSize={32} fontWeight="bold">{won}</Text>
                            <Text color="#71717A" fontSize={12}>WON</Text>
                        </Card>

                        <Card
                            flex={1}
                            animation="quick"
                            backgroundColor={colors.surface}
                            borderColor="#27272A"
                            bordered
                            padding="$4"
                            borderRadius="$5"
                            alignItems="center"
                        >
                            <Circle size={50} backgroundColor={colors.error + '20'} marginBottom="$2">
                                <Text fontSize={20}>✗</Text>
                            </Circle>
                            <Text color={colors.error} fontSize={32} fontWeight="bold">{lost}</Text>
                            <Text color="#71717A" fontSize={12}>LOST</Text>
                        </Card>

                        <Card
                            flex={1}
                            animation="quick"
                            backgroundColor={colors.surface}
                            borderColor="#27272A"
                            bordered
                            padding="$4"
                            borderRadius="$5"
                            alignItems="center"
                        >
                            <Circle size={50} backgroundColor={colors.warning + '20'} marginBottom="$2">
                                <Text fontSize={20}>⏳</Text>
                            </Circle>
                            <Text color={colors.warning} fontSize={32} fontWeight="bold">{pending}</Text>
                            <Text color="#71717A" fontSize={12}>PENDING</Text>
                        </Card>
                    </XStack>

                    {/* Market Performance */}
                    <YStack gap="$3">
                        <Text color="white" fontSize={18} fontWeight="bold">📊 Market Performansı</Text>

                        {marketStats.map((market, index) => (
                            <Card
                                key={index}
                                animation="quick"
                                enterStyle={{ opacity: 0, x: -10 }}
                                pressStyle={{ scale: 0.98 }}
                                backgroundColor={colors.surface}
                                borderColor="#27272A"
                                bordered
                                padding="$4"
                                borderRadius="$4"
                            >
                                <YStack gap="$2">
                                    <XStack justifyContent="space-between" alignItems="center">
                                        <Text color="white" fontSize={16} fontWeight="600">{market.name}</Text>
                                        <Text color={colors.lime} fontSize={18} fontWeight="bold">{market.winRate}%</Text>
                                    </XStack>
                                    <Progress
                                        value={market.winRate}
                                        backgroundColor="#27272A"
                                        height={6}
                                        borderRadius="$4"
                                    >
                                        <Progress.Indicator
                                            animation="bouncy"
                                            backgroundColor={market.winRate >= 75 ? colors.success : market.winRate >= 60 ? colors.warning : colors.error}
                                            borderRadius="$4"
                                        />
                                    </Progress>
                                    <Text color="#71717A" fontSize={11}>
                                        {market.won}/{market.total} bahis
                                    </Text>
                                </YStack>
                            </Card>
                        ))}
                    </YStack>

                    <YStack height={20} />
                </YStack>
            </ScrollView>
        </Theme>
    );
}
