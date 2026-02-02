import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeColors {
  background: string;
  text: string;
  textSecondary: string;
  border: string;
  cardBackground: string;
  pink: string;
  black: string;
  white: string;
  grayLight: string;
  grayBorder: string;
}

/** Typography scale aligned with showlistaustin.com editorial style */
export interface ThemeTypography {
  /** Page/section title (e.g. "Showlist: Austin") */
  titleSize: number;
  titleWeight: '700' | '600' | '400';
  /** Date headers, card titles */
  headingSize: number;
  headingWeight: '700' | '600' | '400';
  /** Body text */
  bodySize: number;
  bodyWeight: '400' | '500';
  /** Secondary text, captions */
  captionSize: number;
  captionWeight: '400' | '500';
}

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  typography: ThemeTypography;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const themeTypography: ThemeTypography = {
  titleSize: 22,
  titleWeight: '700',
  headingSize: 17,
  headingWeight: '600',
  bodySize: 16,
  bodyWeight: '400',
  captionSize: 14,
  captionWeight: '400',
};

// Theme aligned with showlistaustin.com: editorial list look, warm neutrals, single accent
// Light: off-white background, near-black text, warm red accent (WCAG AA compliant)
const lightColors: ThemeColors = {
  background: '#faf9f7',
  text: '#1a1a1a',
  textSecondary: '#5c5c5c',
  border: '#e0ddd8',
  cardBackground: '#ffffff',
  pink: '#b91c1c', // Warm red accent (links, buttons, selected) – 5.5:1 on #faf9f7
  black: '#1a1a1a',
  white: '#ffffff',
  grayLight: '#e8e6e3',
  grayBorder: '#e0ddd8',
};

// Dark: dark gray background, light text, brighter red accent
const darkColors: ThemeColors = {
  background: '#1a1a1a',
  text: '#f5f5f0',
  textSecondary: '#a3a3a0',
  border: '#3f3f3f',
  cardBackground: '#262626',
  pink: '#ef4444', // Brighter red for contrast on dark
  black: '#f5f5f0',
  white: '#1a1a1a',
  grayLight: '#2a2a2a',
  grayBorder: '#3f3f3f',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('auto');
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem('theme_mode');
        if (saved && (saved === 'light' || saved === 'dark' || saved === 'auto')) {
          setModeState(saved as ThemeMode);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    };
    loadTheme();
  }, []);

  // Update isDark based on mode and system preference
  useEffect(() => {
    if (mode === 'auto') {
      setIsDark(systemColorScheme === 'dark');
    } else {
      setIsDark(mode === 'dark');
    }
  }, [mode, systemColorScheme]);

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem('theme_mode', newMode);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, colors, typography: themeTypography, setMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
