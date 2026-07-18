import { supabase } from '@/lib/supabase';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { UserProvider } from '../context/UserContext';
import * as Linking from 'expo-linking';
import { RefreshProvider } from '@/context/RefreshContext';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<any>(null);
  const router = useRouter();
  const segments = useSegments();

  // Parse les paramètres de l'URL (gère les '?' classiques ET les '#' de Supabase)
  const extractTokensFromUrl = (url: string) => {
    try {
      // Si l'URL contient un fragment (#), on le convertit temporairement en query string (?) pour le parser facilement
      const normalizedUrl = url.replace('#', '?');
      const parsed = Linking.parse(normalizedUrl);
      
      const access_token = parsed.queryParams?.access_token as string;
      const refresh_token = parsed.queryParams?.refresh_token as string;
      const type = parsed.queryParams?.type as string;

      return { access_token, refresh_token, type };
    } catch (err) {
      console.error('Erreur lors du parsing du lien profond:', err);
      return { access_token: null, refresh_token: null, type: null };
    }
  };

  const handleDeepLink = async (url: string) => {
    const { access_token, refresh_token, type } = extractTokensFromUrl(url);

    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      
      if (error) {
        console.error('Erreur d\'initialisation de la session via lien:', error.message);
      } else if (type === 'recovery') {
        // Redirection manuelle immédiate si l'événement ne se déclenche pas assez vite
        router.replace('/auth/ResetPasswordScreen');
      }
    }
  };

  useEffect(() => {
    // 1. Récupère la session active au démarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsReady(true);
    });

    // 2. Écouteur d'état d'authentification en temps réel
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      
      // Intercepte l'événement de récupération de mot de passe
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/auth/ResetPasswordScreen');
      }
    });

    // 3. Gère le lien si l'application était fermée
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // 4. Gère le lien si l'application tournait en arrière-plan
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

    const inAuthGroup = segments[0] === 'auth' || segments.length === 0 || segments[0] === 'index';
    
    // Évite d'interrompre l'utilisateur s'il est en train de réinitialiser son mot de passe
    const isResettingPassword = segments[1] === 'ResetPasswordScreen';

    if (session) {
      // Redirige vers l'application principale uniquement si connecté et PAS en cours de réinitialisation
      if (inAuthGroup && !isResettingPassword) {
        router.replace('/(tabs)');
      }
    } else {
      if (!inAuthGroup) {
        router.replace('/');
      }
    }
  }, [session, isReady, segments]);

  // Indicateur de chargement
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <ActivityIndicator size="large" color="#0A2540" />
      </View>
    );
  }

  return (
    <RefreshProvider>
    <UserProvider>
      <Stack>
        {/* Get Started Home Screen */}
        <Stack.Screen 
          name="index" 
          options={{ headerShown: false }} 
        />

        {/* Authentication Screens */}
        <Stack.Screen 
          name="auth"
          options={{ headerShown: false }}
        />

        {/* Main Application */}
        <Stack.Screen 
          name="(tabs)" 
          options={{ headerShown: false }} 
        />

        {/* Detail Screen */}
        <Stack.Screen 
          name="listings/[id]" 
          options={{ 
            title: "Détails de l'instrument",
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#0A2540',
            headerTitleStyle: { fontWeight: '600' },
            headerBackTitle: "Retour" 
          }} 
        />

        <Stack.Screen 
          name="cart" 
          options={{ 
            title: "",
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#0A2540',
            headerTitleStyle: { fontWeight: '600' },
            headerBackTitle: "Retour" 
          }} 
        />
      </Stack>
    </UserProvider>
    </RefreshProvider>
  );
}