// GoalSniper Mobile - Tahminlerim
// Shows approved bets from admin panel (betting-buddy-ai design)

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

export default function TahminlerimScreen() {
    const [picks, setPicks] = useState([]);
    const [stats, setStats] = useState({ total: 0, won: 0, lost: 0, pending: 0 });
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');

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

            // Fetch approved bets from backend
            const response = await api.get('/api/approved-bets').catch(() => ({ data: { bets: [] } }));
            const bets = response.data.bets || response.data || [];

            // Map approved bets to display format
            const mappedPicks = bets.map(bet => ({
                id: bet.id,
                match: bet.match || `${bet.homeTeam || bet.home_team} vs ${bet.awayTeam || bet.away_team}`,
                homeTeam: bet.homeTeam || bet.home_team,
                awayTeam: bet.awayTeam || bet.away_team,
                league: bet.league || 'Football',
                market: bet.market || bet.prediction,
                odds: bet.odds || '1.85',
                confidence: bet.confidence || 75,
                status: bet.status || 'PENDING',
                resultScore: bet.resultScore || bet.result_score,
                date: bet.matchTime || bet.match_time || formatDate(bet.approvedAt || bet.approved_at),
            }));

            setPicks(mappedPicks);

            // Calculate stats
            const wonCount = mappedPicks.filter(p => p.status === 'WON').length;
            const lostCount = mappedPicks.filter(p => p.status === 'LOST').length;
            const pendingCount = mappedPicks.filter(p => p.status === 'PENDING').length;

            setStats({
                total: mappedPicks.length,
                won: wonCount,
                lost: lostCount,
                pending: pendingCount,
            });
        } catch (error) {
            console.error('Load data error:', error);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Bugün';
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Bugün';
        if (diffDays === 1) return 'Dün';
        return `${diffDays} gün önce`;
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // Filter predictions
    const filteredPredictions = filter === 'all'
        ? picks
        : picks.filter(p => {
            if (filter === 'pending') return p.status === 'PENDING';
            if (filter === 'won') return p.status === 'WON';
            if (filter === 'lost') return p.status === 'LOST';
            return true;
        });

    // Status styles
    const getStatusIcon = (status) => {
        switch (status) {
            case 'WON': return '✓';
            case 'LOST': return '✗';
            default: return '◷';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'WON': return colors.primary;
            case 'LOST': return colors.destructive;
            default: return colors.accent;
        }
    };

    const filters = [
        { key: 'all', label: 'Tümü' },
        { key: 'pending', label: 'Bekleyen' },
        { key: 'won', label: 'Kazanan' },
        { key: 'lost', label: 'Kaybeden' },
    ];

    return (
        <Theme name="dark">
            <ScrollView
                style={{ flex: 1, backgroundColor: colors.background }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                showsVerticalScrollIndicator={false}
            >
                <YStack paddingBottom={100}>
                    {/* Header - EXACT from Predictions.tsx */}
                    <YStack padding={16}>
                        <XStack alignItems="center" gap={8} marginBottom={8}>
                            <Text color={colors.primary} fontSize={16}>🎯</Text>
                            <Text color={colors.foreground} fontSize={20} fontWeight="bold">Günün Tahminleri</Text>
                        </XStack>
                        <Text color={colors.muted} fontSize={13}>
                            Admin tarafından onaylanmış tahminler
                        </Text>
                    </YStack>

                    {/* Stats - 4 column grid */}
                    <YStack paddingHorizontal={16} marginBottom={24}>
                        <XStack gap={8}>
                            {/* Total */}
                            <YStack
                                flex={1}
                                backgroundColor={colors.card}
                                borderColor={colors.cardBorder}
                                borderWidth={0.5}
                                borderRadius={12}
                                padding={12}
                                alignItems="center"
                            >
                                <Text color={colors.foreground} fontSize={20} fontWeight="bold">{stats.total}</Text>
                                <Text color={colors.muted} fontSize={12}>Toplam</Text>
                            </YStack>

                            {/* Won */}
                            <YStack
                                flex={1}
                                backgroundColor={colors.card}
                                borderColor={colors.cardBorder}
                                borderWidth={0.5}
                                borderLeftWidth={2}
                                borderLeftColor={colors.primary}
                                borderRadius={12}
                                padding={12}
                                alignItems="center"
                            >
                                <Text color={colors.primary} fontSize={20} fontWeight="bold">{stats.won}</Text>
                                <Text color={colors.muted} fontSize={12}>Kazandı</Text>
                            </YStack>

                            {/* Lost */}
                            <YStack
                                flex={1}
                                backgroundColor={colors.card}
                                borderColor={colors.cardBorder}
                                borderWidth={0.5}
                                borderLeftWidth={2}
                                borderLeftColor={colors.destructive}
                                borderRadius={12}
                                padding={12}
                                alignItems="center"
                            >
                                <Text color={colors.destructive} fontSize={20} fontWeight="bold">{stats.lost}</Text>
                                <Text color={colors.muted} fontSize={12}>Kaybetti</Text>
                            </YStack>

                            {/* Pending */}
                            <YStack
                                flex={1}
                                backgroundColor={colors.card}
                                borderColor={colors.cardBorder}
                                borderWidth={0.5}
                                borderLeftWidth={2}
                                borderLeftColor={colors.accent}
                                borderRadius={12}
                                padding={12}
                                alignItems="center"
                            >
                                <Text color={colors.accent} fontSize={20} fontWeight="bold">{stats.pending}</Text>
                                <Text color={colors.muted} fontSize={12}>Bekliyor</Text>
                            </YStack>
                        </XStack>
                    </YStack>

                    {/* Filter Buttons */}
                    <YStack paddingHorizontal={16} marginBottom={16}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <XStack gap={8}>
                                {filters.map((f) => (
                                    <Pressable key={f.key} onPress={() => setFilter(f.key)}>
                                        <YStack
                                            backgroundColor={filter === f.key ? colors.primary : 'transparent'}
                                            borderColor={filter === f.key ? colors.primary : colors.cardBorder}
                                            borderWidth={1}
                                            borderRadius={12}
                                            paddingHorizontal={16}
                                            paddingVertical={8}
                                        >
                                            <Text
                                                color={filter === f.key ? colors.foreground : colors.muted}
                                                fontSize={14}
                                                fontWeight="500"
                                            >
                                                {f.label}
                                            </Text>
                                        </YStack>
                                    </Pressable>
                                ))}
                            </XStack>
                        </ScrollView>
                    </YStack>

                    {/* Predictions List */}
                    <YStack paddingHorizontal={16} gap={12}>
                        {filteredPredictions.length > 0 ? (
                            filteredPredictions.map((pred, i) => (
                                <YStack
                                    key={pred.id || i}
                                    backgroundColor={colors.card}
                                    borderColor={colors.cardBorder}
                                    borderWidth={0.5}
                                    borderLeftWidth={4}
                                    borderLeftColor={getStatusColor(pred.status)}
                                    borderRadius={12}
                                    padding={16}
                                >
                                    {/* Match & Status Icon */}
                                    <XStack justifyContent="space-between" alignItems="flex-start" marginBottom={8}>
                                        <YStack flex={1}>
                                            <Text color={colors.foreground} fontSize={14} fontWeight="500">
                                                {pred.match}
                                            </Text>
                                            <XStack alignItems="center" gap={8} marginTop={4}>
                                                <YStack
                                                    backgroundColor="hsla(220, 14%, 16%, 0.5)"
                                                    paddingHorizontal={8}
                                                    paddingVertical={2}
                                                    borderRadius={4}
                                                >
                                                    <Text color={colors.muted} fontSize={12}>{pred.league}</Text>
                                                </YStack>
                                                <Text color={colors.muted} fontSize={12}>{pred.date}</Text>
                                            </XStack>
                                        </YStack>
                                        <Text color={getStatusColor(pred.status)} fontSize={20}>{getStatusIcon(pred.status)}</Text>
                                    </XStack>

                                    {/* Prediction & Odds & Confidence */}
                                    <XStack justifyContent="space-between" alignItems="center" marginTop={12}>
                                        <XStack alignItems="center" gap={12}>
                                            {/* Prediction pill */}
                                            <YStack
                                                backgroundColor="hsla(142, 70%, 45%, 0.2)"
                                                paddingHorizontal={12}
                                                paddingVertical={4}
                                                borderRadius={8}
                                            >
                                                <Text color={colors.primary} fontSize={14} fontWeight="500">{pred.market}</Text>
                                            </YStack>
                                            <Text color={colors.accent} fontSize={14} fontWeight="600">{pred.odds}</Text>
                                        </XStack>
                                        <XStack alignItems="center" gap={8}>
                                            {/* Progress bar */}
                                            <YStack width={64} height={6} backgroundColor={colors.secondary} borderRadius={3} overflow="hidden">
                                                <YStack
                                                    height="100%"
                                                    width={`${pred.confidence}%`}
                                                    backgroundColor={colors.primary}
                                                    borderRadius={3}
                                                />
                                            </YStack>
                                            <Text color={colors.primary} fontSize={12}>{pred.confidence}%</Text>
                                        </XStack>
                                    </XStack>

                                    {/* Result Score if available */}
                                    {pred.resultScore && (
                                        <XStack marginTop={8}>
                                            <YStack
                                                backgroundColor="hsla(220, 14%, 16%, 0.5)"
                                                paddingHorizontal={8}
                                                paddingVertical={4}
                                                borderRadius={6}
                                            >
                                                <Text color={colors.muted} fontSize={11}>Sonuç: {pred.resultScore}</Text>
                                            </YStack>
                                        </XStack>
                                    )}
                                </YStack>
                            ))
                        ) : (
                            <YStack
                                backgroundColor={colors.card}
                                borderColor={colors.cardBorder}
                                borderWidth={0.5}
                                borderRadius={16}
                                padding={32}
                                alignItems="center"
                            >
                                <Text fontSize={48} marginBottom={16}>🎯</Text>
                                <Text color={colors.foreground} fontSize={16} fontWeight="600" marginBottom={4}>
                                    Henüz tahmin yok
                                </Text>
                                <Text color={colors.muted} fontSize={13} textAlign="center">
                                    Günün tahminleri admin tarafından onaylandığında burada görünecek
                                </Text>
                            </YStack>
                        )}
                    </YStack>
                </YStack>
            </ScrollView>
        </Theme>
    );
}
