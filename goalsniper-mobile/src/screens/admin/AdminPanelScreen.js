// GoalSniper Mobile - Admin Panel Screen
// Full admin functionality matching web admin panel

import React, { useState, useEffect } from 'react';
import { ScrollView, Alert, RefreshControl } from 'react-native';
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
    blue: '#3B82F6',
    purple: '#8B5CF6',
};

const api = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: 30000,
});

export default function AdminPanelScreen() {
    const [botStatus, setBotStatus] = useState(false);
    const [loading, setLoading] = useState({});
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ pendingBets: 0, wonBets: 0, lostBets: 0, winRate: 0 });
    const [pendingBets, setPendingBets] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const token = await SecureStore.getItemAsync('authToken');
            if (token) {
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }

            // Fetch admin status and bets
            const [statusRes, picksRes, botRes] = await Promise.all([
                api.get('/api/mobile/admin/status').catch(() => ({ data: { status: {} } })),
                api.get('/api/mobile/picks').catch(() => ({ data: { picks: [] } })),
                api.get('/api/bot/status').catch(() => ({ data: { running: false } })),
            ]);

            setStats(statusRes.data.status || {});
            setPendingBets((picksRes.data.picks || []).filter(p => p.status === 'PENDING'));
            setBotStatus(botRes.data.running || false);
        } catch (error) {
            console.error('Load admin data error:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const toggleBot = async () => {
        try {
            setLoading(prev => ({ ...prev, bot: true }));
            const endpoint = botStatus ? '/api/bot/stop' : '/api/bot/start';
            await api.post(endpoint);
            setBotStatus(!botStatus);
            Alert.alert('Başarılı', botStatus ? 'Bot durduruldu' : 'Bot başlatıldı');
        } catch (error) {
            Alert.alert('Hata', 'Bot durumu değiştirilemedi');
        } finally {
            setLoading(prev => ({ ...prev, bot: false }));
        }
    };

    const runDailyAnalysis = async () => {
        try {
            setLoading(prev => ({ ...prev, daily: true }));
            Alert.alert('Başlatılıyor', 'Daily Analysis çalıştırılıyor...');
            await api.post('/api/analysis/daily');
            Alert.alert('Başarılı', 'Daily Analysis tamamlandı!');
        } catch (error) {
            Alert.alert('Hata', 'Daily Analysis başarısız');
        } finally {
            setLoading(prev => ({ ...prev, daily: false }));
        }
    };

    const runSettlement = async () => {
        try {
            setLoading(prev => ({ ...prev, settlement: true }));
            await api.post('/api/approved-bets/settle-all');
            Alert.alert('Başarılı', 'Auto Settlement tamamlandı!');
            await loadData();
        } catch (error) {
            Alert.alert('Hata', 'Settlement başarısız');
        } finally {
            setLoading(prev => ({ ...prev, settlement: false }));
        }
    };

    const syncPinecone = async () => {
        try {
            setLoading(prev => ({ ...prev, pinecone: true }));
            await api.post('/api/training/sync');
            Alert.alert('Başarılı', 'Pinecone sync tamamlandı!');
        } catch (error) {
            Alert.alert('Hata', 'Pinecone sync başarısız');
        } finally {
            setLoading(prev => ({ ...prev, pinecone: false }));
        }
    };

    const resetDailyPicks = async () => {
        Alert.alert(
            'Onay',
            'Günün tüm tahminleri sıfırlanacak. Emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sıfırla',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(prev => ({ ...prev, reset: true }));
                            await api.post('/api/mobile/admin/reset-picks');
                            Alert.alert('Başarılı', 'Günün tahminleri sıfırlandı!');
                            await loadData();
                        } catch (error) {
                            Alert.alert('Hata', 'Sıfırlama başarısız');
                        } finally {
                            setLoading(prev => ({ ...prev, reset: false }));
                        }
                    }
                },
            ]
        );
    };

    const settleBet = async (betId, status) => {
        try {
            await api.post(`/api/approved-bets/${betId}/settle`, { status });
            Alert.alert('Başarılı', `Bahis ${status} olarak işaretlendi`);
            await loadData();
        } catch (error) {
            Alert.alert('Hata', 'İşlem başarısız');
        }
    };

    const ActionButton = ({ icon, label, onPress, color = theme.primary, isLoading = false }) => (
        <Button
            flex={1}
            size="$4"
            backgroundColor={color + '15'}
            color={color}
            borderColor={color + '30'}
            borderWidth={1}
            borderRadius={14}
            fontWeight="700"
            onPress={onPress}
            disabled={isLoading}
            pressStyle={{ opacity: 0.8, scale: 0.98 }}
        >
            {isLoading ? '...' : `${icon} ${label}`}
        </Button>
    );

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
                    <XStack alignItems="center" gap="$3">
                        <YStack
                            width={50}
                            height={50}
                            borderRadius={14}
                            backgroundColor={theme.purple + '20'}
                            alignItems="center"
                            justifyContent="center"
                        >
                            <Text fontSize={24}>⚡</Text>
                        </YStack>
                        <YStack>
                            <Text color={theme.text} fontSize={22} fontWeight="800">
                                Admin Panel
                            </Text>
                            <Text color={theme.textMuted} fontSize={12}>
                                Bot & Bahis Yönetimi
                            </Text>
                        </YStack>
                    </XStack>

                    {/* Bot Control Card */}
                    <Card
                        backgroundColor={theme.cardBg}
                        borderColor={botStatus ? theme.success + '40' : theme.error + '40'}
                        borderWidth={1}
                        borderRadius={20}
                        padding="$5"
                        overflow="hidden"
                    >
                        <YStack
                            position="absolute"
                            top={-30}
                            right={-30}
                            width={100}
                            height={100}
                            backgroundColor={botStatus ? theme.success : theme.error}
                            opacity={0.1}
                            borderRadius={50}
                        />

                        <XStack justifyContent="space-between" alignItems="center">
                            <XStack alignItems="center" gap="$4">
                                <YStack
                                    width={56}
                                    height={56}
                                    borderRadius={16}
                                    backgroundColor={botStatus ? theme.success + '20' : theme.error + '20'}
                                    alignItems="center"
                                    justifyContent="center"
                                >
                                    <Text fontSize={28}>🤖</Text>
                                </YStack>
                                <YStack>
                                    <Text color={theme.text} fontSize={18} fontWeight="800">
                                        Live Bot
                                    </Text>
                                    <XStack alignItems="center" gap="$2" marginTop={2}>
                                        <YStack
                                            width={8}
                                            height={8}
                                            borderRadius={4}
                                            backgroundColor={botStatus ? theme.success : theme.error}
                                        />
                                        <Text
                                            color={botStatus ? theme.success : theme.error}
                                            fontSize={12}
                                            fontWeight="600"
                                        >
                                            {botStatus ? 'Aktif' : 'Durduruldu'}
                                        </Text>
                                    </XStack>
                                </YStack>
                            </XStack>

                            <Switch
                                size="$5"
                                checked={botStatus}
                                onCheckedChange={toggleBot}
                                backgroundColor={botStatus ? theme.success : theme.cardBorder}
                                disabled={loading.bot}
                            >
                                <Switch.Thumb animation="quick" backgroundColor={theme.text} />
                            </Switch>
                        </XStack>
                    </Card>

                    {/* Quick Stats */}
                    <XStack gap="$3">
                        <Card
                            flex={1}
                            backgroundColor={theme.cardBg}
                            borderColor={theme.cardBorder}
                            borderWidth={1}
                            borderRadius={16}
                            padding="$3"
                            alignItems="center"
                        >
                            <Text color={theme.warning} fontSize={26} fontWeight="800">
                                {stats.pendingBets}
                            </Text>
                            <Text color={theme.textMuted} fontSize={10} fontWeight="600">PENDING</Text>
                        </Card>
                        <Card
                            flex={1}
                            backgroundColor={theme.cardBg}
                            borderColor={theme.cardBorder}
                            borderWidth={1}
                            borderRadius={16}
                            padding="$3"
                            alignItems="center"
                        >
                            <Text color={theme.success} fontSize={26} fontWeight="800">
                                {stats.wonBets}
                            </Text>
                            <Text color={theme.textMuted} fontSize={10} fontWeight="600">WON</Text>
                        </Card>
                        <Card
                            flex={1}
                            backgroundColor={theme.cardBg}
                            borderColor={theme.cardBorder}
                            borderWidth={1}
                            borderRadius={16}
                            padding="$3"
                            alignItems="center"
                        >
                            <Text color={theme.primary} fontSize={26} fontWeight="800">
                                {stats.winRate}%
                            </Text>
                            <Text color={theme.textMuted} fontSize={10} fontWeight="600">WIN RATE</Text>
                        </Card>
                    </XStack>

                    {/* Action Buttons Row 1 */}
                    <YStack gap="$3">
                        <Text color={theme.textSecondary} fontSize={12} fontWeight="600" letterSpacing={0.5}>
                            ANALİZ & SETTLEMENT
                        </Text>

                        <XStack gap="$3">
                            <ActionButton
                                icon="📊"
                                label="Daily"
                                onPress={runDailyAnalysis}
                                color={theme.blue}
                                isLoading={loading.daily}
                            />
                            <ActionButton
                                icon="⚡"
                                label="Settlement"
                                onPress={runSettlement}
                                color={theme.success}
                                isLoading={loading.settlement}
                            />
                        </XStack>

                        <XStack gap="$3">
                            <ActionButton
                                icon="🧠"
                                label="Pinecone"
                                onPress={syncPinecone}
                                color={theme.purple}
                                isLoading={loading.pinecone}
                            />
                            <ActionButton
                                icon="🗑️"
                                label="Reset Picks"
                                onPress={resetDailyPicks}
                                color={theme.error}
                                isLoading={loading.reset}
                            />
                        </XStack>
                    </YStack>

                    {/* Pending Bets */}
                    <YStack gap="$3">
                        <Text color={theme.textSecondary} fontSize={12} fontWeight="600" letterSpacing={0.5}>
                            BEKLEYEN BAHİSLER ({pendingBets.length})
                        </Text>

                        {pendingBets.length > 0 ? (
                            pendingBets.map((bet) => (
                                <Card
                                    key={bet.id}
                                    backgroundColor={theme.cardBg}
                                    borderColor={theme.cardBorder}
                                    borderWidth={1}
                                    borderRadius={16}
                                    padding="$4"
                                >
                                    <YStack gap="$3">
                                        <YStack>
                                            <Text color={theme.text} fontSize={14} fontWeight="700">
                                                {bet.match}
                                            </Text>
                                            <XStack gap="$2" marginTop={4} alignItems="center">
                                                <Text
                                                    backgroundColor={theme.primary + '20'}
                                                    color={theme.primary}
                                                    paddingHorizontal="$2"
                                                    paddingVertical={2}
                                                    borderRadius={4}
                                                    fontSize={10}
                                                    fontWeight="700"
                                                >
                                                    {bet.market}
                                                </Text>
                                                <Text color={theme.blue} fontSize={12} fontWeight="700">
                                                    @ {bet.odds}
                                                </Text>
                                            </XStack>
                                        </YStack>

                                        <XStack gap="$2">
                                            <Button
                                                flex={1}
                                                size="$3"
                                                backgroundColor={theme.success}
                                                color={theme.bg}
                                                borderRadius={10}
                                                fontWeight="700"
                                                onPress={() => settleBet(bet.id, 'WON')}
                                                pressStyle={{ scale: 0.97 }}
                                            >
                                                ✓ WON
                                            </Button>
                                            <Button
                                                flex={1}
                                                size="$3"
                                                backgroundColor={theme.error}
                                                color={theme.text}
                                                borderRadius={10}
                                                fontWeight="700"
                                                onPress={() => settleBet(bet.id, 'LOST')}
                                                pressStyle={{ scale: 0.97 }}
                                            >
                                                ✗ LOST
                                            </Button>
                                        </XStack>
                                    </YStack>
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
                                <Text color={theme.textMuted} fontSize={13}>
                                    Bekleyen bahis yok
                                </Text>
                            </Card>
                        )}
                    </YStack>

                    <YStack height={40} />
                </YStack>
            </ScrollView>
        </Theme>
    );
}
