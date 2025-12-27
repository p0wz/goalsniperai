// GoalSniper Mobile - Profile Screen
// Based on reference design - Dark theme with green accents

import React, { useState, useEffect } from 'react';
import { ScrollView, Alert } from 'react-native';
import {
    YStack,
    XStack,
    Text,
    Card,
    Theme,
    Button,
    Avatar,
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

export default function ProfileScreen({ navigation }) {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const token = await SecureStore.getItemAsync('authToken');
            if (token) {
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }

            const [profileRes, statsRes] = await Promise.all([
                api.get('/api/mobile/profile').catch(() => ({ data: { user: {} } })),
                api.get('/api/mobile/stats').catch(() => ({ data: { stats: {} } })),
            ]);

            setUser(profileRes.data.user);
            setStats(statsRes.data.stats);
        } catch (error) {
            console.error('Load data error:', error);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Çıkış Yap',
            'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Çıkış Yap',
                    style: 'destructive',
                    onPress: async () => {
                        await SecureStore.deleteItemAsync('authToken');
                        // Navigation will handle redirect
                    }
                },
            ]
        );
    };

    const userName = user?.name || user?.email?.split('@')[0] || 'Kullanıcı';
    const userEmail = user?.email || 'user@goalsniper.pro';
    const winRate = stats?.winRate || 0;
    const totalBets = stats?.total || 0;
    const streak = stats?.streak || 0;
    const weeklyData = stats?.weeklyData || [];

    return (
        <Theme name="dark">
            <ScrollView
                style={{ flex: 1, backgroundColor: theme.bg }}
                showsVerticalScrollIndicator={false}
            >
                <YStack padding="$4" gap="$4">

                    {/* Profile Header Card */}
                    <Card
                        backgroundColor={theme.cardBg}
                        borderColor={theme.cardBorder}
                        borderWidth={1}
                        borderRadius={24}
                        padding="$5"
                        alignItems="center"
                        overflow="hidden"
                    >
                        {/* Gradient glow */}
                        <YStack
                            position="absolute"
                            top={-60}
                            width={200}
                            height={200}
                            backgroundColor={theme.primary}
                            opacity={0.08}
                            borderRadius={100}
                        />

                        <Avatar circular size="$8" backgroundColor={theme.primary} marginBottom="$3">
                            <Text color={theme.bg} fontSize={32} fontWeight="bold">
                                {userName.charAt(0).toUpperCase()}
                            </Text>
                        </Avatar>

                        <Text color={theme.text} fontSize={22} fontWeight="800">
                            {userName}
                        </Text>

                        <Text color={theme.textMuted} fontSize={13} marginTop="$1">
                            @{userEmail.split('@')[0]}
                        </Text>

                        <Button
                            size="$3"
                            backgroundColor={theme.primary}
                            color={theme.bg}
                            borderRadius={12}
                            fontWeight="700"
                            marginTop="$4"
                            paddingHorizontal="$6"
                        >
                            👑 VIP Üye
                        </Button>
                    </Card>

                    {/* Stats Ring */}
                    <Card
                        backgroundColor={theme.cardBg}
                        borderColor={theme.cardBorder}
                        borderWidth={1}
                        borderRadius={20}
                        padding="$5"
                    >
                        <XStack justifyContent="space-around">
                            <YStack alignItems="center">
                                <YStack
                                    width={60}
                                    height={60}
                                    borderRadius={30}
                                    borderWidth={3}
                                    borderColor={theme.primary}
                                    alignItems="center"
                                    justifyContent="center"
                                    marginBottom="$2"
                                >
                                    <Text color={theme.text} fontSize={18} fontWeight="800">
                                        {totalBets}
                                    </Text>
                                </YStack>
                                <Text color={theme.textMuted} fontSize={11}>TOPLAM</Text>
                                <Text color={theme.textMuted} fontSize={11}>TAHMİN</Text>
                            </YStack>

                            <YStack alignItems="center">
                                <YStack
                                    width={60}
                                    height={60}
                                    borderRadius={30}
                                    borderWidth={3}
                                    borderColor={theme.primary}
                                    alignItems="center"
                                    justifyContent="center"
                                    marginBottom="$2"
                                >
                                    <Text color={theme.text} fontSize={18} fontWeight="800">
                                        {winRate}%
                                    </Text>
                                </YStack>
                                <Text color={theme.textMuted} fontSize={11}>BAŞARI</Text>
                                <Text color={theme.textMuted} fontSize={11}>ORANI</Text>
                            </YStack>

                            <YStack alignItems="center">
                                <YStack
                                    width={60}
                                    height={60}
                                    borderRadius={30}
                                    borderWidth={3}
                                    borderColor={streak > 0 ? theme.success : theme.error}
                                    alignItems="center"
                                    justifyContent="center"
                                    marginBottom="$2"
                                >
                                    <Text color={theme.text} fontSize={18} fontWeight="800">
                                        {Math.abs(streak)}
                                    </Text>
                                </YStack>
                                <Text color={theme.textMuted} fontSize={11}>KAZANÇ</Text>
                                <Text color={theme.textMuted} fontSize={11}>SERİSİ</Text>
                            </YStack>
                        </XStack>
                    </Card>

                    {/* Weekly Performance */}
                    <Card
                        backgroundColor={theme.cardBg}
                        borderColor={theme.cardBorder}
                        borderWidth={1}
                        borderRadius={20}
                        padding="$4"
                    >
                        <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
                            <Text color={theme.text} fontSize={15} fontWeight="700">
                                Haftalık Performans
                            </Text>
                            <Text color={theme.textMuted} fontSize={12}>
                                Bu Hafta
                            </Text>
                        </XStack>

                        <XStack justifyContent="space-between" alignItems="flex-end" height={100}>
                            {weeklyData.length > 0 ? weeklyData.map((day, index) => (
                                <YStack key={index} alignItems="center" gap="$1">
                                    <YStack
                                        width={28}
                                        height={Math.max(10, (day.rate / 100) * 80)}
                                        backgroundColor={day.rate > 50 ? theme.primary : theme.error}
                                        borderRadius={6}
                                    />
                                    <Text color={theme.textMuted} fontSize={10}>
                                        {day.day}
                                    </Text>
                                </YStack>
                            )) : (
                                // Default empty bars
                                ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, index) => (
                                    <YStack key={index} alignItems="center" gap="$1">
                                        <YStack
                                            width={28}
                                            height={10}
                                            backgroundColor={theme.cardBorder}
                                            borderRadius={6}
                                        />
                                        <Text color={theme.textMuted} fontSize={10}>
                                            {day}
                                        </Text>
                                    </YStack>
                                ))
                            )}
                        </XStack>
                    </Card>

                    {/* Settings Links */}
                    <YStack gap="$2">
                        <Card
                            backgroundColor={theme.cardBg}
                            borderColor={theme.cardBorder}
                            borderWidth={1}
                            borderRadius={16}
                            padding="$4"
                            pressStyle={{ opacity: 0.9 }}
                        >
                            <XStack alignItems="center" gap="$3">
                                <Text fontSize={20}>🔔</Text>
                                <Text color={theme.text} fontSize={14} flex={1}>Bildirimler</Text>
                                <Text color={theme.textMuted}>→</Text>
                            </XStack>
                        </Card>

                        <Card
                            backgroundColor={theme.cardBg}
                            borderColor={theme.cardBorder}
                            borderWidth={1}
                            borderRadius={16}
                            padding="$4"
                            pressStyle={{ opacity: 0.9 }}
                        >
                            <XStack alignItems="center" gap="$3">
                                <Text fontSize={20}>📄</Text>
                                <Text color={theme.text} fontSize={14} flex={1}>Kullanım Koşulları</Text>
                                <Text color={theme.textMuted}>→</Text>
                            </XStack>
                        </Card>

                        <Card
                            backgroundColor={theme.cardBg}
                            borderColor={theme.cardBorder}
                            borderWidth={1}
                            borderRadius={16}
                            padding="$4"
                            pressStyle={{ opacity: 0.9 }}
                        >
                            <XStack alignItems="center" gap="$3">
                                <Text fontSize={20}>🔒</Text>
                                <Text color={theme.text} fontSize={14} flex={1}>Gizlilik</Text>
                                <Text color={theme.textMuted}>→</Text>
                            </XStack>
                        </Card>
                    </YStack>

                    {/* Logout Button */}
                    <Button
                        size="$5"
                        backgroundColor={theme.error + '15'}
                        color={theme.error}
                        borderColor={theme.error + '30'}
                        borderWidth={1}
                        borderRadius={16}
                        fontWeight="700"
                        onPress={handleLogout}
                        pressStyle={{ opacity: 0.8 }}
                    >
                        🚪 Çıkış Yap
                    </Button>

                    <YStack height={40} />
                </YStack>
            </ScrollView>
        </Theme>
    );
}
