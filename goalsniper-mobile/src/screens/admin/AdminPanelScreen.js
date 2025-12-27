// GoalSniper Mobile - Admin Panel
// Matches design system

import React, { useState, useEffect } from 'react';
import { RefreshControl, ScrollView, Platform, Alert } from 'react-native';
import {
    YStack,
    XStack,
    Text,
    Card,
    Theme,
    Button,
    Switch,
} from 'tamagui';
import { API_CONFIG } from '../../config/api';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

// Design System Colors
const theme = {
    bg: '#0A0A0A',
    cardBg: '#111114',
    cardBorder: '#1A1A1F',
    primary: '#4ADE80',
    accent: '#F59E0B',
    error: '#EF4444',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
};

const api = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: 15000,
});

export default function AdminPanelScreen() {
    const [botActive, setBotActive] = useState(false);
    const [stats, setStats] = useState({ pending: 0, won: 0, lost: 0, winRate: 0 });
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState({});
    const [picks, setPicks] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const getToken = async () => {
        if (Platform.OS === 'web') {
            return localStorage.getItem('authToken');
        }
        return await SecureStore.getItemAsync('authToken');
    };

    const loadData = async () => {
        try {
            const token = await getToken();
            if (token) {
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }

            const [statusRes, adminRes, picksRes] = await Promise.all([
                api.get('/api/bot/status').catch(() => ({ data: { active: false } })),
                api.get('/api/mobile/admin/status').catch(() => ({ data: { status: {} } })),
                api.get('/api/mobile/picks').catch(() => ({ data: { picks: [] } })),
            ]);

            setBotActive(statusRes.data?.active || false);
            setStats({
                pending: adminRes.data?.status?.pendingBets || 0,
                won: adminRes.data?.status?.wonBets || 0,
                lost: adminRes.data?.status?.lostBets || 0,
                winRate: adminRes.data?.status?.winRate || 0,
            });
            setPicks((picksRes.data?.picks || []).filter(p => p.status === 'PENDING'));
        } catch (error) {
            console.error('Load data error:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const toggleBot = async () => {
        try {
            const endpoint = botActive ? '/api/bot/stop' : '/api/bot/start';
            await api.post(endpoint);
            setBotActive(!botActive);
        } catch (error) {
            console.error('Toggle bot error:', error);
        }
    };

    const runAction = async (action, endpoint) => {
        setLoading(prev => ({ ...prev, [action]: true }));
        try {
            const token = await getToken();
            if (token) {
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }
            await api.post(endpoint);
            Alert.alert('Başarılı', `${action} tamamlandı`);
            await loadData();
        } catch (error) {
            Alert.alert('Hata', error.message);
        } finally {
            setLoading(prev => ({ ...prev, [action]: false }));
        }
    };

    const settleBet = async (betId, result) => {
        try {
            const token = await getToken();
            if (token) {
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }
            await api.post(`/api/approved-bets/${betId}/settle`, { result });
            await loadData();
        } catch (error) {
            Alert.alert('Hata', error.message);
        }
    };

    return (
        <Theme name="dark">
            <ScrollView
                style={{ flex: 1, backgroundColor: theme.bg }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
                }
                showsVerticalScrollIndicator={false}
            >
                <YStack padding="$4" gap="$4">
                    {/* Header */}
                    <Text color={theme.text} fontSize={24} fontWeight="800">
                        Admin Panel
                    </Text>

                    {/* Bot Control Card */}
                    <Card
                        backgroundColor={theme.cardBg}
                        borderColor={theme.cardBorder}
                        borderWidth={1}
                        borderRadius={16}
                        padding="$4"
                    >
                        <XStack justifyContent="space-between" alignItems="center">
                            <YStack>
                                <Text color={theme.text} fontSize={16} fontWeight="700">
                                    Canlı Bot
                                </Text>
                                <Text color={botActive ? theme.primary : theme.error} fontSize={12}>
                                    {botActive ? '● Aktif' : '○ Pasif'}
                                </Text>
                            </YStack>
                            <Switch
                                size="$4"
                                checked={botActive}
                                onCheckedChange={toggleBot}
                                backgroundColor={botActive ? theme.primary : theme.cardBorder}
                            >
                                <Switch.Thumb animation="quick" />
                            </Switch>
                        </XStack>
                    </Card>

                    {/* Stats */}
                    <XStack gap="$3">
                        <Card flex={1} backgroundColor={theme.cardBg} borderRadius={16} padding="$3" alignItems="center">
                            <Text color={theme.accent} fontSize={24} fontWeight="800">{stats.pending}</Text>
                            <Text color={theme.textMuted} fontSize={10}>Bekleyen</Text>
                        </Card>
                        <Card flex={1} backgroundColor={theme.cardBg} borderRadius={16} padding="$3" alignItems="center">
                            <Text color={theme.primary} fontSize={24} fontWeight="800">{stats.won}</Text>
                            <Text color={theme.textMuted} fontSize={10}>Kazandı</Text>
                        </Card>
                        <Card flex={1} backgroundColor={theme.cardBg} borderRadius={16} padding="$3" alignItems="center">
                            <Text color={theme.primary} fontSize={24} fontWeight="800">{stats.winRate}%</Text>
                            <Text color={theme.textMuted} fontSize={10}>Win Rate</Text>
                        </Card>
                    </XStack>

                    {/* Action Buttons */}
                    <YStack gap="$2">
                        <Button
                            size="$4"
                            backgroundColor={theme.primary}
                            color={theme.bg}
                            borderRadius={12}
                            fontWeight="700"
                            onPress={() => runAction('Daily Analysis', '/api/analysis/daily')}
                            disabled={loading['Daily Analysis']}
                        >
                            {loading['Daily Analysis'] ? '⏳' : '📊'} Günlük Analiz
                        </Button>

                        <Button
                            size="$4"
                            backgroundColor={theme.cardBg}
                            color={theme.text}
                            borderColor={theme.cardBorder}
                            borderWidth={1}
                            borderRadius={12}
                            fontWeight="600"
                            onPress={() => runAction('Settlement', '/api/approved-bets/settle-all')}
                            disabled={loading['Settlement']}
                        >
                            {loading['Settlement'] ? '⏳' : '✓'} Otomatik Settle
                        </Button>

                        <Button
                            size="$4"
                            backgroundColor={theme.cardBg}
                            color={theme.text}
                            borderColor={theme.cardBorder}
                            borderWidth={1}
                            borderRadius={12}
                            fontWeight="600"
                            onPress={() => runAction('Reset', '/api/mobile/admin/reset-picks')}
                            disabled={loading['Reset']}
                        >
                            {loading['Reset'] ? '⏳' : '🗑️'} Günü Sıfırla
                        </Button>
                    </YStack>

                    {/* Pending Bets */}
                    {picks.length > 0 && (
                        <YStack gap="$3">
                            <Text color={theme.text} fontSize={16} fontWeight="700">
                                Bekleyen Bahisler ({picks.length})
                            </Text>

                            {picks.map((pick, index) => (
                                <Card
                                    key={index}
                                    backgroundColor={theme.cardBg}
                                    borderColor={theme.cardBorder}
                                    borderWidth={1}
                                    borderRadius={16}
                                    padding="$4"
                                >
                                    <Text color={theme.text} fontSize={14} fontWeight="600" marginBottom="$1">
                                        {pick.match}
                                    </Text>
                                    <Text color={theme.textMuted} fontSize={11} marginBottom="$2">
                                        {pick.market} • {pick.league}
                                    </Text>

                                    <XStack gap="$2">
                                        <Button
                                            flex={1}
                                            size="$3"
                                            backgroundColor={theme.primary}
                                            color={theme.bg}
                                            borderRadius={8}
                                            fontWeight="700"
                                            onPress={() => settleBet(pick.id, 'WON')}
                                        >
                                            ✓ WON
                                        </Button>
                                        <Button
                                            flex={1}
                                            size="$3"
                                            backgroundColor={theme.error}
                                            color="#fff"
                                            borderRadius={8}
                                            fontWeight="700"
                                            onPress={() => settleBet(pick.id, 'LOST')}
                                        >
                                            ✗ LOST
                                        </Button>
                                    </XStack>
                                </Card>
                            ))}
                        </YStack>
                    )}

                    <YStack height={100} />
                </YStack>
            </ScrollView>
        </Theme>
    );
}
