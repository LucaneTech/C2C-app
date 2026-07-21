import { useUserProfil } from '@/hook/useUserProfil';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HeaderUserBadge() {
  const router = useRouter();
  const { profile, loading } = useUserProfil();
  const [cartCount, setCartCount] = useState<number>(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Animation fluide lors du changement de panier
  const triggerBadgeAnimation = useCallback(() => {
    scaleAnim.setValue(1);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.25, duration: 120, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim]);

  // Fonction pour récupérer le total précis
  const fetchCartCount = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('cart')
        .select('quantity')
        .eq('user_id', userId);

      if (!error && data) {
        const total = data.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
        setCartCount((prev) => {
          if (prev !== total) triggerBadgeAnimation();
          return total;
        });
      }
    } catch (err) {
      console.error('Erreur chargement panier:', err);
    }
  }, [triggerBadgeAnimation]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      // 1. Récupération de la session utilisateur
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = profile?.id || session?.user?.id;

      if (!currentUserId) return;

      // Charge la valeur initiale
      await fetchCartCount(currentUserId);

      // 2. Création du canal Realtime
      channel = supabase
        .channel(`cart_badge_${currentUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'cart',
            filter: `user_id=eq.${currentUserId}`,
          },
          () => {
            // À chaque modification détectée, on re-synchronise avec le backend
            fetchCartCount(currentUserId);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Re-fetch de sécurité au moment de la connexion réussie au canal
            fetchCartCount(currentUserId);
          }
        });
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [profile?.id, fetchCartCount]);

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.headerContainer}>
          <View style={styles.skeletonText} />
          <View style={styles.skeletonAvatar} />
        </View>
      </SafeAreaView>
    );
  }

  const userInitials = profile?.full_name
    ? profile.full_name.substring(0, 2).toUpperCase()
    : profile?.email?.substring(0, 2).toUpperCase() || 'U';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.profileClickable}
          activeOpacity={0.7}
          onPress={() => router.push('/profile')}
        >
          <View style={styles.avatarWrapper}>
            <Text style={styles.avatarText}>{userInitials}</Text>
            <View style={styles.onlineIndicator} />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.greetingText}>Bienvenue</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {profile?.full_name || profile?.email?.split('@')[0] || 'Utilisateur'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            onPress={() => router.push('/cart')}
            activeOpacity={0.6}
            style={styles.iconButton}
          >
            <Ionicons name="bag-handle-outline" size={20} color="#09090B" />

            {cartCount > 0 && (
              <Animated.View
                style={[
                  styles.badgeContainer,
                  { transform: [{ scale: scaleAnim }] },
                ]}
              >
                <Text style={styles.badgeText}>
                  {cartCount > 99 ? '99+' : cartCount}
                </Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
  },
  profileClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#09090B',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16A34A',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  textContainer: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 10,
    color: '#71717A',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#09090B',
    marginTop: 1,
    letterSpacing: -0.2,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  skeletonText: {
    width: 110,
    height: 18,
    backgroundColor: '#F4F4F5',
    borderRadius: 4,
  },
  skeletonAvatar: {
    width: 38,
    height: 38,
    backgroundColor: '#F4F4F5',
    borderRadius: 19,
  },
});