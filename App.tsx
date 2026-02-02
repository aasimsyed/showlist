import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { InteractionManager } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text } from 'react-native';
import { CityProvider } from './src/context/CityContext';
import { FavoritesProvider, useFavorites } from './src/context/FavoritesContext';
import { RecommendationsProvider } from './src/context/RecommendationsContext';
import { EventDetailProvider } from './src/context/EventDetailContext';
import { EventDetailModal } from './src/components/EventDetailModal';
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
        lazy={true}
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

// Initialize TensorFlow.js after UI is ready (avoids blocking tab switch / first paint)
function MLInitializer() {
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      mlService.initialize().catch(error => {
        console.log('ML service initialization error:', error);
      });
    });
    return () => task.cancel();
  }, []);
  
  return null;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ThemeAwareStatusBar />
        <MLInitializer />
        <CityProvider>
          <FavoritesProvider>
            <RecommendationsProvider>
              <EventDetailProvider>
                <AppContent />
                <EventDetailModal />
              </EventDetailProvider>
            </RecommendationsProvider>
          </FavoritesProvider>
        </CityProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
