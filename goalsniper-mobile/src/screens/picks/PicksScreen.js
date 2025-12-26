// GoalSniper Mobile - Premium Picks Screen
// Professional design with tabs, animated cards, and refined typography

import React, { useState, useEffect } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import {
    YStack,
    XStack,
    Text,
    Card,
    Theme,
    Button,
} from 'tamagui';
import { picksService } from '../../services/api';

// Premium Theme
const theme = {
    bg: '#000000',
    bgCard: 'rgba(20, 20, 25, 0.95)',
    bgCardAlt: 'rgba(30, 30, 40, 0.9)',
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

export default function PicksScreen() {
    const [picks, setPicks] = useState({ singles: [], parlay: [] });
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('singles');

    useEffect(() => {
        loadPicks();
    }, []);

    const loadPicks = async () => {
        try {
            const result = await picksService.getTodayPicks();
            setPicks({
                singles: result.singles || [],
                parlay: result.parlay || [],
            });
        } catch (error) {
            console.error('Error loading picks:', error);
            // Demo data
            setPicks({
                singles: [
                    { match: 'Man City vs Liverpool', market: 'BTTS', odds: '1.85', league: 'Premier League', status: 'PENDING' },
                    { match: 'Barcelona vs Real Madrid', market: 'Over 2.5', odds: '1.72', league: 'La Liga', status: 'WON' },
                    { match: 'Bayern vs Dortmund', market: '1X DC', odds: '1.55', league: 'Bundesliga', status: 'PENDING' },
                ],
                parlay: [
                    { match: 'Parlay #1 (3 Legs)', market: 'COMBO', odds: '4.85', league: '3 maç', status: 'PENDING' },
                ],
            });
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadPicks();
        setRefreshing(false);
    };

    const currentPicks = activeTab === 'singles' ? picks.singles : picks.parlay;

    const getStatusColor = (status) => {
        if (status === 'WON') return theme.success;
        if (status === 'LOST') return theme.error;
        return theme.warning;
    };

    return (
        <Theme name="dark">
            <YStack flex={1} backgroundColor={theme.bg}>

                {/* Tab Switcher */}
                <XStack padding="$4" gap="$2">
                    <Button
                        flex={1}
                        size="$4"
                        backgroundColor={activeTab === 'singles' ? theme.primary : theme.bgCard}
                        color={activeTab === 'singles' ? theme.bg : theme.text}
                        borderRadius={14}
                        borderWidth={activeTab === 'singles' ? 0 : 1}
                        borderColor={theme.border}
                        fontWeight="700"
                        onPress={() => setActiveTab('singles')}
                        animation="quick"
                        pressStyle={{ scale: 0.97 }}
                    >
                        ⭐ Singles ({picks.singles.length})
                    </Button>
                    <Button
                        flex={1}
                        size="$4"
                        backgroundColor={activeTab === 'parlay' ? theme.primary : theme.bgCard}
                        color={activeTab === 'parlay' ? theme.bg : theme.text}
                        borderRadius={14}
                        borderWidth={activeTab === 'parlay' ? 0 : 1}
                        borderColor={theme.border}
                        fontWeight="700"
                        onPress={() => setActiveTab('parlay')}
                        animation="quick"
                        pressStyle={{ scale: 0.97 }}
                    >
                        🔥 Parlay ({picks.parlay.length})
                    </Button>
                </XStack>

                <ScrollView
                    style={{ flex: 1 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    <YStack padding="$4" paddingTop={0} gap="$3">
                        {currentPicks.length > 0 ? (
                            currentPicks.map((pick, index) => (
                                <Card
                                    key={index}
                                    animation="bouncy"
                                    enterStyle={{ opacity: 0, y: 20 }}
                                    pressStyle={{ scale: 0.98 }}
                                    backgroundColor={theme.bgCard}
                                    borderColor={theme.border}
                                    borderWidth={1}
                                    borderRadius={20}
                                    padding="$4"
                                    overflow="hidden"
                                >
                                    {/* Status indicator line */}
                                    <YStack
                                        position="absolute"
                                        left={0}
                                        top={0}
                                        bottom={0}
                                        width={4}
                                        backgroundColor={getStatusColor(pick.status)}
                                        borderTopLeftRadius={20}
                                        borderBottomLeftRadius={20}
                                    />

                                    <YStack gap="$3" paddingLeft="$2">
                                        {/* Header */}
                                        <XStack justifyContent="space-between" alignItems="center">
                                            <XStack gap="$2" alignItems="center">
                                                <YStack
                                                    backgroundColor={theme.primary + '20'}
                                                    paddingHorizontal="$2"
                                                    paddingVertical={4}
                                                    borderRadius={6}
                                                >
                                                    <Text color={theme.primary} fontSize={11} fontWeight="700">
                                                        {pick.market}
                                                    </Text>
                                                </YStack>
                                                <Text color={theme.textMuted} fontSize={11}>
                                                    {pick.league}
                                                </Text>
                                            </XStack>

                                            <YStack
                                                backgroundColor={getStatusColor(pick.status) + '20'}
                                                paddingHorizontal="$2"
                                                paddingVertical={4}
                                                borderRadius={6}
                                            >
                                                <Text color={getStatusColor(pick.status)} fontSize={10} fontWeight="700">
                                                    {pick.status || 'PENDING'}
                                                </Text>
                                            </YStack>
                                        </XStack>

                                        {/* Match */}
                                        <Text color={theme.text} fontSize={17} fontWeight="700" letterSpacing={-0.3}>
                                            {pick.match}
                                        </Text>

                                        {/* Footer */}
                                        <XStack justifyContent="space-between" alignItems="center">
                                            <Text color={theme.textMuted} fontSize={12}>
                                                Tahmini kazanç oranı
                                            </Text>
                                            <YStack
                                                backgroundColor={theme.secondary + '15'}
                                                paddingHorizontal="$3"
                                                paddingVertical="$2"
                                                borderRadius={10}
                                                borderWidth={1}
                                                borderColor={theme.secondary + '30'}
                                            >
                                                <Text color={theme.secondary} fontSize={18} fontWeight="800">
                                                    {pick.odds}
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
                                    backgroundColor={theme.primary + '10'}
                                    alignItems="center"
                                    justifyContent="center"
                                    marginBottom="$4"
                                >
                                    <Text fontSize={36}>📋</Text>
                                </YStack>
                                <Text color={theme.text} fontSize={18} fontWeight="700" marginBottom="$2">
                                    Henüz pick yok
                                </Text>
                                <Text color={theme.textMuted} fontSize={14} textAlign="center">
                                    {activeTab === 'singles' ? 'Tekli' : 'Kombine'} bahisler burada görünecek
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
