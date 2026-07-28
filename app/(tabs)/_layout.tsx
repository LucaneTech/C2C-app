import Ionicons from '@expo/vector-icons/Ionicons';
import AntDesign from '@expo/vector-icons/AntDesign';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TabLayout() {
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    // 1. Charger le nombre initial de messages non lus
    fetchUnreadCount();

    // 2. Écouter les nouveaux messages en temps réel via Supabase Realtime
    const channel = supabase
      .channel('realtime_unread_messages')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'messages', // Nom de votre table de messages
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Compte les messages destinés à l'utilisateur où is_read est false
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id) // Ajustez selon la colonne de votre table
        .eq('is_read', false);

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    } catch (err) {
      console.error('Erreur chargement messages non lus:', err);
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarBadgeStyle: styles.badgeStyle,
      }}
    >
      {/* 1. Home Tab */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconWrapper]}>
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={20}
                color={focused ? "#0a2540" : "#ffffff"}
              />
            </View>
          ),
        }}
      />

      {/* 2. Marketplace / Bag Tab */}
      <Tabs.Screen
        name="orders"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconWrapper]}>
              <Ionicons
                name={focused ? "bag" : "bag-outline"}
                size={20}
                color={focused ? "#0a2540" : "#ffffff"}
              />
            </View>
          ),
        }}
      />

      {/* 3. Chat Tab avec Badge */}
      <Tabs.Screen
        name="chat"
        options={{
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconWrapper]}>
              <AntDesign
                name={focused ? "wechat" : "wechat"}
                size={20}
                color={focused ? "#0a2540" : "#ffffff"}
              />
            </View>
          ),
        }}
      />

      {/* 4. Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconWrapper]}>
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={20}
                color={focused ? "#0a2540" : "#ffffff"}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  /**
   * Floating, fully rounded tab bar matching the exact shape and colors from the mockup
   */
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: 20,
    right: 20,
    backgroundColor: '#0a2540', // Deep Navy background matching login/signup forms
    borderRadius: 35,
    height: 70,
    borderTopWidth: 0, // Removes the standard grey top border line
    // Floating drop-shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    // Horizontal spacing alignment for items
    paddingBottom: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    borderWidth: 2,
    borderColor: "#ffd053",
  },
  /**
   * Base styling for all tab icons to ensure proper alignment
   */
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /**
   * Beautiful round yellow badge layout applied to the currently active icon
   */
  activeIconWrapper: {
    backgroundColor: '#ffd053', // Bright yellow circle as seen in the mockup
    shadowColor: '#ffd053',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  /**
   * Style pour le badge de notification sur l'icône Chat
   */
  badgeStyle: {
    backgroundColor: '#e74c3c',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 14,
  },
});