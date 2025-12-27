// GoalSniper Mobile - Profil
// EXACT copy of betting-buddy-ai/src/pages/Profile.tsx

import React, { useState, useEffect } from 'react';
import { ScrollView, Alert, Platform, Pressable } from 'react-native';
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

export default function ProfileScreen({ navigation }) {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);

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
                        if (Platform.OS === 'web') {
                            localStorage.removeItem('authToken');
                            window.location.reload();
                        } else {
                            await SecureStore.deleteItemAsync('authToken');
                        }
                    }
                },
            ]
        );
    };

    const userName = user?.name || 'Ahmet Yılmaz';
    const userEmail = user?.email || 'ahmet@email.com';
    const winRate = stats?.winRate || 78;
    const totalBets = stats?.total || 156;

    // Stats like Profile.tsx lines 19-23
    const profileStats = [
        { label: 'Toplam Tahmin', value: totalBets.toString(), icon: '📈' },
        { label: 'Başarı Oranı', value: `${winRate}%`, icon: '🏆' },
        { label: 'Kazanç', value: '+₺4,520', icon: '💳' },
    ];

    // Menu items like Profile.tsx lines 25-30
    const menuItems = [
        { icon: '👑', label: 'Premium Üyelik', badge: 'Pro' },
        { icon: '🔔', label: 'Bildirimler', badge: '3' },
        { icon: '🛡️', label: 'Gizlilik & Güvenlik' },
        { icon: '⚙️', label: 'Ayarlar' },
    ];

    return (
        <Theme name="dark">
            <ScrollView
                style={{ flex: 1, backgroundColor: colors.background }}
                showsVerticalScrollIndicator={false}
            >
                <YStack paddingBottom={100}>
                    {/* Header - EXACT from Profile.tsx lines 39-44 */}
                    <XStack padding={16} justifyContent="space-between" alignItems="center">
                        <Text color={colors.foreground} fontSize={20} fontWeight="bold">Profil</Text>
                        <Pressable>
                            <YStack padding={8}>
                                <Text fontSize={20}>⚙️</Text>
                            </YStack>
                        </Pressable>
                    </XStack>

                    {/* Profile Card - EXACT from Profile.tsx lines 47-77 */}
                    <YStack paddingHorizontal={16} marginBottom={24}>
                        <YStack
                            backgroundColor={colors.card}
                            borderColor={colors.cardBorder}
                            borderWidth={0.5}
                            borderRadius={16}
                            padding={20}
                        >
                            {/* User Info */}
                            <XStack alignItems="center" gap={16} marginBottom={16}>
                                {/* Avatar - gradient-primary */}
                                <YStack
                                    width={64}
                                    height={64}
                                    borderRadius={16}
                                    backgroundColor={colors.primary}
                                    alignItems="center"
                                    justifyContent="center"
                                >
                                    <Text color={colors.foreground} fontSize={28}>👤</Text>
                                </YStack>
                                <YStack flex={1}>
                                    <Text color={colors.foreground} fontSize={18} fontWeight="600">{userName}</Text>
                                    <Text color={colors.muted} fontSize={14}>{userEmail}</Text>
                                    <XStack alignItems="center" gap={8} marginTop={4}>
                                        {/* Pro badge - gradient-accent */}
                                        <YStack
                                            backgroundColor={colors.accent}
                                            paddingHorizontal={8}
                                            paddingVertical={2}
                                            borderRadius={100}
                                        >
                                            <Text color={colors.foreground} fontSize={12} fontWeight="500">Pro</Text>
                                        </YStack>
                                        <Text color={colors.muted} fontSize={12}>Üye: Ocak 2024</Text>
                                    </XStack>
                                </YStack>
                            </XStack>

                            {/* Stats - grid grid-cols-3 */}
                            <XStack gap={12}>
                                {profileStats.map((stat, idx) => (
                                    <YStack
                                        key={idx}
                                        flex={1}
                                        backgroundColor="hsla(220, 14%, 16%, 0.5)"
                                        borderRadius={12}
                                        padding={12}
                                        alignItems="center"
                                    >
                                        <XStack alignItems="center" justifyContent="center" gap={4} marginBottom={4}>
                                            <Text fontSize={12}>{stat.icon}</Text>
                                        </XStack>
                                        <Text color={colors.foreground} fontSize={18} fontWeight="bold">{stat.value}</Text>
                                        <Text color={colors.muted} fontSize={12}>{stat.label}</Text>
                                    </YStack>
                                ))}
                            </XStack>
                        </YStack>
                    </YStack>

                    {/* Premium Banner - EXACT from Profile.tsx lines 81-98 */}
                    <YStack paddingHorizontal={16} marginBottom={24}>
                        <Pressable onPress={() => navigation?.navigate?.('Premium')}>
                            <YStack
                                backgroundColor={colors.card}
                                borderColor="hsla(38, 92%, 50%, 0.5)"
                                borderWidth={0.5}
                                borderRadius={16}
                                padding={16}
                                position="relative"
                                overflow="hidden"
                            >
                                {/* Gradient overlay */}
                                <YStack
                                    position="absolute"
                                    top={0}
                                    left={0}
                                    right={0}
                                    bottom={0}
                                    backgroundColor="hsla(38, 92%, 50%, 0.1)"
                                />
                                <XStack position="relative" alignItems="center" gap={16}>
                                    {/* Crown icon */}
                                    <YStack
                                        width={48}
                                        height={48}
                                        borderRadius={12}
                                        backgroundColor={colors.accent}
                                        alignItems="center"
                                        justifyContent="center"
                                    >
                                        <Text fontSize={24}>👑</Text>
                                    </YStack>
                                    <YStack flex={1}>
                                        <Text color={colors.foreground} fontSize={14} fontWeight="600">Elite'e Yükselt</Text>
                                        <Text color={colors.muted} fontSize={14}>AI destekli analizler ve daha fazlası</Text>
                                    </YStack>
                                    <Text color={colors.accent} fontSize={18}>→</Text>
                                </XStack>
                            </YStack>
                        </Pressable>
                    </YStack>

                    {/* Menu - EXACT from Profile.tsx lines 101-126 */}
                    <YStack paddingHorizontal={16} marginBottom={24}>
                        <YStack
                            backgroundColor={colors.card}
                            borderColor={colors.cardBorder}
                            borderWidth={0.5}
                            borderRadius={16}
                            overflow="hidden"
                        >
                            {menuItems.map((item, idx) => (
                                <Pressable key={idx}>
                                    <XStack
                                        padding={16}
                                        justifyContent="space-between"
                                        alignItems="center"
                                        borderBottomWidth={idx < menuItems.length - 1 ? 0.5 : 0}
                                        borderBottomColor="hsla(220, 14%, 18%, 0.3)"
                                    >
                                        <XStack alignItems="center" gap={12}>
                                            <Text fontSize={18}>{item.icon}</Text>
                                            <Text color={colors.foreground} fontSize={14}>{item.label}</Text>
                                        </XStack>
                                        <XStack alignItems="center" gap={8}>
                                            {item.badge && (
                                                <YStack
                                                    backgroundColor="hsla(142, 70%, 45%, 0.2)"
                                                    paddingHorizontal={8}
                                                    paddingVertical={2}
                                                    borderRadius={100}
                                                >
                                                    <Text color={colors.primary} fontSize={12} fontWeight="500">{item.badge}</Text>
                                                </YStack>
                                            )}
                                            <Text color={colors.muted}>→</Text>
                                        </XStack>
                                    </XStack>
                                </Pressable>
                            ))}
                        </YStack>
                    </YStack>

                    {/* Logout - EXACT from Profile.tsx lines 130-138 */}
                    <YStack paddingHorizontal={16}>
                        <Pressable onPress={handleLogout}>
                            <YStack
                                backgroundColor="transparent"
                                borderColor="hsla(0, 84%, 60%, 0.5)"
                                borderWidth={1}
                                borderRadius={12}
                                padding={16}
                                alignItems="center"
                                justifyContent="center"
                            >
                                <XStack alignItems="center" gap={8}>
                                    <Text fontSize={16}>🚪</Text>
                                    <Text color={colors.destructive} fontSize={14} fontWeight="500">Çıkış Yap</Text>
                                </XStack>
                            </YStack>
                        </Pressable>
                    </YStack>
                </YStack>
            </ScrollView>
        </Theme>
    );
}
