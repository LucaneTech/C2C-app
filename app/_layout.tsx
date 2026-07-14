import { supabase } from '@/lib/supabase';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { UserProvider } from '../context/UserContext';
import * as Linking from 'expo-linking';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<any>(null);
  const router = useRouter();
  const segments = useSegments();

  // Helper to parse the redirect URL and extract tokens to establish a session
  const handleDeepLink = async (url: string) => {
    try {
      const parsed = Linking.parse(url);
      const { access_token, refresh_token } = parsed.queryParams || {};

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: access_token as string,
          refresh_token: refresh_token as string,
        });
        if (error) console.error('Error setting session from deep link:', error.message);
      }
    } catch (err) {
      console.error('Failed to parse deep link URL:', err);
    }
  };

  useEffect(() => {
    // 1. Retrieve the active stored session on startup
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsReady(true);
    });

    // 2. Real-time auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // 3. Handle deep link if the app was closed and opened via redirect URL
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // 4. Handle incoming deep links while the app is running in the background
    const subscriptionLinking = Linking.addEventListener('url', (event) => {
      if (event.url) handleDeepLink(event.url);
    });

    return () => {
      subscription.unsubscribe();
      subscriptionLinking.remove();
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    // Check if the user is currently in the authentication screens
    const inAuthGroup = segments[0] === 'auth' || segments.length === 0 || segments[0] === 'index';

    if (session) {
      // If connected, redirect automatically to main application
      if (inAuthGroup) {
        router.replace('/(tabs)');
      }
    } else {
      // If disconnected, redirect back to home page
      if (!inAuthGroup) {
        router.replace('/');
      }
    }
  }, [session, isReady, segments]);

  // Loading indicator while restoring session
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <ActivityIndicator size="large" color="#0A2540" />
      </View>
    );
  }

  return (
    <UserProvider>
      <Stack>
        {/* Get Started Home Screen */}
        <Stack.Screen 
          name="index" 
          options={{ headerShown: false }} 
        />

        {/* Authentication Group */}
        <Stack.Screen 
          name="auth/LoginScreen" 
          options={{ 
            headerShown: false,
            gestureEnabled: false // Prevents swiping back to home screen
          }} 
        />
        
        <Stack.Screen 
          name="auth/SignupScreen" 
          options={{ 
            title: "",
            headerStyle: { backgroundColor: '#F8F9FA' },
            headerTintColor: '#0A2540',
            headerTitleStyle: { fontWeight: '600' },
            headerShadowVisible: false,
            headerBackTitle: "Retour"
          }} 
        />

        {/* Main Application */}
        <Stack.Screen 
          name="(tabs)" 
          options={{ headerShown: false }} 
        />

        {/* Detail Screen */}
        <Stack.Screen 
          name="instruments/[id]" 
          options={{ 
            title: "Détails de l'instrument",
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#0A2540',
            headerTitleStyle: { fontWeight: '600' },
            headerBackTitle: "Retour" 
          }} 
        />
      </Stack>
    </UserProvider>
  );
}