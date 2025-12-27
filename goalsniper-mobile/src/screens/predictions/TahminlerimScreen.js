// GoalSniper Mobile - Tahminlerim Screen (My Predictions)
// Based on reference design - Dark theme with green accents

import React, { useState, useEffect } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import {
    YStack,
    XStack,
    Text,
    Card,
    H1,
    Theme,
    Button,
} from 'tamagui';
import { API_CONFIG } from '../../config/api';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

// Premium Theme
const theme = {
    bg: '#0A0A0A',
    cardBg: '#111111',
    cardBorder: '#1A1A1A',
    primary: '#4ADE80',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    success: '#4ADE80',
    error: '#EF4444',
    warning: '#F59E0B',
};

const api = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: 10000,
});

export default function TahminlerimScreen() {
    const [picks, setPicks] = useState([]);
    const [stats, setStats] = useState({ won: 0, lost: 0, pending: 0 });
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const token = await SecureStore.getItemAsync('authToken');
            if (token) {
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }

            const [picksRes, statsRes] = await Promise.all([
                api.get('/api/mobile/picks').catch(() => ({ data: { picks: [] } })),
                api.get('/api/mobile/stats').catch(() => ({ data: { stats: {} } })),
            ]);

            setPicks(picksRes.data.picks || []);
            setStats(statsRes.data.stats || { won: 0, lost: 0, pending: 0 });
        } catch (error) {
            console.error('Load data error:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // Filter picks based on active tab
    const filteredPicks = picks.filter(pick => {
        if (activeTab === 'all') return true;
        if (activeTab === 'won') return pick.status === 'WON';
        if (activeTab === 'lost') return pick.status === 'LOST';
        if (activeTab === 'pending') return pick.status === 'PENDING';
        return true;
    });

    const TabButton = ({ label, count, tabKey, icon }) => (
        <Button
            flex={1}
            size="$3"
            backgroundColor={activeTab === tabKey ? theme.primary : 'transparent'}
            color={activeTab === tabKey ? theme.bg : theme.textSecondary}
            borderRadius={12}
            fontWeight="600"
            fontSize={12}
            onPress={() => setActiveTab(tabKey)}
            pressStyle={{ scale: 0.97 }}
        >
            {icon} {count}
        </Button>
    );

    return (
        <Theme name="dark">
            <YStack flex={1} backgroundColor={theme.bg}>
                {/* Header */}
                <YStack padding="$4" paddingBottom="$2">
                    <XStack justifyContent="space-between" alignItems="center">
                        <Text color={theme.text} fontSize={24} fontWeight="800" letterSpacing={-0.5}>
                            Tahminlerim
                        </Text>
                        <XStack
                            backgroundColor={theme.primary + '20'}
                            paddingHorizontal="$3"
                            paddingVertical="$2"
                            borderRadius={12}
                            alignItems="center"
                            gap="$2"
                        >
                            <Text fontSize={14}>🔥</Text>
                            <Text color={theme.primary} fontSize={12} fontWeight="700">
                                {Math.abs(stats?.streak || 0)} Seri
                            </Text>
                        </XStack>
                    </XStack>

                    {/* Stats Row - Like reference design */}
                    <XStack marginTop="$4" gap="$4" justifyContent="space-around">
                        <YStack alignItems="center">
                            <Text color={theme.text} fontSize={28} fontWeight="800">
                                {stats.won}
                            </Text>
                            <Text color={theme.textMuted} fontSize={12}>KAZANDI</Text>
                        </YStack>
                        <YStack alignItems="center">
                            <Text color={theme.text} fontSize={28} fontWeight="800">
                                {stats.lost}
                            </Text>
                            <Text color={theme.textMuted} fontSize={12}>KAYBETTİ</Text>
                        </YStack>
                        <YStack alignItems="center">
                            <Text color={theme.text} fontSize={28} fontWeight="800">
                                {stats.pending}
                            </Text>
                            <Text color={theme.textMuted} fontSize={12}>BEKLİYOR</Text>
                        </YStack>
                    </XStack>

                    {/* Filter Tabs */}
                    <XStack
                        marginTop="$4"
                        backgroundColor={theme.cardBg}
                        borderRadius={14}
                        padding="$1"
                        gap="$1"
                    >
                        <TabButton label="Tümü" count={picks.length} tabKey="all" icon="📋" />
                        <TabButton label="Kazandı" count={stats.won} tabKey="won" icon="✓" />
                        <TabButton label="Kaybetti" count={stats.lost} tabKey="lost" icon="✗" />
                        <TabButton label="Bekliyor" count={stats.pending} tabKey="pending" icon="⏳" />
                    </XStack>
                </YStack>

                <ScrollView
                    style={{ flex: 1 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    <YStack padding="$4" paddingTop={0} gap="$3">
                        {filteredPicks.length > 0 ? (
                            filteredPicks.map((pick, index) => (
                                <Card
                                    key={index}
                                    backgroundColor={theme.cardBg}
                                    borderColor={theme.cardBorder}
                                    borderWidth={1}
                                    borderRadius={16}
                                    padding="$4"
                                    overflow="hidden"
                                >
                                    {/* Status indicator line */}
                                    <YStack
                                        position="absolute"
                                        left={0}
                                        top={0}
                                        bottom={0}
                                        width={3}
                                        backgroundColor={
                                            pick.status === 'WON' ? theme.success :
                                                pick.status === 'LOST' ? theme.error :
                                                    theme.warning
                                        }
                                    />

                                    <YStack gap="$2" paddingLeft="$2">
                                        {/* Status and Odds Row */}
                                        <XStack justifyContent="space-between" alignItems="center">
                                            <XStack alignItems="center" gap="$2">
                                                <Text
                                                    color={
                                                        pick.status === 'WON' ? theme.success :
                                                            pick.status === 'LOST' ? theme.error :
                                                                theme.warning
                                                    }
                                                    fontSize={12}
                                                    fontWeight="700"
                                                >
                                                    {pick.status === 'WON' ? '✓ Dün' :
                                                        pick.status === 'LOST' ? '✗ Dün' :
                                                            '⏳ Dün'}
                                                </Text>
                                            </XStack>

                                            <Text color={theme.textSecondary} fontSize={14} fontWeight="700">
                                                {pick.odds}x
                                            </Text>
                                        </XStack>

                                        {/* Match Name */}
                                        <Text color={theme.text} fontSize={15} fontWeight="600">
                                            {pick.match}
                                        </Text>

                                        {/* Market and Result */}
                                        <XStack justifyContent="space-between" alignItems="center">
                                            <XStack alignItems="center" gap="$2">
                                                <Text
                                                    backgroundColor={theme.primary + '20'}
                                                    color={theme.primary}
                                                    paddingHorizontal="$2"
                                                    paddingVertical={2}
                                                    borderRadius={4}
                                                    fontSize={10}
                                                    fontWeight="700"
                                                >
                                                    {pick.market}
                                                </Text>
                                                <Text color={theme.textMuted} fontSize={11}>
                                                    {pick.league}
                                                </Text>
                                            </XStack>

                                            {pick.resultScore && (
                                                <Text color={theme.textSecondary} fontSize={12}>
                                                    Sonuç: {pick.resultScore}
                                                </Text>
                                            )}
                                        </XStack>
                                    </YStack>
                                </Card>
                            ))
                        ) : (
                            <Card
                                backgroundColor={theme.cardBg}
                                borderColor={theme.cardBorder}
                                borderWidth={1}
                                borderRadius={20}
                                padding="$8"
                                alignItems="center"
                            >
                                <YStack
                                    width={70}
                                    height={70}
                                    borderRadius={20}
                                    backgroundColor={theme.primary + '10'}
                                    alignItems="center"
                                    justifyContent="center"
                                    marginBottom="$3"
                                >
                                    <Text fontSize={32}>📋</Text>
                                </YStack>
                                <Text color={theme.text} fontSize={16} fontWeight="600" marginBottom="$1">
                                    Henüz tahmin yok
                                </Text>
                                <Text color={theme.textMuted} fontSize={13} textAlign="center">
                                    Admin tarafından onaylanan tahminler
                                    {'\n'}burada görünecek
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
