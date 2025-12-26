// GoalSniper Mobile - Tamagui Configuration
import { createTamagui } from 'tamagui';
import { shorthands } from '@tamagui/shorthands';
import { themes, tokens } from '@tamagui/themes';

// Custom dark theme for GoalSniper
const goalSniperDarkTheme = {
    ...themes.dark,
    background: '#0D0D0D',
    backgroundHover: '#1A1A1A',
    backgroundPress: '#252525',
    backgroundFocus: '#1A1A1A',
    color: '#FFFFFF',
    colorHover: '#84CC16',
    colorPress: '#65A30D',
    borderColor: '#27272A',
    placeholderColor: '#71717A',
};

const config = createTamagui({
    tokens,
    themes: {
        dark: goalSniperDarkTheme,
        light: themes.light,
    },
    shorthands,
});

export default config;
