// GoalSniper Mobile - Premium Login Screen
// Glassmorphism, gradients, and neon accents

import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import {
    YStack,
    XStack,
    Text,
    Input,
    Button,
    Theme,
    Spinner,
} from 'tamagui';
import { authService } from '../../services/api';

const { width, height } = Dimensions.get('window');

// Premium Theme
const theme = {
    bg: '#000000',
    bgCard: 'rgba(15, 15, 20, 0.95)',
    primary: '#00FF88',
    secondary: '#00D4FF',
    accent: '#8B5CF6',
    text: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textMuted: 'rgba(255, 255, 255, 0.4)',
    border: 'rgba(255, 255, 255, 0.1)',
    inputBg: 'rgba(255, 255, 255, 0.05)',
};

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Hata', 'Email ve şifre gerekli');
            return;
        }

        setLoading(true);
        try {
            const result = await authService.login(email, password);
            if (result.token) {
                // Navigation handled by auth state
            }
        } catch (error) {
            Alert.alert('Hata', 'Giriş yapılamadı');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Theme name="dark">
            <KeyboardAvoidingView
                style={{ flex: 1, backgroundColor: theme.bg }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Background gradient circles */}
                <YStack
                    position="absolute"
                    top={-150}
                    left={-100}
                    width={400}
                    height={400}
                    backgroundColor={theme.primary}
                    opacity={0.08}
                    borderRadius={200}
                />
                <YStack
                    position="absolute"
                    bottom={-100}
                    right={-100}
                    width={300}
                    height={300}
                    backgroundColor={theme.secondary}
                    opacity={0.06}
                    borderRadius={150}
                />
                <YStack
                    position="absolute"
                    top={height / 2}
                    left={-50}
                    width={200}
                    height={200}
                    backgroundColor={theme.accent}
                    opacity={0.05}
                    borderRadius={100}
                />

                <YStack flex={1} justifyContent="center" padding="$6">

                    {/* Logo Section */}
                    <YStack alignItems="center" marginBottom="$10">
                        <YStack
                            width={100}
                            height={100}
                            borderRadius={30}
                            backgroundColor={theme.primary + '15'}
                            borderWidth={1}
                            borderColor={theme.primary + '30'}
                            alignItems="center"
                            justifyContent="center"
                            marginBottom="$4"
                        >
                            <Text fontSize={50}>🎯</Text>
                        </YStack>

                        <Text
                            color={theme.text}
                            fontSize={36}
                            fontWeight="900"
                            letterSpacing={-1}
                        >
                            GoalSniper
                        </Text>

                        <XStack
                            backgroundColor={theme.primary + '20'}
                            paddingHorizontal="$3"
                            paddingVertical="$1"
                            borderRadius="$3"
                            marginTop="$2"
                        >
                            <Text
                                color={theme.primary}
                                fontSize={14}
                                fontWeight="800"
                                letterSpacing={2}
                            >
                                PRO
                            </Text>
                        </XStack>

                        <Text
                            color={theme.textMuted}
                            fontSize={14}
                            marginTop="$3"
                            textAlign="center"
                        >
                            Premium betting analytics platform
                        </Text>
                    </YStack>

                    {/* Form */}
                    <YStack gap="$4" marginBottom="$6">
                        <YStack gap="$2">
                            <Text color={theme.textSecondary} fontSize={13} fontWeight="600" marginLeft="$1">
                                Email
                            </Text>
                            <Input
                                size="$5"
                                placeholder="your@email.com"
                                placeholderTextColor={theme.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                backgroundColor={theme.inputBg}
                                borderColor={theme.border}
                                borderWidth={1}
                                color={theme.text}
                                borderRadius={14}
                                paddingHorizontal="$4"
                                focusStyle={{
                                    borderColor: theme.primary,
                                    backgroundColor: theme.primary + '08',
                                }}
                            />
                        </YStack>

                        <YStack gap="$2">
                            <Text color={theme.textSecondary} fontSize={13} fontWeight="600" marginLeft="$1">
                                Şifre
                            </Text>
                            <Input
                                size="$5"
                                placeholder="••••••••"
                                placeholderTextColor={theme.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                backgroundColor={theme.inputBg}
                                borderColor={theme.border}
                                borderWidth={1}
                                color={theme.text}
                                borderRadius={14}
                                paddingHorizontal="$4"
                                focusStyle={{
                                    borderColor: theme.primary,
                                    backgroundColor: theme.primary + '08',
                                }}
                            />
                        </YStack>

                        <Button
                            size="$5"
                            backgroundColor={theme.primary}
                            color={theme.bg}
                            fontWeight="800"
                            fontSize={16}
                            borderRadius={14}
                            marginTop="$3"
                            onPress={handleLogin}
                            disabled={loading}
                            animation="quick"
                            pressStyle={{
                                scale: 0.98,
                                backgroundColor: theme.primary,
                                opacity: 0.9,
                            }}
                            height={56}
                        >
                            {loading ? <Spinner color={theme.bg} /> : 'Giriş Yap'}
                        </Button>
                    </YStack>

                    {/* Footer */}
                    <XStack justifyContent="center" gap="$2">
                        <Text color={theme.textMuted} fontSize={14}>
                            Hesabın yok mu?
                        </Text>
                        <Text
                            color={theme.primary}
                            fontSize={14}
                            fontWeight="700"
                            onPress={() => navigation.navigate('Register')}
                            pressStyle={{ opacity: 0.7 }}
                        >
                            Kayıt Ol
                        </Text>
                    </XStack>

                    {/* Trust badges */}
                    <XStack justifyContent="center" gap="$4" marginTop="$8">
                        <XStack alignItems="center" gap="$1">
                            <Text fontSize={14}>🔒</Text>
                            <Text color={theme.textMuted} fontSize={11}>Güvenli</Text>
                        </XStack>
                        <XStack alignItems="center" gap="$1">
                            <Text fontSize={14}>⚡</Text>
                            <Text color={theme.textMuted} fontSize={11}>Hızlı</Text>
                        </XStack>
                        <XStack alignItems="center" gap="$1">
                            <Text fontSize={14}>📊</Text>
                            <Text color={theme.textMuted} fontSize={11}>Analitik</Text>
                        </XStack>
                    </XStack>
                </YStack>
            </KeyboardAvoidingView>
        </Theme>
    );
}
