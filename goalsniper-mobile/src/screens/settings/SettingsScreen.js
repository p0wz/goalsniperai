// GoalSniper Mobile - Premium Settings Screen

import React, { useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import {
    YStack,
    XStack,
    Text,
    Card,
    H2,
    Theme,
    Switch,
    Button,
    Circle,
} from 'tamagui';
import { authService } from '../../services/api';

// Premium Theme
const theme = {
    bg: '#000000',
    bgCard: 'rgba(20, 20, 25, 0.95)',
    primary: '#00FF88',
    secondary: '#00D4FF',
    accent: '#8B5CF6',
    success: '#22C55E',
    error: '#EF4444',
    text: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textMuted: 'rgba(255, 255, 255, 0.4)',
    border: 'rgba(255, 255, 255, 0.08)',
};

const SettingRow = ({ icon, title, subtitle, right, onPress }) => (
    <Card
        animation="quick"
        pressStyle={{ scale: 0.98, opacity: 0.9 }}
        backgroundColor={theme.bgCard}
        borderColor={theme.border}
        borderWidth={1}
        borderRadius={18}
        padding="$4"
        onPress={onPress}
    >
        <XStack alignItems="center" gap="$4">
            <YStack
                width={48}
                height={48}
                borderRadius={14}
                backgroundColor={theme.primary + '15'}
                alignItems="center"
                justifyContent="center"
            >
                <Text fontSize={22}>{icon}</Text>
            </YStack>
            <YStack flex={1}>
                <Text color={theme.text} fontSize={15} fontWeight="600">{title}</Text>
                {subtitle && <Text color={theme.textMuted} fontSize={12} marginTop={2}>{subtitle}</Text>}
            </YStack>
            {right}
        </XStack>
    </Card>
);

export default function SettingsScreen() {
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(true);

    const handleLogout = () => {
        Alert.alert(
            'Çıkış Yap',
            'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                { text: 'Çıkış Yap', style: 'destructive', onPress: () => authService.logout() },
            ]
        );
    };

    return (
        <Theme name="dark">
            <ScrollView
                style={{ flex: 1, backgroundColor: theme.bg }}
                showsVerticalScrollIndicator={false}
            >
                <YStack padding="$4" gap="$5">

                    {/* Header */}
                    <H2 color={theme.text} fontSize={24} fontWeight="800" letterSpacing={-0.5}>
                        Ayarlar
                    </H2>

                    {/* Profile Card */}
                    <Card
                        animation="bouncy"
                        backgroundColor={theme.bgCard}
                        borderColor={theme.primary + '30'}
                        borderWidth={1}
                        borderRadius={24}
                        padding="$5"
                        overflow="hidden"
                    >
                        {/* Gradient glow */}
                        <YStack
                            position="absolute"
                            top={-40}
                            right={-40}
                            width={150}
                            height={150}
                            backgroundColor={theme.primary}
                            opacity={0.08}
                            borderRadius={75}
                        />

                        <XStack alignItems="center" gap="$4">
                            <YStack
                                width={70}
                                height={70}
                                borderRadius={20}
                                backgroundColor={theme.primary + '20'}
                                alignItems="center"
                                justifyContent="center"
                                borderWidth={2}
                                borderColor={theme.primary + '40'}
                            >
                                <Text fontSize={32}>👤</Text>
                            </YStack>

                            <YStack flex={1}>
                                <Text color={theme.text} fontSize={22} fontWeight="800">
                                    Pro User
                                </Text>
                                <XStack gap="$2" marginTop="$2">
                                    <YStack
                                        backgroundColor={theme.primary + '20'}
                                        paddingHorizontal="$2"
                                        paddingVertical={4}
                                        borderRadius={6}
                                    >
                                        <Text color={theme.primary} fontSize={10} fontWeight="700">
                                            PRO
                                        </Text>
                                    </YStack>
                                    <YStack
                                        backgroundColor={theme.accent + '20'}
                                        paddingHorizontal="$2"
                                        paddingVertical={4}
                                        borderRadius={6}
                                    >
                                        <Text color={theme.accent} fontSize={10} fontWeight="700">
                                            VERIFIED
                                        </Text>
                                    </YStack>
                                </XStack>
                            </YStack>

                            <YStack
                                width={40}
                                height={40}
                                borderRadius={12}
                                backgroundColor={theme.text + '08'}
                                alignItems="center"
                                justifyContent="center"
                            >
                                <Text color={theme.textMuted} fontSize={18}>→</Text>
                            </YStack>
                        </XStack>
                    </Card>

                    {/* Notifications */}
                    <YStack gap="$3">
                        <Text color={theme.textSecondary} fontSize={12} fontWeight="600" letterSpacing={0.5} marginLeft="$1">
                            BİLDİRİMLER
                        </Text>

                        <SettingRow
                            icon="🔔"
                            title="Push Notifications"
                            subtitle="Yeni sinyaller için bildirim al"
                            right={
                                <Switch
                                    size="$4"
                                    checked={notifications}
                                    onCheckedChange={setNotifications}
                                    backgroundColor={notifications ? theme.primary : theme.border}
                                >
                                    <Switch.Thumb animation="quick" backgroundColor={theme.text} />
                                </Switch>
                            }
                        />
                    </YStack>

                    {/* Appearance */}
                    <YStack gap="$3">
                        <Text color={theme.textSecondary} fontSize={12} fontWeight="600" letterSpacing={0.5} marginLeft="$1">
                            GÖRÜNÜM
                        </Text>

                        <SettingRow
                            icon="🌙"
                            title="Dark Mode"
                            subtitle="Koyu tema kullan"
                            right={
                                <Switch
                                    size="$4"
                                    checked={darkMode}
                                    onCheckedChange={setDarkMode}
                                    backgroundColor={darkMode ? theme.primary : theme.border}
                                >
                                    <Switch.Thumb animation="quick" backgroundColor={theme.text} />
                                </Switch>
                            }
                        />
                    </YStack>

                    {/* About */}
                    <YStack gap="$3">
                        <Text color={theme.textSecondary} fontSize={12} fontWeight="600" letterSpacing={0.5} marginLeft="$1">
                            HAKKINDA
                        </Text>

                        <SettingRow
                            icon="📱"
                            title="Uygulama Versiyonu"
                            subtitle="v1.0.0 (Build 2024.12)"
                            right={<Text color={theme.textMuted}>→</Text>}
                        />

                        <SettingRow
                            icon="📄"
                            title="Kullanım Koşulları"
                            right={<Text color={theme.textMuted}>→</Text>}
                        />

                        <SettingRow
                            icon="🔒"
                            title="Gizlilik Politikası"
                            right={<Text color={theme.textMuted}>→</Text>}
                        />

                        <SettingRow
                            icon="💬"
                            title="Destek"
                            subtitle="Yardıma mı ihtiyacınız var?"
                            right={<Text color={theme.textMuted}>→</Text>}
                        />
                    </YStack>

                    {/* Logout */}
                    <Button
                        size="$5"
                        backgroundColor={theme.error + '15'}
                        color={theme.error}
                        borderColor={theme.error + '30'}
                        borderWidth={1}
                        borderRadius={16}
                        fontWeight="700"
                        onPress={handleLogout}
                        animation="quick"
                        pressStyle={{ scale: 0.98, opacity: 0.8 }}
                        marginTop="$2"
                    >
                        🚪 Çıkış Yap
                    </Button>

                    <YStack height={50} />
                </YStack>
            </ScrollView>
        </Theme>
    );
}
