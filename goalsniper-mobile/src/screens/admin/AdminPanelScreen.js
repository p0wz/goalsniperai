// GoalSniper Mobile - Premium Admin Panel

import React, { useState, useEffect } from 'react';
import { ScrollView, Alert } from 'react-native';
import {
    YStack,
    XStack,
    Text,
    Card,
    H2,
    Theme,
    Button,
    Switch,
    Circle,
} from 'tamagui';
import { adminService, betsService } from '../../services/api';

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

export default function AdminPanelScreen() {
    const [botStatus, setBotStatus] = useState(true);
    const [stats, setStats] = useState({ winRate: 78, won: 145, lost: 41, pending: 5 });
    const [pendingBets, setPendingBets] = useState([
        { id: 1, match: 'Man City vs Liverpool', market: 'BTTS', odds: '1.85' },
        { id: 2, match: 'Barcelona vs Real Madrid', market: 'Over 2.5', odds: '1.72' },
    ]);
    const [loading, setLoading] = useState(false);

    const toggleBot = () => {
        setBotStatus(!botStatus);
        Alert.alert('Bot', !botStatus ? 'Bot aktif edildi ✅' : 'Bot durduruldu ❌');
    };

    const runSettlement = async () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            Alert.alert('Settlement', 'Auto settlement tamamlandı ✅');
        }, 1500);
    };

    const settleBet = (id, status) => {
        setPendingBets(pendingBets.filter(b => b.id !== id));
        Alert.alert('Başarılı', `Bahis ${status} olarak işaretlendi`);
    };

    return (
        <Theme name="dark">
            <ScrollView
                style={{ flex: 1, backgroundColor: theme.bg }}
                showsVerticalScrollIndicator={false}
            >
                <YStack padding="$4" gap="$5">

                    {/* Header */}
                    <XStack alignItems="center" gap="$3">
                        <YStack
                            width={50}
                            height={50}
                            borderRadius={14}
                            backgroundColor={theme.accent + '20'}
                            alignItems="center"
                            justifyContent="center"
                        >
                            <Text fontSize={24}>⚡</Text>
                        </YStack>
                        <YStack>
                            <H2 color={theme.text} fontSize={24} fontWeight="800" letterSpacing={-0.5}>
                                Admin Panel
                            </H2>
                            <Text color={theme.textMuted} fontSize={12}>
                                Bot ve bahis yönetimi
                            </Text>
                        </YStack>
                    </XStack>

                    {/* Bot Control */}
                    <Card
                        animation="bouncy"
                        backgroundColor={theme.bgCard}
                        borderColor={botStatus ? theme.success + '40' : theme.error + '40'}
                        borderWidth={1}
                        borderRadius={24}
                        padding="$5"
                        overflow="hidden"
                    >
                        {/* Glow */}
                        <YStack
                            position="absolute"
                            top={-30}
                            right={-30}
                            width={120}
                            height={120}
                            backgroundColor={botStatus ? theme.success : theme.error}
                            opacity={0.1}
                            borderRadius={60}
                        />

                        <XStack justifyContent="space-between" alignItems="center">
                            <XStack gap="$4" alignItems="center">
                                <YStack
                                    width={60}
                                    height={60}
                                    borderRadius={18}
                                    backgroundColor={botStatus ? theme.success + '20' : theme.error + '20'}
                                    alignItems="center"
                                    justifyContent="center"
                                >
                                    <Text fontSize={28}>🤖</Text>
                                </YStack>
                                <YStack>
                                    <Text color={theme.text} fontSize={20} fontWeight="800">
                                        Live Bot
                                    </Text>
                                    <XStack alignItems="center" gap="$2" marginTop={4}>
                                        <Circle size={8} backgroundColor={botStatus ? theme.success : theme.error} />
                                        <Text color={botStatus ? theme.success : theme.error} fontSize={13} fontWeight="600">
                                            {botStatus ? 'Aktif' : 'Durduruldu'}
                                        </Text>
                                    </XStack>
                                </YStack>
                            </XStack>

                            <Switch
                                size="$5"
                                checked={botStatus}
                                onCheckedChange={toggleBot}
                                backgroundColor={botStatus ? theme.success : theme.border}
                            >
                                <Switch.Thumb animation="quick" backgroundColor={theme.text} />
                            </Switch>
                        </XStack>
                    </Card>

                    {/* Quick Stats */}
                    <XStack gap="$3">
                        <Card
                            flex={1}
                            backgroundColor={theme.bgCard}
                            borderColor={theme.border}
                            borderWidth={1}
                            borderRadius={16}
                            padding="$3"
                            alignItems="center"
                        >
                            <Text color={theme.warning} fontSize={28} fontWeight="800">
                                {stats.pending}
                            </Text>
                            <Text color={theme.textMuted} fontSize={10} fontWeight="600">PENDING</Text>
                        </Card>
                        <Card
                            flex={1}
                            backgroundColor={theme.bgCard}
                            borderColor={theme.border}
                            borderWidth={1}
                            borderRadius={16}
                            padding="$3"
                            alignItems="center"
                        >
                            <Text color={theme.success} fontSize={28} fontWeight="800">
                                {stats.won}
                            </Text>
                            <Text color={theme.textMuted} fontSize={10} fontWeight="600">WON</Text>
                        </Card>
                        <Card
                            flex={1}
                            backgroundColor={theme.bgCard}
                            borderColor={theme.border}
                            borderWidth={1}
                            borderRadius={16}
                            padding="$3"
                            alignItems="center"
                        >
                            <Text color={theme.primary} fontSize={28} fontWeight="800">
                                {stats.winRate}%
                            </Text>
                            <Text color={theme.textMuted} fontSize={10} fontWeight="600">WIN RATE</Text>
                        </Card>
                    </XStack>

                    {/* Actions */}
                    <YStack gap="$3">
                        <Text color={theme.textSecondary} fontSize={13} fontWeight="600" letterSpacing={0.5}>
                            HIZLI EYLEMLER
                        </Text>

                        <XStack gap="$3">
                            <Button
                                flex={1}
                                size="$5"
                                backgroundColor={theme.secondary}
                                color={theme.bg}
                                borderRadius={14}
                                fontWeight="800"
                                onPress={runSettlement}
                                animation="quick"
                                pressStyle={{ scale: 0.97 }}
                                disabled={loading}
                            >
                                ⚡ Settlement
                            </Button>
                            <Button
                                flex={1}
                                size="$5"
                                backgroundColor={theme.bgCard}
                                color={theme.text}
                                borderColor={theme.border}
                                borderWidth={1}
                                borderRadius={14}
                                fontWeight="700"
                                animation="quick"
                                pressStyle={{ scale: 0.97 }}
                            >
                                🧠 Sync DB
                            </Button>
                        </XStack>
                    </YStack>

                    {/* Pending Bets */}
                    <YStack gap="$3">
                        <Text color={theme.textSecondary} fontSize={13} fontWeight="600" letterSpacing={0.5}>
                            BEKLEYEN BAHİSLER ({pendingBets.length})
                        </Text>

                        {pendingBets.map((bet) => (
                            <Card
                                key={bet.id}
                                animation="quick"
                                backgroundColor={theme.bgCard}
                                borderColor={theme.border}
                                borderWidth={1}
                                borderRadius={20}
                                padding="$4"
                            >
                                <YStack gap="$3">
                                    <XStack justifyContent="space-between" alignItems="center">
                                        <YStack flex={1}>
                                            <Text color={theme.text} fontSize={15} fontWeight="700">
                                                {bet.match}
                                            </Text>
                                            <XStack gap="$2" marginTop={4}>
                                                <YStack
                                                    backgroundColor={theme.primary + '20'}
                                                    paddingHorizontal="$2"
                                                    paddingVertical={2}
                                                    borderRadius={4}
                                                >
                                                    <Text color={theme.primary} fontSize={10} fontWeight="700">
                                                        {bet.market}
                                                    </Text>
                                                </YStack>
                                                <Text color={theme.secondary} fontSize={13} fontWeight="700">
                                                    @ {bet.odds}
                                                </Text>
                                            </XStack>
                                        </YStack>
                                    </XStack>

                                    <XStack gap="$2">
                                        <Button
                                            flex={1}
                                            size="$4"
                                            backgroundColor={theme.success}
                                            color={theme.bg}
                                            borderRadius={12}
                                            fontWeight="800"
                                            onPress={() => settleBet(bet.id, 'WON')}
                                            pressStyle={{ scale: 0.97 }}
                                        >
                                            ✓ WON
                                        </Button>
                                        <Button
                                            flex={1}
                                            size="$4"
                                            backgroundColor={theme.error}
                                            color={theme.text}
                                            borderRadius={12}
                                            fontWeight="800"
                                            onPress={() => settleBet(bet.id, 'LOST')}
                                            pressStyle={{ scale: 0.97 }}
                                        >
                                            ✗ LOST
                                        </Button>
                                    </XStack>
                                </YStack>
                            </Card>
                        ))}
                    </YStack>

                    <YStack height={40} />
                </YStack>
            </ScrollView>
        </Theme>
    );
}
