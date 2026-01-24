import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text } from 'react-native';
import { FavoritesProvider, useFavorites } from './src/context/FavoritesContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { MyEventsScreen } from './src/screens/MyEventsScreen';
import { ForYouScreen } from './src/screens/ForYouScreen';
import { useEventCount } from './src/hooks/useEventCount';
import { mlService } from './src/services/mlService';

const Tab = createBottomTabNavigator();

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

function ThemeAwareStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function AppContent() {
  const { colors } = useTheme();
  const eventCount = useEventCount();
  const { favorites } = useFavorites();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.pink,
          tabBarInactiveTintColor: colors.text,
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 24, color }}>🏠</Text>
            ),
            tabBarBadge: eventCount > 0 ? eventCount : undefined,
            tabBarBadgeStyle: {
              backgroundColor: colors.pink,
            },
          }}
        />
        <Tab.Screen
          name="ForYou"
          component={ForYouScreen}
          options={{
            title: 'For You',
            tabBarLabel: 'For You',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 24, color }}>🤖</Text>
            ),
            tabBarBadge: favorites.length >= 3 ? undefined : '!',
            tabBarBadgeStyle: {
              backgroundColor: colors.pink,
            },
          }}
        />
        <Tab.Screen
          name="MyEvents"
          component={MyEventsScreen}
          options={{
            title: 'My Events',
            tabBarLabel: 'My Events',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 24, color }}>❤️</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// Initialize TensorFlow.js on app startup
function MLInitializer() {
  useEffect(() => {
    // Initialize ML service in the background
    mlService.initialize().catch(error => {
      console.log('ML service initialization error:', error);
    });
  }, []);
  
  return null;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ThemeAwareStatusBar />
        <MLInitializer />
        <FavoritesProvider>
          <AppContent />
        </FavoritesProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
