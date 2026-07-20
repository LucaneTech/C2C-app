import { useUserProfil } from '@/hook/useUserProfil';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HeaderUserBadge() {
  const router = useRouter();
  const { profile, loading } = useUserProfil();
  const [cartCount, setCartCount] = useState<number>(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let channel: any;

    const initCartSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fetchCount = async () => {
        const { data, error } = await supabase
          .from('cart')
          .select('quantity')
          .eq('user_id', user.id);

        if (!error && data) {
          const totalQuantity = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
          setCartCount(totalQuantity);
          
          Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
          ]).start();
        }
      };

      // 1. Initialisation des données
      await fetchCount();

      // 2. Création et configuration du canal (sans subscribe instantané)
      const newChannel = supabase
        .channel(`public:cart:user_id=${user.id}`)
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'cart', 
            filter: `user_id=eq.${user.id}` 
          },
          () => {
            fetchCount();
          }
        );

      // 3. Activation de l'abonnement
      newChannel.subscribe();
      channel = newChannel;
    };

    initCartSubscription();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

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
              <Animated.View style={[styles.badgeContainer, { transform: [{ scale: scaleAnim }] }]}>
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
    paddingHorizontal: 24,
    paddingVertical: 14,
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
    width: 40,
    height: 40,
    borderRadius: 50,
    backgroundColor: '#09090B',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: -4,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 50,
    backgroundColor: '#16A34A',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  textContainer: {
    marginLeft: 14,
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 11,
    color: '#71717A',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#09090B',
    marginTop: 2,
    letterSpacing: -0.2,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#f51000',
    borderRadius: 50,
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
    borderRadius: 2,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#F4F4F5',
    borderRadius: 2,
  },
});